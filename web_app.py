from __future__ import annotations

import json
import cgi
import mimetypes
import os
import re
import shutil
from dataclasses import replace
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from config import get_settings
from env_store import masked, read_env_file, save_env_values
from scheduler import Scheduler
from social_media import SocialPoster
from task_store import TaskStore


ROOT = Path(__file__).parent


def services():
    settings = get_settings()
    poster = SocialPoster(settings)
    return settings, poster, TaskStore(settings.data_dir), Scheduler(settings.data_dir, poster)


def read_json_store(name: str, fallback):
    settings = get_settings()
    path = settings.data_dir / name
    if not path.exists():
        return fallback
    return json.loads(path.read_text(encoding="utf-8"))


def write_json_store(name: str, payload) -> None:
    settings = get_settings()
    path = settings.data_dir / name
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def fallback_content_pack(topic: str, platform: str, tone: str) -> dict:
    clean_topic = topic.strip() or "your brand update"
    tag_base = "".join(ch for ch in clean_topic.title() if ch.isalnum())
    platform_tip = {
        "instagram": "Use a strong visual and ask followers to comment.",
        "tiktok": "Turn this into a short hook, demo, and payoff.",
        "linkedin": "Lead with a business insight and end with a question.",
        "youtube": "Use the first sentence as the video description hook.",
        "facebook": "Keep it conversational and community-focused.",
    }.get(platform.lower(), "Keep the post clear, helpful, and easy to react to.")
    return {
        "caption": (
            f"New update: {clean_topic}.\n\n"
            f"We built this for people who care about better results, cleaner workflows, "
            f"and content that feels real. What would you try first?"
        ),
        "hashtags": [
            f"#{tag_base[:24] or 'Content'}",
            "#SocialMedia",
            "#ContentCreator",
            "#SmallBusiness",
            f"#{platform.title()}Marketing",
            "#GrowthStrategy",
        ],
        "cta": "Comment your favorite idea or save this for your next post.",
        "image_ideas": [
            f"Close-up product shot showing {clean_topic}",
            "Before-and-after carousel with clear labels",
            "Behind-the-scenes team photo with a short caption overlay",
        ],
        "platform_tip": platform_tip,
        "tone": tone,
    }


def fallback_strategy(brand: str, goal: str) -> dict:
    brand_name = brand.strip() or "the brand"
    goal_text = goal.strip() or "increase engagement"
    return {
        "weekly_plan": [
            f"Monday: educational post explaining one problem {brand_name} solves.",
            "Tuesday: short behind-the-scenes story or reel idea.",
            "Wednesday: customer question, poll, or community prompt.",
            "Thursday: carousel with tips, proof, or product benefits.",
            "Friday: recap post with a clear call-to-action.",
        ],
        "content_pillars": ["Education", "Proof", "Community", "Behind the scenes", "Offers"],
        "goal": goal_text,
        "recommendation": "Post consistently, track engagement rate, and reuse top-performing topics in new formats.",
    }


def append_json_row(name: str, row: dict) -> None:
    rows = read_json_store(name, [])
    rows.append(row)
    write_json_store(name, rows)
