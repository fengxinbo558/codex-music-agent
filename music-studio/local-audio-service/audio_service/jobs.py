from __future__ import annotations

import asyncio
import json
import uuid
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Awaitable, Callable, Literal

JobStatus = Literal["queued", "running", "ready", "failed", "cancelled"]


@dataclass
class AudioJob:
    id: str
    kind: str
    status: JobStatus = "queued"
    progress: int = 0
    label: str = "等待处理"
    asset_ids: list[str] = field(default_factory=list)
    result: dict[str, object] = field(default_factory=dict)
    error: str | None = None


class JobManager:
    def __init__(self, root: Path):
        self.root = root.resolve()
        self.root.mkdir(parents=True, exist_ok=True)
        self.jobs: dict[str, AudioJob] = {}
        self.tasks: dict[str, asyncio.Task[None]] = {}
        self.locks: dict[str, asyncio.Lock] = {}
        self._restore()

    def create(self, kind: str) -> AudioJob:
        job = AudioJob(id=f"job-{uuid.uuid4()}", kind=kind)
        self.jobs[job.id] = job
        self._save(job)
        return job

    def start(self, job: AudioJob, operation: Callable[[AudioJob], Awaitable[None]]) -> None:
        async def runner() -> None:
            lock = self.locks.setdefault(job.kind, asyncio.Lock())
            async with lock:
                if job.status == "cancelled":
                    return
                job.status = "running"
                self._save(job)
                try:
                    await operation(job)
                    if job.status != "cancelled":
                        job.status = "ready"
                        job.progress = 100
                        job.label = "处理完成"
                except asyncio.CancelledError:
                    job.status = "cancelled"
                    job.label = "任务已取消"
                    raise
                except Exception as exc:  # noqa: BLE001 - task boundary records safe message
                    job.status = "failed"
                    job.error = str(exc)
                    job.label = "处理失败"
                finally:
                    self._save(job)

        self.tasks[job.id] = asyncio.create_task(runner())

    def get(self, job_id: str) -> AudioJob:
        job = self.jobs.get(job_id)
        if not job:
            raise KeyError(job_id)
        return job

    def update(self, job: AudioJob, progress: int, label: str) -> None:
        job.progress = max(0, min(99, progress))
        job.label = label
        self._save(job)

    def cancel(self, job_id: str) -> AudioJob:
        job = self.get(job_id)
        task = self.tasks.get(job_id)
        if task and not task.done():
            task.cancel()
        job.status = "cancelled"
        job.label = "任务已取消"
        self._save(job)
        return job

    def _save(self, job: AudioJob) -> None:
        path = self.root / f"{job.id}.json"
        temporary = path.with_suffix(".tmp")
        temporary.write_text(json.dumps(asdict(job), ensure_ascii=False, indent=2), encoding="utf-8")
        temporary.replace(path)

    def _restore(self) -> None:
        for path in self.root.glob("job-*.json"):
            try:
                job = AudioJob(**json.loads(path.read_text(encoding="utf-8")))
            except (OSError, ValueError, TypeError):
                continue
            if job.status in {"queued", "running"}:
                job.status = "failed"
                job.error = "服务重启，原任务已经失联，请重新提交。"
                job.label = "任务已中断"
                self._save(job)
            self.jobs[job.id] = job
