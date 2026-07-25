import json
import logging
import uuid
from typing import Any, Dict, List, Optional

from config import settings

logger = logging.getLogger("cortex.tools.slack")

MOCK_CHANNELS = {
    "general": {"id": "C001", "name": "general", "is_private": False, "members": ["U001", "U002"]},
    "engineering": {"id": "C002", "name": "engineering", "is_private": False, "members": ["U001", "U002", "U003"]},
    "meeting-notes": {"id": "C003", "name": "meeting-notes", "is_private": False, "members": ["U001"]},
}

MOCK_USERS = {
    "U001": {"id": "U001", "name": "alice", "real_name": "Alice Johnson", "email": "alice@example.com"},
    "U002": {"id": "U002", "name": "bob", "real_name": "Bob Smith", "email": "bob@example.com"},
}


class SlackTool:
    def __init__(self, mock_mode: bool = True, bot_token: Optional[str] = None):
        self.mock_mode = mock_mode
        self.bot_token = bot_token or settings.SLACK_BOT_TOKEN
        self._client = None

    def _get_client(self):
        if self._client is None and not self.mock_mode and self.bot_token:
            from slack_sdk import WebClient
            self._client = WebClient(token=self.bot_token)
        return self._client

    async def send_message(
        self,
        channel: str,
        text: str,
        blocks: Optional[List[Dict]] = None,
    ) -> Dict[str, Any]:
        logger.info(f"Sending Slack message to #{channel}")

        if self.mock_mode:
            return {
                "ok": True,
                "channel": channel,
                "ts": f"{uuid.uuid4().hex[:12]}",
                "message": {"text": text, "type": "message"},
            }

        client = self._get_client()
        if not client:
            logger.warning("Slack client not configured")
            return self._mock_send_message(channel, text, blocks)

        response = client.chat_postMessage(
            channel=channel,
            text=text,
            blocks=blocks,
        )
        return {
            "ok": response.get("ok", False),
            "channel": response.get("channel"),
            "ts": response.get("ts"),
            "message": response.get("message", {}),
        }

    def _mock_send_message(self, channel, text, blocks):
        return {
            "ok": True,
            "channel": channel,
            "ts": f"{uuid.uuid4().hex[:12]}",
            "message": {"text": text, "type": "message", "blocks": blocks or []},
        }

    async def create_channel(self, name: str, is_private: bool = False) -> Dict[str, Any]:
        logger.info(f"Creating Slack channel: #{name} (private={is_private})")

        if self.mock_mode:
            channel_id = f"C{uuid.uuid4().hex[:8].upper()}"
            MOCK_CHANNELS[name] = {
                "id": channel_id, "name": name, "is_private": is_private, "members": [],
            }
            return {
                "ok": True,
                "channel": {
                    "id": channel_id,
                    "name": name,
                    "is_private": is_private,
                    "is_member": True,
                },
            }

        client = self._get_client()
        if not client:
            return {"ok": False, "error": "Slack client not configured"}

        if is_private:
            response = client.conversations_create(name=name, is_private=True)
        else:
            response = client.conversations_create(name=name)
        return {
            "ok": response.get("ok", False),
            "channel": response.get("channel", {}),
        }

    async def add_user_to_channel(self, channel_id: str, user_id: str) -> Dict[str, Any]:
        logger.info(f"Adding user {user_id} to channel {channel_id}")

        if self.mock_mode:
            for ch in MOCK_CHANNELS.values():
                if ch["id"] == channel_id:
                    if user_id not in ch["members"]:
                        ch["members"].append(user_id)
                    break
            return {"ok": True, "channel_id": channel_id, "user_id": user_id}

        client = self._get_client()
        if not client:
            return {"ok": False, "error": "Slack client not configured"}

        response = client.conversations_invite(channel=channel_id, users=user_id)
        return {
            "ok": response.get("ok", False),
            "channel_id": channel_id,
            "user_id": user_id,
        }

    async def get_channel_history(self, channel_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        logger.info(f"Getting Slack channel history for {channel_id}")

        if self.mock_mode:
            return [
                {
                    "type": "message",
                    "user": "U001",
                    "text": "Good morning team! Let's start the standup.",
                    "ts": "1721800000.000001",
                    "reactions": [{"name": "wave", "count": 2}],
                },
                {
                    "type": "message",
                    "user": "U002",
                    "text": "API integration is on track. Documentation is ready for review.",
                    "ts": "1721800100.000002",
                    "reactions": [],
                },
            ][:limit]

        client = self._get_client()
        if not client:
            return []

        response = client.conversations_history(
            channel=channel_id,
            limit=limit,
        )
        return [
            {
                "type": msg.get("type"),
                "user": msg.get("user"),
                "text": msg.get("text"),
                "ts": msg.get("ts"),
                "reactions": msg.get("reactions", []),
                "thread_ts": msg.get("thread_ts"),
            }
            for msg in response.get("messages", [])
        ]

    async def send_dm(self, user_id: str, text: str) -> Dict[str, Any]:
        logger.info(f"Sending DM to user {user_id}")

        if self.mock_mode:
            user_name = MOCK_USERS.get(user_id, {}).get("real_name", user_id)
            return {
                "ok": True,
                "channel": f"D{uuid.uuid4().hex[:8].upper()}",
                "ts": f"{uuid.uuid4().hex[:12]}",
                "message": {"text": f"DM to {user_name}: {text}", "type": "message"},
            }

        client = self._get_client()
        if not client:
            return {"ok": False, "error": "Slack client not configured"}

        response = client.conversations_open(users=user_id)
        if not response.get("ok"):
            return {"ok": False, "error": response.get("error")}

        channel_id = response["channel"]["id"]
        msg_response = client.chat_postMessage(channel=channel_id, text=text)
        return {
            "ok": msg_response.get("ok", False),
            "channel": channel_id,
            "ts": msg_response.get("ts"),
            "message": {"text": text},
        }
