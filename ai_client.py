from __future__ import annotations

import json
import base64
from urllib.parse import quote
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from config import Settings


SYSTEM_PROMPT = """
You are SocialPilot AI, a practical assistant for students, creators, and small teams.

You help with:
- assignments, study planning, explanations, summaries, and productivity
- social media captions, hashtags, hooks, calls-to-action, content calendars, and replies
- media analysis, brand voice, startup planning, and class-defense presentation support

For school work, teach and guide instead of doing dishonest cheating. Explain steps clearly.
For social media, write natural, platform-aware content with a strong hook and useful hashtags.
When the user asks for a plan, structure the response with short sections and clear next actions.
Avoid fake claims about analytics or platform access. Say when real API connection is required.
Keep answers concise unless the user asks for detail.
""".strip()


class AIClient:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.provider = settings.ai_provider.lower().strip()
        if self.provider == "gemini" and not settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY is missing. Add it in the website settings or .env file.")
        if self.provider == "openai" and not settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is missing. Add it in the website settings or .env file.")

    def ask(self, prompt: str) -> str:
        if self.provider == "gemini":
            return self._ask_gemini(prompt)
        if self.provider == "openai":
            return self._ask_openai(prompt)
        raise RuntimeError(f"Unsupported AI_PROVIDER: {self.settings.ai_provider}")

    def _ask_gemini(self, prompt: str) -> str:
        return self._ask_gemini_with_parts([{"text": prompt}])

    def _ask_gemini_with_parts(self, parts: list[dict]) -> str:
        model = quote(self.settings.gemini_model, safe="")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        payload = {
            "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
            "contents": [{"role": "user", "parts": parts}],
        }
        request = Request(
            f"{url}?key={self.settings.gemini_api_key}",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urlopen(request, timeout=45) as response:
                data = json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            try:
                parsed = json.loads(body)
                message = parsed.get("error", {}).get("message") or body
            except json.JSONDecodeError:
                message = body or exc.reason
            raise RuntimeError(f"Gemini request failed: {message}") from exc
        except URLError as exc:
            raise RuntimeError(f"Gemini network error: {exc.reason}") from exc

        candidates = data.get("candidates", [])
        parts = candidates[0].get("content", {}).get("parts", []) if candidates else []
        text = "".join(part.get("text", "") for part in parts).strip()
        if not text:
            raise RuntimeError(f"Gemini returned no text: {data}")
        return text

    def _ask_openai(self, prompt: str) -> str:
        try:
            from openai import OpenAI

            client = OpenAI(api_key=self.settings.openai_api_key)
            response = client.responses.create(
                model=self.settings.openai_model,
                input=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
            )
            return response.output_text.strip()
        except ImportError:
            return self._ask_openai_http(prompt)

    def _ask_openai_http(self, prompt: str) -> str:
        payload = {
            "model": self.settings.openai_model,
            "input": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
        }
        request = Request(
            "https://api.openai.com/v1/responses",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.settings.openai_api_key}",
            },
            method="POST",
        )
        try:
            with urlopen(request, timeout=45) as response:
                data = json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            try:
                parsed = json.loads(body)
                message = parsed.get("error", {}).get("message") or body
            except json.JSONDecodeError:
                message = body or exc.reason
            raise RuntimeError(f"OpenAI request failed: {message}") from exc
        except URLError as exc:
            raise RuntimeError(f"OpenAI network error: {exc.reason}") from exc

        text = data.get("output_text", "").strip()
        if text:
            return text

        parts: list[str] = []
        for item in data.get("output", []):
            for content in item.get("content", []):
                if content.get("type") in {"output_text", "text"}:
                    parts.append(content.get("text", ""))
        text = "".join(parts).strip()
        if not text:
            raise RuntimeError(f"OpenAI returned no text: {data}")
        return text

    def draft_social_post(self, topic: str, platform: str, tone: str) -> str:
        prompt = (
            f"Create a polished {platform} post about: {topic}\n"
            f"Tone: {tone}\n\n"
            "Return:\n"
            "1. Caption\n"
            "2. Hashtags\n"
            "3. Hook\n"
            "4. Call-to-action\n"
            "Keep it natural, non-spammy, and ready to publish."
        )
        return self.ask(prompt)

    def analyze_media(self, media_path, mime_type: str, platform: str, goal: str) -> str:
        prompt = (
            "Analyze this uploaded social media asset and create a practical content pack. "
            "Return clear sections: what the media shows, best caption, hashtags, hook, "
            "call-to-action, story/reel idea, and posting tips for more engagement. "
            f"Platform: {platform}. Goal: {goal or 'increase views and engagement'}."
        )
        if self.provider != "gemini":
            return self.ask(
                f"{prompt}\nMedia file name: {getattr(media_path, 'name', media_path)}. "
                "The current provider cannot inspect local media directly in this starter."
            )

        media_bytes = media_path.read_bytes()
        if len(media_bytes) > 15 * 1024 * 1024:
            return self.ask(
                f"{prompt}\nThe uploaded file is larger than the direct analysis limit. "
                f"Filename: {media_path.name}. MIME type: {mime_type}. "
                "Draft a content plan based on this limited metadata."
            )

        encoded = base64.b64encode(media_bytes).decode("ascii")
        return self._ask_gemini_with_parts(
            [
                {"text": prompt},
                {"inline_data": {"mime_type": mime_type, "data": encoded}},
            ]
        )
