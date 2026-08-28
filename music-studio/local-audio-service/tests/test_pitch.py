from __future__ import annotations

import math

import numpy as np
import soundfile as sf

from audio_service.pitch import analyze_pitch, shift_pitch_region


def test_detects_and_shifts_a_stable_tone(tmp_path):
    sample_rate = 16000
    seconds = 1.5
    timeline = np.arange(round(sample_rate * seconds)) / sample_rate
    tone = (0.2 * np.sin(2 * math.pi * 220 * timeline)).astype(np.float32)
    source = tmp_path / "tone.wav"
    output = tmp_path / "tone-up.wav"
    sf.write(source, tone, sample_rate)

    before = analyze_pitch(source, 0.1, 1.4)
    assert before.editable
    assert before.median_hz is not None
    assert abs(before.median_hz - 220) < 8

    original, shifted = shift_pitch_region(source, output, 0.1, 1.4, 2)
    assert shifted.median_hz is not None
    assert original.median_hz is not None
    assert abs(shifted.median_hz / original.median_hz - 2 ** (2 / 12)) < 0.08
    assert sf.info(output).frames == sf.info(source).frames


def test_rejects_silence(tmp_path):
    source = tmp_path / "silence.wav"
    sf.write(source, np.zeros(16000, dtype=np.float32), 16000)
    analysis = analyze_pitch(source, 0, 1)
    assert not analysis.editable
    assert analysis.median_hz is None
