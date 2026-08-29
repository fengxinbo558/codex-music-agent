from __future__ import annotations

import asyncio
import json
import os
from dataclasses import asdict
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .assets import AssetRegistry
from .alignment import align_audio
from .jobs import JobManager
from .mix import mix_stems
from .pitch import analyze_pitch, shift_pitch_region
from .stems import separate_stems

MAX_AUDIO_BYTES = 300 * 1024 * 1024
ALLOWED_AUDIO_TYPES = {
    "audio/wav",
    "audio/x-wav",
    "audio/mpeg",
    "audio/flac",
    "audio/mp4",
    "application/octet-stream",
}
DATA_ROOT = Path(os.environ.get("MUSIC_WORKROOM_AUDIO_DATA", ".local-audio-data"))
registry = AssetRegistry(DATA_ROOT)
jobs = JobManager(DATA_ROOT / "job-state")

app = FastAPI(title="Music Workroom Local Audio", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "null",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5175",
        "http://localhost:5173",
        "http://localhost:5175",
    ],
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, object]:
    try:
        import demucs  # noqa: F401
        demucs_ready = True
    except ImportError:
        demucs_ready = False
    try:
        import mlx_whisper  # noqa: F401
        alignment_ready = True
    except ImportError:
        alignment_ready = False
    return {
        "status": "ok",
        "service": "music-workroom-local-audio",
        "capabilities": {
            "stems": demucs_ready,
            "pitch_analysis": True,
            "pitch_shift": True,
            "lyric_alignment": alignment_ready,
        },
    }


@app.post("/local-audio/align-lyrics", status_code=202)
async def align_lyrics_endpoint(
    audio: UploadFile = File(...),
    lyrics: str = Form(...),
    key_terms: str = Form("[]"),
) -> dict[str, object]:
    try:
        parsed_lyrics = json.loads(lyrics)
        parsed_terms = json.loads(key_terms)
    except json.JSONDecodeError as exc:
        raise HTTPException(422, "lyrics and key_terms must be JSON arrays") from exc
    if not isinstance(parsed_lyrics, list) or not all(isinstance(item, str) for item in parsed_lyrics):
        raise HTTPException(422, "lyrics must be a JSON array of strings")
    if not parsed_lyrics:
        raise HTTPException(422, "lyrics cannot be empty")
    if not isinstance(parsed_terms, list) or not all(isinstance(item, str) for item in parsed_terms):
        raise HTTPException(422, "key_terms must be a JSON array of strings")
    job = jobs.create("lyric-alignment")
    job_directory = DATA_ROOT / "jobs" / job.id
    job_directory.mkdir(parents=True, exist_ok=False)
    source = job_directory / "vocals.wav"
    await save_upload(audio, source)

    async def operation(active_job):
        jobs.update(active_job, 15, "正在用真实人声识别唱出的文字")
        result = await asyncio.to_thread(align_audio, source, parsed_lyrics, parsed_terms)
        active_job.result = result
        jobs.update(active_job, 98, "真实唱词、咬字与逐句时间已经核验")

    jobs.start(job, operation)
    return job_payload(job)


@app.post("/local-audio/stems", status_code=202)
async def create_stems(audio: UploadFile = File(...)) -> dict[str, object]:
    job = jobs.create("stems")
    job_directory = DATA_ROOT / "jobs" / job.id
    job_directory.mkdir(parents=True, exist_ok=False)
    source = job_directory / "source.wav"
    await save_upload(audio, source)

    async def operation(active_job):
        await separate_stems(active_job, jobs, registry, source, job_directory)

    jobs.start(job, operation)
    return job_payload(job)


@app.post("/local-audio/analyze-pitch")
async def analyze_pitch_endpoint(
    audio: UploadFile = File(...),
    start_seconds: float = Form(...),
    end_seconds: float = Form(...),
) -> dict[str, object]:
    validate_range(start_seconds, end_seconds)
    job = jobs.create("pitch-analysis")
    job_directory = DATA_ROOT / "jobs" / job.id
    job_directory.mkdir(parents=True, exist_ok=False)
    source = job_directory / "source.wav"
    await save_upload(audio, source)
    result = await asyncio.to_thread(analyze_pitch, source, start_seconds, end_seconds)
    job.status = "ready"
    job.progress = 100
    job.label = "基频分析完成"
    jobs.update(job, 99, job.label)
    job.status = "ready"
    return {"job": job_payload(job), "analysis": asdict(result)}


