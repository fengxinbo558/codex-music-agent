from __future__ import annotations

import json
import shutil
import uuid
from dataclasses import asdict, dataclass
from pathlib import Path


@dataclass(frozen=True)
class RegisteredAsset:
    id: str
    role: str
    filename: str
    mime_type: str
    size: int


class AssetRegistry:
    def __init__(self, root: Path):
        self.root = root.resolve()
        self.root.mkdir(parents=True, exist_ok=True)
        self.index_path = self.root / "assets.json"
        self._assets = self._load()

    def register(self, path: Path, role: str, mime_type: str = "audio/wav") -> RegisteredAsset:
        resolved = path.resolve()
        if not resolved.is_file() or not resolved.is_relative_to(self.root):
            raise ValueError("Asset must be a file inside the service workspace")
        asset = RegisteredAsset(
            id=f"asset-{uuid.uuid4()}",
            role=role,
            filename=str(resolved.relative_to(self.root)),
            mime_type=mime_type,
            size=resolved.stat().st_size,
        )
        self._assets[asset.id] = asset
        self._save()
        return asset

    def resolve(self, asset_id: str) -> tuple[RegisteredAsset, Path]:
        asset = self._assets.get(asset_id)
        if not asset:
            raise KeyError(asset_id)
        path = (self.root / asset.filename).resolve()
        if not path.is_relative_to(self.root) or not path.is_file():
            raise KeyError(asset_id)
        return asset, path

    def delete_job_directory(self, job_id: str) -> None:
        target = (self.root / "jobs" / job_id).resolve()
        jobs_root = (self.root / "jobs").resolve()
        if target.parent != jobs_root or not target.exists():
            return
        related = [asset_id for asset_id, asset in self._assets.items() if (self.root / asset.filename).resolve().is_relative_to(target)]
        for asset_id in related:
            self._assets.pop(asset_id, None)
        shutil.rmtree(target)
        self._save()

    def _load(self) -> dict[str, RegisteredAsset]:
        if not self.index_path.exists():
            return {}
        try:
            payload = json.loads(self.index_path.read_text(encoding="utf-8"))
            return {item["id"]: RegisteredAsset(**item) for item in payload}
        except (OSError, ValueError, TypeError, KeyError):
            return {}

    def _save(self) -> None:
        temporary = self.index_path.with_suffix(".tmp")
        temporary.write_text(
            json.dumps([asdict(asset) for asset in self._assets.values()], ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        temporary.replace(self.index_path)
