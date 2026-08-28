from __future__ import annotations

import numpy as np
import soundfile as sf

from audio_service.mix import mix_stems


def test_mixes_four_stems_and_prevents_clipping(tmp_path):
    sample_rate = 16000
    stems = []
    for index in range(4):
        path = tmp_path / f"stem-{index}.wav"
        sf.write(path, np.full((sample_rate, 2), 0.35, dtype=np.float32), sample_rate)
        stems.append(path)
    output = tmp_path / "mix.wav"

    report = mix_stems(stems, output)
    mixed, mixed_rate = sf.read(output, always_2d=True, dtype="float32")

    assert mixed_rate == sample_rate
    assert len(mixed) == sample_rate
    assert np.max(np.abs(mixed)) <= 0.981
    assert report["peak_before_limiter"] > 1
    assert report["output_gain"] < 1
