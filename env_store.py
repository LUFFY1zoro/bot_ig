from __future__ import annotations

import os
from pathlib import Path


ENV_PATH = Path(".env")


def read_env_file() -> dict[str, str]:
    if not ENV_PATH.exists():
        return {}

    values: dict[str, str] = {}
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        values[key.strip()] = value.strip()
    return values


def save_env_values(updates: dict[str, str]) -> None:
    current = read_env_file()
    current.update({key: value.strip() for key, value in updates.items()})

    ordered_keys = [
        "ADMIN_EMAIL",
        "SUPABASE_URL",
        "SUPABASE_ANON_KEY",
        "AI_PROVIDER",
        "GEMINI_API_KEY",
        "GEMINI_MODEL",
        "OPENAI_API_KEY",
        "OPENAI_MODEL",
        "BOT_NAME",
        "DATA_DIR",
        "X_API_KEY",
        "X_API_SECRET",
        "X_ACCESS_TOKEN",
        "X_ACCESS_TOKEN_SECRET",
        "INSTAGRAM_ACCESS_TOKEN",
        "INSTAGRAM_USER_ID",
    ]
    lines = []
    for key in ordered_keys:
        if key in current:
            lines.append(f"{key}={current[key]}")
            os.environ[key] = current[key]

    for key in sorted(set(current) - set(ordered_keys)):
        lines.append(f"{key}={current[key]}")
        os.environ[key] = current[key]

    ENV_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def masked(value: str) -> str:
    if not value:
        return ""
    if len(value) <= 8:
        return "********"
    return f"{value[:4]}...{value[-4:]}"
