from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path


@dataclass
class Task:
    id: int
    text: str
    done: bool
    created_at: str


class TaskStore:
    def __init__(self, data_dir: Path):
        self.path = data_dir / "tasks.json"

    def _load(self) -> list[Task]:
        if not self.path.exists():
            return []
        rows = json.loads(self.path.read_text(encoding="utf-8"))
        return [Task(**row) for row in rows]

    def _save(self, tasks: list[Task]) -> None:
        self.path.write_text(
            json.dumps([asdict(task) for task in tasks], indent=2),
            encoding="utf-8",
        )

    def add(self, text: str) -> Task:
        tasks = self._load()
        next_id = max((task.id for task in tasks), default=0) + 1
        task = Task(next_id, text, False, datetime.now().isoformat(timespec="seconds"))
        tasks.append(task)
        self._save(tasks)
        return task

    def list(self) -> list[Task]:
        return self._load()

    def done(self, task_id: int) -> Task | None:
        tasks = self._load()
        changed = None
        for task in tasks:
            if task.id == task_id:
                task.done = True
                changed = task
                break
        self._save(tasks)
        return changed

