from __future__ import annotations

import math

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

from audio_service.stems import STEM_ROLES, validate_stem_reconstruction


def test_accepts_four_stems_that_reconstruct_the_mix_across_sample_rates(tmp_path):
    source_rate = 48000
    stem_rate = 44100
    seconds = 0.5
    source_time = np.arange(round(source_rate * seconds)) / source_rate
    component = (0.05 * np.sin(2 * math.pi * 220 * source_time)).astype(np.float32)
    mixture = np.repeat((component * len(STEM_ROLES))[:, None], 2, axis=1)
    source = tmp_path / "source.wav"
    sf.write(source, mixture, source_rate)
    stems = {}
    for role in STEM_ROLES:
        resampled = resample_poly(component, stem_rate, source_rate).astype(np.float32)
        path = tmp_path / f"{role}.wav"
        sf.write(path, np.repeat(resampled[:, None], 2, axis=1), stem_rate)
        stems[role] = path

    quality = validate_stem_reconstruction(source, stems)
    assert quality["passed"]
    assert quality["relative_reconstruction_error"] < 0.05
