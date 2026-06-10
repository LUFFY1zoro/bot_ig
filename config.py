from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None


if load_dotenv:
    load_dotenv()
else:
    env_path = Path(".env")
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or "=" not in stripped:
                continue
            key, value = stripped.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip())


@dataclass(frozen=True)
class Settings:
    bot_name: str
    data_dir: Path
    admin_email: str
    supabase_url: str
    supabase_anon_key: str
    ai_provider: str
    gemini_api_key: str
    gemini_model: str
    openai_api_key: str
    openai_model: str
    x_api_key: str
    x_api_secret: str
    x_access_token: str
    x_access_token_secret: str
    instagram_access_token: str
    instagram_user_id: str


def get_settings() -> Settings:
    data_dir = Path(os.getenv("DATA_DIR", "data"))
    data_dir.mkdir(parents=True, exist_ok=True)

    return Settings(
        bot_name=os.getenv("BOT_NAME", "Personal AI Bot"),
        data_dir=data_dir,
        admin_email=os.getenv("ADMIN_EMAIL", "admin@example.com"),
        supabase_url=os.getenv("SUPABASE_URL", ""),
        supabase_anon_key=os.getenv("SUPABASE_ANON_KEY", ""),
        ai_provider=os.getenv("AI_PROVIDER", "gemini"),
        gemini_api_key=os.getenv("GEMINI_API_KEY", ""),
        gemini_model=os.getenv("GEMINI_MODEL", "gemini-1.5-flash"),
        openai_api_key=os.getenv("OPENAI_API_KEY", ""),
        openai_model=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
        x_api_key=os.getenv("X_API_KEY", ""),
        x_api_secret=os.getenv("X_API_SECRET", ""),
        x_access_token=os.getenv("X_ACCESS_TOKEN", ""),
        x_access_token_secret=os.getenv("X_ACCESS_TOKEN_SECRET", ""),
        instagram_access_token=os.getenv("INSTAGRAM_ACCESS_TOKEN", ""),
        instagram_user_id=os.getenv("INSTAGRAM_USER_ID", ""),
    )
