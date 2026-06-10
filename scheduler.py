from __future__ import annotations

import json
import time
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path

from social_media import SocialPoster


@dataclass
class ScheduleItem:
    id: int
    kind: str
    when: str
    text: str
    platform: str
    done: bool


class Scheduler:
    def __init__(self, data_dir: Path, poster: SocialPoster):
        self.path = data_dir / "schedule.json"
        self.poster = poster

    def _load(self) -> list[ScheduleItem]:
        if not self.path.exists():
            return []
        rows = json.loads(self.path.read_text(encoding="utf-8"))
        return [ScheduleItem(**row) for row in rows]

    def _save(self, items: list[ScheduleItem]) -> None:
        self.path.write_text(
            json.dumps([asdict(item) for item in items], indent=2),
            encoding="utf-8",
        )

    def add(self, kind: str, when: str, text: str, platform: str = "") -> ScheduleItem:
        datetime.strptime(when, "%Y-%m-%d %H:%M")
        items = self._load()
        next_id = max((item.id for item in items), default=0) + 1
        item = ScheduleItem(next_id, kind, when, text, platform, False)
        items.append(item)
        self._save(items)
        return item

    def list(self) -> list[ScheduleItem]:
        return self._load()

    def run(self, poll_seconds: int = 30, once: bool = False) -> None:
        while True:
            now = datetime.now()
            items = self._load()
            changed = False

            for item in items:
                due = datetime.strptime(item.when, "%Y-%m-%d %H:%M")
                if item.done or due > now:
                    continue

                if item.kind == "post":
                    result = self.poster.post(item.platform, item.text, dry_run=False)
                    print(result.message)
                else:
                    print(f"Reminder: {item.text}")

                item.done = True
                changed = True

            if changed:
                self._save(items)
            if once:
                return
            time.sleep(poll_seconds)