@app.post("/local-audio/shift-pitch", status_code=202)
async def shift_pitch_endpoint(
    audio: UploadFile = File(...),
    start_seconds: float = Form(...),
    end_seconds: float = Form(...),
    semitones: float = Form(...),
) -> dict[str, object]:
    validate_range(start_seconds, end_seconds)
    if semitones < -12 or semitones > 12 or semitones == 0:
        raise HTTPException(422, "semitones must be between -12 and 12 and not zero")
    job = jobs.create("pitch-shift")
    job_directory = DATA_ROOT / "jobs" / job.id
    job_directory.mkdir(parents=True, exist_ok=False)
    source = job_directory / "source.wav"
    output = job_directory / "vocals-shifted.wav"
    await save_upload(audio, source)

    async def operation(active_job):
        jobs.update(active_job, 20, "正在分析原始人声音高")
        before, after = await asyncio.to_thread(
            shift_pitch_region,
            source,
            output,
            start_seconds,
            end_seconds,
            semitones,
        )
        asset = registry.register(output, "vocals-pitch-edited")
        active_job.asset_ids = [asset.id]
        active_job.label = f"音高已移动 {semitones:+g} 半音并通过验证"
        active_job.progress = 98
        active_job.result = {"verification": {"before": asdict(before), "after": asdict(after)}}

    jobs.start(job, operation)
    return job_payload(job)


@app.post("/local-audio/mix-stems", status_code=202)
async def mix_stems_endpoint(
    vocals: UploadFile = File(...),
    drums: UploadFile = File(...),
    bass: UploadFile = File(...),
    other: UploadFile = File(...),
) -> dict[str, object]:
    job = jobs.create("stem-mix")
    job_directory = DATA_ROOT / "jobs" / job.id
    job_directory.mkdir(parents=True, exist_ok=False)
    inputs: list[Path] = []
    for name, upload in (
        ("vocals", vocals),
        ("drums", drums),
        ("bass", bass),
        ("other", other),
    ):
        destination = job_directory / f"{name}.wav"
        await save_upload(upload, destination)
        inputs.append(destination)
    output = job_directory / "edited-mix.wav"

    async def operation(active_job):
        jobs.update(active_job, 30, "正在合并编辑后的人声与乐器分轨")
        report = await asyncio.to_thread(mix_stems, inputs, output)
        asset = registry.register(output, "edited-mix")
        active_job.asset_ids = [asset.id]
        active_job.result = {"mix": report}
        jobs.update(active_job, 98, "新混音已完成并通过削波检查")

    jobs.start(job, operation)
    return job_payload(job)


@app.get("/local-audio/jobs/{job_id}")
def get_job(job_id: str) -> dict[str, object]:
    try:
        return job_payload(jobs.get(job_id))
    except KeyError as exc:
        raise HTTPException(404, "Unknown job") from exc


@app.delete("/local-audio/jobs/{job_id}")
def delete_job(job_id: str) -> dict[str, object]:
    try:
        payload = job_payload(jobs.cancel(job_id))
        registry.delete_job_directory(job_id)
        jobs.delete(job_id)
        return {**payload, "deleted": True}
    except KeyError as exc:
        raise HTTPException(404, "Unknown job") from exc


@app.get("/local-audio/assets/{asset_id}")
def get_asset(asset_id: str) -> FileResponse:
    try:
        asset, path = registry.resolve(asset_id)
    except KeyError as exc:
        raise HTTPException(404, "Unknown asset") from exc
    return FileResponse(path, media_type=asset.mime_type, filename=Path(asset.filename).name)


async def save_upload(upload: UploadFile, destination: Path) -> None:
    if upload.content_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(415, "Only supported audio files are accepted")
    destination.parent.mkdir(parents=True, exist_ok=True)
    size = 0
    try:
        with destination.open("wb") as output:
            while chunk := await upload.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_AUDIO_BYTES:
                    raise HTTPException(413, "Audio file is too large")
                output.write(chunk)
    except Exception:
        destination.unlink(missing_ok=True)
        raise
    finally:
        await upload.close()
    if size == 0:
        destination.unlink(missing_ok=True)
        raise HTTPException(422, "Audio file is empty")


def validate_range(start_seconds: float, end_seconds: float) -> None:
    if start_seconds < 0 or end_seconds <= start_seconds or end_seconds - start_seconds > 120:
        raise HTTPException(422, "Invalid audio range")


def job_payload(job) -> dict[str, object]:
    return {
        "id": job.id,
        "kind": job.kind,
        "status": job.status,
        "progress": job.progress,
        "label": job.label,
        "asset_ids": job.asset_ids,
        "result": job.result,
        "error": job.error,
    }
