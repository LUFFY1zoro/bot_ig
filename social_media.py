from __future__ import annotations

from dataclasses import dataclass

from config import Settings


@dataclass
class PostResult:
    platform: str
    text: str
    posted: bool
    message: str


class SocialPoster:
    def __init__(self, settings: Settings):
        self.settings = settings

    def post(
        self,
        platform: str,
        text: str,
        dry_run: bool = True,
        image_url: str | None = None,
    ) -> PostResult:
        platform = platform.lower().strip()
        if dry_run:
            return PostResult(platform, text, False, "Dry run only. Nothing was posted.")

        if platform in {"x", "twitter"}:
            return self._post_to_x(text)
        if platform in {"instagram", "ig"}:
            return self._post_to_instagram(text, image_url)

        return PostResult(
            platform=platform,
            text=text,
            posted=False,
            message=(
                f"No live connector for {platform} yet. Add an official API connector "
                "in social_media.py after getting approved platform credentials."
            ),
        )

    def _post_to_x(self, text: str) -> PostResult:
        missing = [
            name
            for name, value in {
                "X_API_KEY": self.settings.x_api_key,
                "X_API_SECRET": self.settings.x_api_secret,
                "X_ACCESS_TOKEN": self.settings.x_access_token,
                "X_ACCESS_TOKEN_SECRET": self.settings.x_access_token_secret,
            }.items()
            if not value
        ]
        if missing:
            return PostResult(
                platform="x",
                text=text,
                posted=False,
                message=f"Missing X credentials: {', '.join(missing)}",
            )

        import tweepy

        client = tweepy.Client(
            consumer_key=self.settings.x_api_key,
            consumer_secret=self.settings.x_api_secret,
            access_token=self.settings.x_access_token,
            access_token_secret=self.settings.x_access_token_secret,
        )
        tweet = client.create_tweet(text=text)
        tweet_id = tweet.data.get("id") if tweet.data else "unknown"
        return PostResult("x", text, True, f"Posted successfully. Tweet ID: {tweet_id}")

    def _post_to_instagram(self, caption: str, image_url: str | None) -> PostResult:
        missing = [
            name
            for name, value in {
                "INSTAGRAM_ACCESS_TOKEN": self.settings.instagram_access_token,
                "INSTAGRAM_USER_ID": self.settings.instagram_user_id,
            }.items()
            if not value
        ]
        if missing:
            return PostResult(
                platform="instagram",
                text=caption,
                posted=False,
                message=f"Missing Instagram credentials: {', '.join(missing)}",
            )
        if not image_url:
            return PostResult(
                platform="instagram",
                text=caption,
                posted=False,
                message=(
                    "Instagram Graph API publishing needs a public image URL. "
                    "Upload the image somewhere reachable first, then paste the URL."
                ),
            )

        import requests

        base = "https://graph.facebook.com/v20.0"
        create_url = f"{base}/{self.settings.instagram_user_id}/media"
        publish_url = f"{base}/{self.settings.instagram_user_id}/media_publish"
        create_response = requests.post(
            create_url,
            data={
                "image_url": image_url,
                "caption": caption,
                "access_token": self.settings.instagram_access_token,
            },
            timeout=30,
        )
        create_data = create_response.json()
        if create_response.status_code >= 400 or "id" not in create_data:
            return PostResult(
                "instagram",
                caption,
                False,
                f"Instagram media creation failed: {create_data}",
            )

        publish_response = requests.post(
            publish_url,
            data={
                "creation_id": create_data["id"],
                "access_token": self.settings.instagram_access_token,
            },
            timeout=30,
        )
        publish_data = publish_response.json()
        if publish_response.status_code >= 400 or "id" not in publish_data:
            return PostResult(
                "instagram",
                caption,
                False,
                f"Instagram publish failed: {publish_data}",
            )

        return PostResult(
            "instagram",
            caption,
            True,
            f"Published to Instagram. Media ID: {publish_data['id']}",
        )
