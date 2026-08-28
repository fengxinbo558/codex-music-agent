from __future__ import annotations

import io
import os
import tempfile

os.environ.setdefault("MUSIC_WORKROOM_AUDIO_DATA", tempfile.mkdtemp(prefix="music-audio-test-"))

from fastapi.testclient import TestClient

from audio_service.app import app


client = TestClient(app)


def test_health_reports_real_capabilities():
    response = client.get("/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert isinstance(payload["capabilities"]["stems"], bool)


def test_rejects_non_audio_upload():
    response = client.post(
        "/local-audio/stems",
        files={"audio": ("notes.txt", io.BytesIO(b"not audio"), "text/plain")},
    )
    assert response.status_code == 415


def test_rejects_invalid_pitch_range():
    response = client.post(
        "/local-audio/analyze-pitch",
        files={"audio": ("empty.wav", io.BytesIO(b"data"), "audio/wav")},
        data={"start_seconds": "3", "end_seconds": "2"},
    )
    assert response.status_code == 422
