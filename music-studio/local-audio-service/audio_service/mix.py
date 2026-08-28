from __future__ import annotations

from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly


def mix_stems(stems: list[Path], output: Path) -> dict[str, float]:
    if len(stems) != 4:
        raise ValueError("需要人声、鼓、贝斯和其他乐器四条音轨")
    first, sample_rate = sf.read(stems[0], always_2d=True, dtype="float32")
    if len(first) == 0:
        raise ValueError("人声音轨为空")
    target_frames = len(first)
    target_channels = first.shape[1]
    combined = np.zeros((target_frames, target_channels), dtype=np.float32)
    for path in stems:
        audio, stem_rate = sf.read(path, always_2d=True, dtype="float32")
        if stem_rate != sample_rate:
            audio = resample_poly(audio, sample_rate, stem_rate, axis=0).astype(np.float32)
        if audio.shape[1] != target_channels:
            if audio.shape[1] == 1:
                audio = np.repeat(audio, target_channels, axis=1)
            else:
                audio = audio[:, :target_channels]
        if abs(len(audio) - target_frames) > round(sample_rate * 0.2):
            raise ValueError(f"音轨长度不一致：{path.name}")
        if len(audio) < target_frames:
            audio = np.pad(audio, ((0, target_frames - len(audio)), (0, 0)))
        combined += audio[:target_frames]

    original_peak = float(np.max(np.abs(combined)))
    gain = 1.0 if original_peak <= 0.98 else 0.98 / original_peak
    combined *= gain
    output.parent.mkdir(parents=True, exist_ok=True)
    sf.write(output, combined, sample_rate, subtype="PCM_24")
    return {
        "duration_seconds": target_frames / sample_rate,
        "peak_before_limiter": original_peak,
        "output_gain": gain,
    }
