from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import soundfile as sf
import torch
import torchaudio.functional as AF
from scipy.signal import correlate, correlation_lags


@dataclass(frozen=True)
class PitchAnalysis:
    median_hz: float | None
    voiced_ratio: float
    editable: bool
    reason: str


def analyze_pitch(path: Path, start_seconds: float, end_seconds: float) -> PitchAnalysis:
    audio, sample_rate = sf.read(path, always_2d=True, dtype="float32")
    mono = audio.mean(axis=1)
    segment = select_segment(mono, sample_rate, start_seconds, end_seconds)
    frame_size = max(512, int(sample_rate * 0.04))
    hop = max(128, frame_size // 2)
    estimates: list[float] = []
    total = 0
    for offset in range(0, max(1, len(segment) - frame_size + 1), hop):
        frame = segment[offset : offset + frame_size]
        if len(frame) < frame_size:
            break
        total += 1
        if float(np.sqrt(np.mean(frame**2))) < 0.008:
            continue
        frequency = autocorrelation_f0(frame, sample_rate)
        if frequency is not None:
            estimates.append(frequency)
    voiced_ratio = len(estimates) / max(1, total)
    median = float(np.median(estimates)) if estimates else None
    editable = median is not None and voiced_ratio >= 0.2
    return PitchAnalysis(
        median_hz=median,
        voiced_ratio=voiced_ratio,
        editable=editable,
        reason="检测到稳定人声基频" if editable else "选区缺少稳定基频，建议改用重新演唱",
    )


def shift_pitch_region(
    source: Path,
    output: Path,
    start_seconds: float,
    end_seconds: float,
    semitones: float,
    crossfade_seconds: float = 0.025,
) -> tuple[PitchAnalysis, PitchAnalysis]:
    if semitones < -12 or semitones > 12 or semitones == 0:
        raise ValueError("半音必须在 -12 到 +12 之间且不能为 0")
    audio, sample_rate = sf.read(source, always_2d=True, dtype="float32")
    start = max(0, min(len(audio), round(start_seconds * sample_rate)))
    end = max(start + 1, min(len(audio), round(end_seconds * sample_rate)))
    before = analyze_pitch(source, start_seconds, end_seconds)
    if not before.editable:
        raise ValueError(before.reason)

    region = torch.from_numpy(audio[start:end].T.copy())
    shifted = AF.pitch_shift(region, sample_rate, semitones).T.numpy()
    shifted = shifted[: end - start]
    if len(shifted) < end - start:
        shifted = np.pad(shifted, ((0, end - start - len(shifted)), (0, 0)))
    fade = min(round(crossfade_seconds * sample_rate), len(shifted) // 2)
    if fade > 0:
        ramp = np.linspace(0, 1, fade, dtype=np.float32)[:, None]
        shifted[:fade] = audio[start : start + fade] * (1 - ramp) + shifted[:fade] * ramp
        shifted[-fade:] = shifted[-fade:] * (1 - ramp) + audio[end - fade : end] * ramp
    result = audio.copy()
    result[start:end] = shifted
    output.parent.mkdir(parents=True, exist_ok=True)
    sf.write(output, result, sample_rate, subtype="PCM_24")
    after = analyze_pitch(output, start_seconds + crossfade_seconds, end_seconds - crossfade_seconds)
    if after.median_hz and before.median_hz:
        actual = after.median_hz / before.median_hz
        target = 2 ** (semitones / 12)
        if abs(math.log2(actual / target) * 12) > 0.7:
            raise RuntimeError("处理后的基频变化没有通过验证，结果未采用")
    return before, after


def select_segment(audio: np.ndarray, sample_rate: int, start: float, end: float) -> np.ndarray:
    start_frame = max(0, min(len(audio), round(start * sample_rate)))
    end_frame = max(start_frame + 1, min(len(audio), round(end * sample_rate)))
    return audio[start_frame:end_frame]


def autocorrelation_f0(frame: np.ndarray, sample_rate: int) -> float | None:
    centered = frame - np.mean(frame)
    correlation = correlate(centered, centered, mode="full", method="fft")
    lags = correlation_lags(len(centered), len(centered), mode="full")
    positive = (lags >= sample_rate // 1000) & (lags <= sample_rate // 65)
    if not np.any(positive):
        return None
    candidate = correlation[positive]
    candidate_lags = lags[positive]
    peak_index = int(np.argmax(candidate))
    if candidate[peak_index] <= 0:
        return None
    lag = int(candidate_lags[peak_index])
    return sample_rate / lag if lag else None
