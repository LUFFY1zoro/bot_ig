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


def safe_filename(name: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", name).strip("._")
    return cleaned or "upload.bin"


def user_key(email: str) -> str:
    return (email or "local-user").strip().lower()


def mask_token(value: str) -> str:
    value = value or ""
    if len(value) <= 10:
        return "set" if value else ""
    return f"{value[:4]}...{value[-4:]}"


def render_index() -> bytes:
    env = read_env_file()
    html = (ROOT / "templates" / "index.html").read_text(encoding="utf-8")
    replacements = {
        "{{ env.ADMIN_EMAIL }}": env.get("ADMIN_EMAIL", "admin@example.com"),
        "{{ env.SUPABASE_URL }}": env.get("SUPABASE_URL", ""),
        "{{ env.SUPABASE_ANON_KEY }}": env.get("SUPABASE_ANON_KEY", ""),
        "{{ env.AI_PROVIDER }}": env.get("AI_PROVIDER", "gemini"),
        "{{ env.GEMINI_API_KEY or 'not set' }}": masked(env.get("GEMINI_API_KEY", "")) or "not set",
        "{{ env.GEMINI_MODEL }}": env.get("GEMINI_MODEL", "gemini-1.5-flash"),
        "{{ env.OPENAI_API_KEY or 'not set' }}": masked(env.get("OPENAI_API_KEY", "")) or "not set",
        "{{ env.OPENAI_MODEL }}": env.get("OPENAI_MODEL", "gpt-4.1-mini"),
        "{{ env.INSTAGRAM_ACCESS_TOKEN or 'not set' }}": masked(env.get("INSTAGRAM_ACCESS_TOKEN", "")) or "not set",
        "{{ env.INSTAGRAM_USER_ID }}": env.get("INSTAGRAM_USER_ID", ""),
    }
    for old, new in replacements.items():
        html = html.replace(old, new)
    return html.encode("utf-8")


class BotWebHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        query = parse_qs(urlparse(self.path).query)
        if path == "/":
            self.send_bytes(render_index(), "text/html; charset=utf-8")
            return
        if path == "/api/tasks":
            _, _, tasks, _ = services()
            self.send_json([task.__dict__ for task in tasks.list()])
            return
        if path == "/api/schedule":
            _, _, _, scheduler = services()
            self.send_json([item.__dict__ for item in scheduler.list()])
            return
        if path == "/api/analytics":
            self.send_json(self.analytics_snapshot())
            return
        if path == "/api/accounts":
            self.send_json(self.account_status(query.get("email", [""])[0]))
            return
        if path == "/api/social-account":
            self.send_json(self.get_social_account(query.get("email", [""])[0]))
            return
        if path == "/api/team":
            self.send_json(read_json_store("team.json", self.default_team()))
            return
        if path == "/api/drafts":
            self.send_json(read_json_store("drafts.json", []))
            return
        if path == "/api/brand-kit":
            self.send_json(read_json_store("brand_kit.json", self.default_brand_kit()))
            return
        if path == "/api/templates":
            self.send_json(self.default_templates())
            return
        if path == "/api/notifications":
            self.send_json(read_json_store("notifications.json", self.default_notifications()))
            return
        if path == "/api/activity":
            self.send_json(read_json_store("activity.json", []))
            return
        if path.startswith("/uploads/"):
            settings = get_settings()
            file_name = safe_filename(path.removeprefix("/uploads/"))
            upload_path = settings.data_dir / "uploads" / file_name
            if not upload_path.exists():
                self.send_error(404, "Upload not found")
                return
            content_type = mimetypes.guess_type(upload_path.name)[0] or "application/octet-stream"
            self.send_bytes(upload_path.read_bytes(), content_type)
            return
        super().do_GET()

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/media/analyze":
            try:
                self.analyze_media_upload()
            except Exception as exc:
                self.send_error_json(str(exc), 400)
            return

        try:
            payload = self.read_json()
            if path == "/api/settings":
                self.update_settings(payload)
            elif path == "/api/ask":
                self.ask_ai(payload)
            elif path == "/api/draft":
                self.draft(payload)
            elif path == "/api/content-pack":
                self.content_pack(payload)
            elif path == "/api/strategy":
                self.strategy(payload)
            elif path == "/api/reply":
                self.reply_suggestion(payload)
            elif path == "/api/post":
                self.post_social(payload)
            elif path == "/api/tasks":
                self.add_task(payload)
            elif path.startswith("/api/tasks/") and path.endswith("/done"):
                task_id = int(path.split("/")[3])
                self.done_task(task_id)
            elif path == "/api/schedule":
                self.add_schedule(payload)
            elif path == "/api/schedule/run":
                self.run_schedule_once()
            elif path == "/api/accounts":
                self.save_accounts(payload)
            elif path == "/api/social-account":
                self.save_social_account(payload)
            elif path == "/api/team":
                self.save_team(payload)
            elif path == "/api/drafts":
                self.save_draft(payload)
            elif path == "/api/brand-kit":
                self.save_brand_kit(payload)
            elif path == "/api/competitor":
                self.competitor_analysis(payload)
            elif path == "/api/image-prompt":
                self.image_prompt(payload)
            else:
                self.send_error_json("Not found.", 404)
        except Exception as exc:
            self.send_error_json(str(exc), 400)

    def update_settings(self, payload: dict) -> None:
        allowed = {
            "AI_PROVIDER",
            "ADMIN_EMAIL",
            "SUPABASE_URL",
            "SUPABASE_ANON_KEY",
            "GEMINI_API_KEY",
            "GEMINI_MODEL",
            "OPENAI_API_KEY",
            "OPENAI_MODEL",
            "INSTAGRAM_ACCESS_TOKEN",
            "INSTAGRAM_USER_ID",
            "X_API_KEY",
            "X_API_SECRET",
            "X_ACCESS_TOKEN",
            "X_ACCESS_TOKEN_SECRET",
        }
        updates = {key: str(value) for key, value in payload.items() if key in allowed}
        save_env_values(updates)
        self.add_activity("Settings updated", "Admin configuration was saved.")
        self.send_json({"ok": True, "message": "Settings saved to .env"})

    def ask_ai(self, payload: dict) -> None:
        prompt = payload.get("prompt", "").strip()
        if not prompt:
            self.send_error_json("Prompt is required.", 400)
            return
        from ai_client import AIClient

        settings, _, _, _ = services()
        self.send_json({"ok": True, "answer": AIClient(settings).ask(prompt)})

    def draft(self, payload: dict) -> None:
        topic = payload.get("topic", "").strip()
        if not topic:
            self.send_error_json("Topic is required.", 400)
            return
        from ai_client import AIClient

        settings, _, _, _ = services()
        text = AIClient(settings).draft_social_post(
            topic,
            payload.get("platform", "instagram").strip(),
            payload.get("tone", "friendly").strip(),
        )
        self.send_json({"ok": True, "text": text})

    def content_pack(self, payload: dict) -> None:
        topic = payload.get("topic", "").strip()
        platform = payload.get("platform", "instagram").strip()
        tone = payload.get("tone", "professional").strip()
        if not topic:
            self.send_error_json("Topic is required.", 400)
            return

        try:
            from ai_client import AIClient

            settings, _, _, _ = services()
            prompt = (
                "Create a social media content pack as valid JSON only. "
                "Use keys: caption, hashtags, cta, image_ideas, platform_tip, tone. "
                f"Topic: {topic}. Platform: {platform}. Tone: {tone}."
            )
            raw = AIClient(settings).ask(prompt)
            start = raw.find("{")
            end = raw.rfind("}")
            pack = json.loads(raw[start : end + 1]) if start >= 0 and end >= 0 else fallback_content_pack(topic, platform, tone)
        except Exception:
            pack = fallback_content_pack(topic, platform, tone)
        self.send_json({"ok": True, "pack": pack})

    def strategy(self, payload: dict) -> None:
        brand = payload.get("brand", "").strip()
        goal = payload.get("goal", "").strip()
        try:
            from ai_client import AIClient

            settings, _, _, _ = services()
            prompt = (
                "Create a weekly social media strategy as valid JSON only. "
                "Use keys: weekly_plan, content_pillars, goal, recommendation. "
                f"Brand: {brand}. Goal: {goal}."
            )
            raw = AIClient(settings).ask(prompt)
            start = raw.find("{")
            end = raw.rfind("}")
            plan = json.loads(raw[start : end + 1]) if start >= 0 and end >= 0 else fallback_strategy(brand, goal)
        except Exception:
            plan = fallback_strategy(brand, goal)
        self.send_json({"ok": True, "strategy": plan})

    def competitor_analysis(self, payload: dict) -> None:
        handle = payload.get("handle", "").strip()
        if not handle:
            self.send_error_json("Competitor handle is required.", 400)
            return
        prompt = (
            "Create a competitor analysis using only public, ethical assumptions. "
            "Return concise bullet points for likely posting frequency, popular topics, "
            "content style, hashtag ideas, and opportunities. "
            f"Competitor/page: {handle}"
        )
        try:
            from ai_client import AIClient

            settings, _, _, _ = services()
            answer = AIClient(settings).ask(prompt)
        except Exception:
            answer = (
                f"Competitor: {handle}\n\n"
                "Public-data workflow:\n"
                "- Review recent posts and count weekly frequency.\n"
                "- Identify repeated topics, formats, hooks, and hashtags.\n"
                "- Compare engagement by post type.\n"
                "- Look for gaps your brand can cover.\n\n"
                "Note: connect an approved public-data source or manually paste findings for real analysis."
            )
        self.send_json({"ok": True, "analysis": answer})

    def image_prompt(self, payload: dict) -> None:
        idea = payload.get("idea", "").strip()
        platform = payload.get("platform", "instagram").strip()
        if not idea:
            self.send_error_json("Image idea is required.", 400)
            return
        prompt = (
            f"Create a detailed AI image-generation prompt for a {platform} post. "
            f"Concept: {idea}. Include composition, colors, text overlay, style, and aspect ratio."
        )
        try:
            from ai_client import AIClient

            settings, _, _, _ = services()
            answer = AIClient(settings).ask(prompt)
        except Exception:
            answer = (
                f"Create a polished {platform} visual for: {idea}. "
                "Use a clean product-focused composition, readable headline space, high contrast lighting, "
                "brand colors, and a 4:5 portrait aspect ratio for Instagram."
            )
        self.send_json({"ok": True, "prompt": answer})

    def reply_suggestion(self, payload: dict) -> None:
        comment = payload.get("comment", "").strip()
        if not comment:
            self.send_error_json("Comment is required.", 400)
            return
        suggestion = (
            "Thanks for asking. Yes, we can help with that. "
            "Send us a message with the details and our team will guide you."
        )
        try:
            from ai_client import AIClient

            settings, _, _, _ = services()
            prompt = f"Draft a short, friendly business reply to this social media comment: {comment}"
            suggestion = AIClient(settings).ask(prompt)
        except Exception:
            pass
        self.send_json({"ok": True, "reply": suggestion})

    def analyze_media_upload(self) -> None:
        form = cgi.FieldStorage(
            fp=self.rfile,
            headers=self.headers,
            environ={
                "REQUEST_METHOD": "POST",
                "CONTENT_TYPE": self.headers.get("Content-Type", ""),
            },
        )
        upload = form["media"] if "media" in form else None
        if upload is None or not getattr(upload, "filename", ""):
            self.send_error_json("Upload a media file first.", 400)
            return

        settings = get_settings()
        upload_dir = settings.data_dir / "uploads"
        upload_dir.mkdir(parents=True, exist_ok=True)
        file_name = safe_filename(upload.filename)
        target = upload_dir / file_name
        with target.open("wb") as output:
            shutil.copyfileobj(upload.file, output)

        mime_type = upload.type or mimetypes.guess_type(file_name)[0] or "application/octet-stream"
        platform = form.getfirst("platform", "instagram")
        goal = form.getfirst("goal", "increase views and engagement")
        try:
            from ai_client import AIClient

            analysis = AIClient(settings).analyze_media(target, mime_type, platform, goal)
        except Exception as exc:
            analysis = (
                f"Media saved, but AI analysis needs a working Gemini key and internet access.\n\n"
                f"File: {file_name}\nType: {mime_type}\nGoal: {goal}\nError: {exc}\n\n"
                "Suggested post: Share what is happening in the media, add a strong first-line hook, "
                "include 5-8 relevant hashtags, and end with a question to invite comments."
            )

        append_json_row(
            "media_history.json",
            {
                "file": file_name,
                "mime_type": mime_type,
                "platform": platform,
                "goal": goal,
            },
        )
        self.send_json(
            {
                "ok": True,
                "file": file_name,
                "url": f"/uploads/{file_name}",
                "mime_type": mime_type,
                "analysis": analysis,
            }
        )

    def post_social(self, payload: dict) -> None:
        settings, poster, _, _ = services()
        account_source = "admin settings"
        platform = payload.get("platform", "instagram")
        if str(platform).lower().strip() in {"instagram", "ig"}:
            credentials = self.find_social_credentials(payload.get("user_email", ""), "instagram")
            if credentials:
                account_source = "user Instagram account"
                user_settings = replace(
                    settings,
                    instagram_access_token=credentials.get("instagram_access_token", ""),
                    instagram_user_id=credentials.get("instagram_user_id", ""),
                )
                poster = SocialPoster(user_settings)
        result = poster.post(
            platform,
            payload.get("text", ""),
            dry_run=bool(payload.get("dry_run", True)),
            image_url=payload.get("image_url") or None,
        )
        from datetime import datetime

        append_json_row(
            "post_history.json",
            {
                "platform": result.platform,
                "text": result.text,
                "posted": result.posted,
                "message": result.message,
                "account_source": account_source,
                "dry_run": bool(payload.get("dry_run", True)),
                "created_at": datetime.now().isoformat(timespec="seconds"),
            },
        )
        self.add_activity("Publish attempted", result.message)
        self.send_json(result.__dict__)

    def add_task(self, payload: dict) -> None:
        _, _, tasks, _ = services()
        text = payload.get("text", "").strip()
        if not text:
            self.send_error_json("Task text is required.", 400)
            return
        self.send_json(tasks.add(text).__dict__)
        self.add_activity("Task added", text)

    def done_task(self, task_id: int) -> None:
        _, _, tasks, _ = services()
        task = tasks.done(task_id)
        if not task:
            self.send_error_json("Task not found.", 404)
            return
        self.send_json(task.__dict__)

    def add_schedule(self, payload: dict) -> None:
        _, _, _, scheduler = services()
        item = scheduler.add(
            payload.get("kind", "reminder"),
            payload.get("when", ""),
            payload.get("text", ""),
            payload.get("platform", ""),
        )
        self.send_json(item.__dict__)
        self.add_activity("Post scheduled" if item.kind == "post" else "Reminder scheduled", item.text)

    def run_schedule_once(self) -> None:
        _, _, _, scheduler = services()
        scheduler.run(once=True)
        self.send_json({"ok": True, "message": "Checked due scheduled items."})

    def analytics_snapshot(self) -> dict:
        scheduled = read_json_store("schedule.json", [])
        history = read_json_store("post_history.json", [])
        tasks = read_json_store("tasks.json", [])
        real_accounts = self.account_status()
        posted = [row for row in history if row.get("posted")]
        dry_runs = [row for row in history if row.get("dry_run")]
        failed = [row for row in history if not row.get("posted") and not row.get("dry_run")]
        pending_schedule = [row for row in scheduled if not row.get("done")]
        return {
            "kpis": {
                "scheduled_posts": len(pending_schedule),
                "publish_attempts": len(history),
                "successful_posts": len(posted),
                "open_tasks": len([task for task in tasks if not task.get("done")]),
            },
            "accounts": real_accounts,
            "history": history[-12:],
            "summary": {
                "dry_runs": len(dry_runs),
                "failed_posts": len(failed),
                "engagement_note": (
                    "Live likes, reach, and comments require each platform's official analytics API. "
                    "No simulated engagement is shown."
                ),
            },
        }

    def default_accounts(self) -> list[dict]:
        return self.account_status()

    def account_status(self, email: str = "") -> list[dict]:
        settings = get_settings()
        user_instagram = self.find_social_credentials(email, "instagram")
        instagram_ready = bool(settings.instagram_access_token and settings.instagram_user_id)
        user_instagram_ready = bool(
            user_instagram
            and user_instagram.get("instagram_access_token")
            and user_instagram.get("instagram_user_id")
        )
        x_ready = bool(
            settings.x_api_key
            and settings.x_api_secret
            and settings.x_access_token
            and settings.x_access_token_secret
        )
        return [
            {
                "platform": "Instagram (your account)",
                "handle": user_instagram.get("handle") or "not connected" if user_instagram else "not connected",
                "status": "Ready for official publishing" if user_instagram_ready else "Add your Instagram Graph token and user ID",
            },
            {
                "platform": "Instagram (admin fallback)",
                "handle": settings.instagram_user_id or "not connected",
                "status": "Connected" if instagram_ready else "Needs Graph API credentials",
            },
            {
                "platform": "X/Twitter",
                "handle": "API credentials" if x_ready else "not connected",
                "status": "Connected" if x_ready else "Needs developer write credentials",
            },
            {
                "platform": "TikTok",
                "handle": "not connected",
                "status": "Connector not implemented yet",
            },
            {
                "platform": "LinkedIn",
                "handle": "not connected",
                "status": "Connector not implemented yet",
            },
            {
                "platform": "YouTube",
                "handle": "not connected",
                "status": "Connector not implemented yet",
            },
        ]

    def default_team(self) -> list[dict]:
        return [
            {"name": "Project Lead", "role": "Owner"},
            {"name": "AI Engineer", "role": "Admin"},
            {"name": "Frontend Designer", "role": "Editor"},
            {"name": "Presenter Team", "role": "Viewer"},
        ]

    def default_brand_kit(self) -> dict:
        return {
            "company": "SocialPilot AI",
            "voice": "helpful, confident, student-friendly",
            "colors": "#0f766e, #2563eb, #ffffff",
            "logo": "SP",
        }

    def default_templates(self) -> list[dict]:
        return [
            {"name": "Product Launch", "prompt": "Announce a new product with benefits, CTA, and hashtags."},
            {"name": "Sale Announcement", "prompt": "Create a limited-time discount post with urgency and clear CTA."},
            {"name": "Gaming News", "prompt": "Summarize gaming news in an exciting short-form social post."},
            {"name": "Motivational Quote", "prompt": "Write a short motivational post for students and creators."},
            {"name": "Study Reminder", "prompt": "Create a helpful reminder for students to finish assignments."},
        ]

    def default_notifications(self) -> list[dict]:
        return [
            {"title": "Welcome", "body": "Create a draft or upload media to start.", "read": False},
            {"title": "Google OAuth setup", "body": "Add Supabase callback URL in Google Cloud to fix redirect mismatch.", "read": False},
        ]

    def save_accounts(self, payload: dict) -> None:
        accounts = payload.get("accounts", [])
        write_json_store("accounts.json", accounts)
        self.send_json({"ok": True, "accounts": accounts})

    def social_accounts(self) -> dict:
        return read_json_store("social_accounts.json", {})

    def find_social_credentials(self, email: str, platform: str) -> dict:
        accounts = self.social_accounts()
        return accounts.get(user_key(email), {}).get(platform.lower(), {})

    def get_social_account(self, email: str) -> None:
        account = self.find_social_credentials(email, "instagram")
        self.send_json(
            {
                "ok": True,
                "platform": "instagram",
                "handle": account.get("handle", ""),
                "instagram_user_id": account.get("instagram_user_id", ""),
                "has_token": bool(account.get("instagram_access_token")),
                "token_preview": mask_token(account.get("instagram_access_token", "")),
                "updated_at": account.get("updated_at", ""),
            }
        )

    def save_social_account(self, payload: dict) -> None:
        from datetime import datetime

        email = user_key(payload.get("email", ""))
        if not email or email == "local-user":
            self.send_error_json("Login first before saving a social account.", 400)
            return

        platform = str(payload.get("platform", "instagram")).lower().strip()
        if platform != "instagram":
            self.send_error_json("Only Instagram is implemented for official publishing right now.", 400)
            return

        instagram_user_id = str(payload.get("instagram_user_id", "")).strip()
        if instagram_user_id.startswith("@"):
            self.send_error_json("Use the Instagram Graph API user ID, not the @username.", 400)
            return

        accounts = self.social_accounts()
        user_accounts = accounts.setdefault(email, {})
        existing = user_accounts.get(platform, {})
        access_token = str(payload.get("instagram_access_token", "")).strip() or existing.get("instagram_access_token", "")
        user_accounts[platform] = {
            "handle": str(payload.get("handle", "")).strip(),
            "instagram_user_id": instagram_user_id or existing.get("instagram_user_id", ""),
            "instagram_access_token": access_token,
            "updated_at": datetime.now().isoformat(timespec="seconds"),
        }
        write_json_store("social_accounts.json", accounts)
        self.add_activity("Instagram account saved", f"{email} connected an Instagram publishing account.")
        self.send_json(
            {
                "ok": True,
                "message": "Instagram account saved for official API publishing.",
                "account": {
                    "handle": user_accounts[platform]["handle"],
                    "instagram_user_id": user_accounts[platform]["instagram_user_id"],
                    "token_preview": mask_token(access_token),
                },
            }
        )

    def save_team(self, payload: dict) -> None:
        team = payload.get("team", [])
        write_json_store("team.json", team)
        self.send_json({"ok": True, "team": team})

    def save_draft(self, payload: dict) -> None:
        from datetime import datetime

        drafts = read_json_store("drafts.json", [])
        draft = {
            "id": max((item.get("id", 0) for item in drafts), default=0) + 1,
            "title": payload.get("title", "Untitled Draft"),
            "platform": payload.get("platform", "instagram"),
            "content": payload.get("content", ""),
            "created_at": datetime.now().isoformat(timespec="seconds"),
        }
        drafts.append(draft)
        write_json_store("drafts.json", drafts)
        self.add_activity("Draft saved", draft["title"])
        self.send_json({"ok": True, "draft": draft})

    def save_brand_kit(self, payload: dict) -> None:
        kit = {
            "company": payload.get("company", ""),
            "voice": payload.get("voice", ""),
            "colors": payload.get("colors", ""),
            "logo": payload.get("logo", ""),
        }
        write_json_store("brand_kit.json", kit)
        self.add_activity("Brand kit updated", kit["company"] or "Brand settings saved")
        self.send_json({"ok": True, "brand_kit": kit})

    def add_activity(self, title: str, body: str) -> None:
        from datetime import datetime

        append_json_row(
            "activity.json",
            {
                "title": title,
                "body": body,
                "created_at": datetime.now().isoformat(timespec="seconds"),
            },
        )

    def read_json(self) -> dict:
        length = int(self.headers.get("Content-Length", "0"))
        if length == 0:
            return {}
        raw = self.rfile.read(length).decode("utf-8")
        return json.loads(raw)

    def send_json(self, payload, status: int = 200) -> None:
        self.send_bytes(json.dumps(payload).encode("utf-8"), "application/json", status)

    def send_error_json(self, message: str, status: int) -> None:
        self.send_json({"ok": False, "message": message}, status)

    def send_bytes(self, body: bytes, content_type: str, status: int = 200) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main() -> None:
    port = int(os.getenv("PORT", "5000"))
    server = ThreadingHTTPServer(("0.0.0.0", port), BotWebHandler)
    print(f"Personal AI Bot web app running on port {port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
