from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

from .assets import AssetRegistry, RegisteredAsset
from .jobs import AudioJob, JobManager

STEM_ROLES = ("vocals", "drums", "bass", "other")


async def separate_stems(
    job: AudioJob,
    manager: JobManager,
    registry: AssetRegistry,
    source: Path,
    job_directory: Path,
    model: str = "htdemucs",
) -> list[RegisteredAsset]:
    output = job_directory / "demucs-output"
    manager.update(job, 12, "正在加载真实分轨模型")
    process = await asyncio.create_subprocess_exec(
        sys.executable,
        "-m",
        "demucs",
        "--name",
        model,
        "--out",
        str(output),
        str(source),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )
    assert process.stdout is not None
    async for raw_line in process.stdout:
        line = raw_line.decode("utf-8", errors="replace").strip()
        if "%" in line:
            manager.update(job, min(88, job.progress + 2), "正在分离人声、鼓、贝斯与其他乐器")
    return_code = await process.wait()
    if return_code != 0:
        raise RuntimeError("Demucs 分轨失败；完整混音仍然保留。")

    candidates = list(output.glob(f"{model}/**/*.wav"))
    by_role = {path.stem.lower(): path for path in candidates}
    missing = [role for role in STEM_ROLES if role not in by_role]
    if missing:
        raise RuntimeError(f"分轨结果不完整：缺少 {', '.join(missing)}")

    source_info = sf.info(source)
    assets: list[RegisteredAsset] = []
    role_assets: dict[str, str] = {}
    manager.update(job, 92, "正在校验四条真实音轨")
    for role in STEM_ROLES:
        path = by_role[role]
        info = sf.info(path)
        if info.frames <= 0 or info.samplerate <= 0:
            raise RuntimeError(f"{role} 音轨为空")
        if abs(info.duration - source_info.duration) > 0.15:
            raise RuntimeError(f"{role} 音轨长度与原曲不一致")
        asset = registry.register(path, role)
        assets.append(asset)
        role_assets[role] = asset.id
    quality = validate_stem_reconstruction(source, by_role)
    if not quality["passed"]:
        raise RuntimeError("真实分轨没有通过重构质量检查；完整混音仍然保留。")
    job.asset_ids = [asset.id for asset in assets]
    job.result = {
        "roles": role_assets,
        "duration_seconds": source_info.duration,
        "quality": quality,
    }
    manager.update(job, 98, "四条真实音轨已通过长度检查")
    return assets


def validate_stem_reconstruction(source: Path, stems: dict[str, Path]) -> dict[str, object]:
    mixture, sample_rate = sf.read(source, always_2d=True, dtype="float32")
    combined = np.zeros_like(mixture)
    stem_energy: dict[str, float] = {}
    for role in STEM_ROLES:
        audio, stem_rate = sf.read(stems[role], always_2d=True, dtype="float32")
        if stem_rate != sample_rate:
            audio = resample_poly(audio, sample_rate, stem_rate, axis=0).astype(np.float32)
        if len(audio) < len(mixture):
            audio = np.pad(audio, ((0, len(mixture) - len(audio)), (0, 0)))
        audio = audio[: len(mixture)]
        if audio.shape[1] != mixture.shape[1]:
            audio = np.repeat(audio[:, :1], mixture.shape[1], axis=1)
        combined += audio
        stem_energy[role] = float(np.sqrt(np.mean(audio**2)))
    source_energy = float(np.sqrt(np.mean(mixture**2)))
    relative_error = float(
        np.sqrt(np.mean((combined - mixture) ** 2)) / max(source_energy, 1e-9)
    )
    return {
        "passed": relative_error <= 0.2 and source_energy > 1e-5,
        "relative_reconstruction_error": relative_error,
        "source_rms": source_energy,
        "stem_rms": stem_energy,
    }
