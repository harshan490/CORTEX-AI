import json
import logging
import uuid
from typing import Any, Dict, List, Optional

from config import settings

logger = logging.getLogger("cortex.tools.notion")

MOCK_DATABASES = {
    "meeting_notes": {
        "id": "db_mock_001",
        "title": "Meeting Notes",
        "properties": {
            "title": {"type": "title"},
            "date": {"type": "date"},
            "tags": {"type": "multi_select"},
            "status": {"type": "select"},
        },
    },
    "action_items": {
        "id": "db_mock_002",
        "title": "Action Items",
        "properties": {
            "title": {"type": "title"},
            "assignee": {"type": "rich_text"},
            "deadline": {"type": "date"},
            "status": {"type": "select"},
        },
    },
}

MOCK_PAGES = {}


class NotionTool:
    def __init__(self, mock_mode: bool = True, api_key: Optional[str] = None):
        self.mock_mode = mock_mode
        self.api_key = api_key or settings.NOTION_API_KEY
        self._client = None

    def _get_client(self):
        if self._client is None and not self.mock_mode and self.api_key:
            try:
                from notion_client import AsyncNotionClient
                self._client = AsyncNotionClient(auth=self.api_key)
            except ImportError:
                try:
                    from notion_client import Client
                    self._client = Client(auth=self.api_key)
                except ImportError:
                    logger.warning("notion-client not installed, falling back to mock mode")
                    self.mock_mode = True
        return self._client

    async def create_page(
        self,
        database_id: str,
        properties: Dict[str, Any],
        content: Optional[str] = None,
    ) -> Dict[str, Any]:
        logger.info(f"Creating Notion page in database {database_id}")

        if self.mock_mode:
            page_id = str(uuid.uuid4())
            page = {
                "id": page_id,
                "url": f"https://notion.so/{page_id.replace('-', '')}",
                "database_id": database_id,
                "properties": properties,
                "content": content or "",
                "created_time": "2026-07-25T12:00:00.000Z",
            }
            MOCK_PAGES[page_id] = page
            return page

        client = self._get_client()
        if not client:
            raise RuntimeError("Notion client not configured")

        page_data = {
            "parent": {"database_id": database_id},
            "properties": self._convert_properties(properties),
        }
        if content:
            page_data["children"] = [
                {
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [{"type": "text", "text": {"content": content}}],
                    },
                }
            ]

        page = client.pages.create(**page_data)
        return {
            "id": page.get("id"),
            "url": page.get("url"),
            "properties": page.get("properties", {}),
            "created_time": page.get("created_time"),
        }

    async def update_page(self, page_id: str, properties: Dict[str, Any]) -> Dict[str, Any]:
        logger.info(f"Updating Notion page {page_id}")

        if self.mock_mode:
            if page_id in MOCK_PAGES:
                MOCK_PAGES[page_id]["properties"].update(properties)
            return {
                "id": page_id,
                "properties": properties,
                "status": "updated",
                "updated_time": "2026-07-25T12:30:00.000Z",
            }

        client = self._get_client()
        if not client:
            raise RuntimeError("Notion client not configured")

        updated = client.pages.update(
            page_id=page_id,
            properties=self._convert_properties(properties),
        )
        return {
            "id": updated.get("id"),
            "properties": updated.get("properties", {}),
            "status": "updated",
            "updated_time": updated.get("last_edited_time"),
        }

    async def query_database(
        self,
        database_id: str,
        filter: Optional[Dict] = None,
        sorts: Optional[List[Dict]] = None,
    ) -> List[Dict[str, Any]]:
        logger.info(f"Querying Notion database {database_id}")

        if self.mock_mode:
            return [
                {
                    "id": str(uuid.uuid4()),
                    "url": "https://notion.so/mockpage",
                    "properties": {
                        "title": {"title": [{"plain_text": "Sprint Planning Notes"}]},
                        "date": {"date": {"start": "2026-07-25"}},
                        "status": {"select": {"name": "Done"}},
                    },
                    "created_time": "2026-07-25T10:00:00.000Z",
                },
                {
                    "id": str(uuid.uuid4()),
                    "url": "https://notion.so/mockpage2",
                    "properties": {
                        "title": {"title": [{"plain_text": "API Integration Spec"}]},
                        "date": {"date": {"start": "2026-07-24"}},
                        "status": {"select": {"name": "In Progress"}},
                    },
                    "created_time": "2026-07-24T14:00:00.000Z",
                },
            ]

        client = self._get_client()
        if not client:
            raise RuntimeError("Notion client not configured")

        query_params = {"database_id": database_id}
        if filter:
            query_params["filter"] = filter
        if sorts:
            query_params["sorts"] = sorts

        response = client.databases.query(**query_params)
        results = []
        for page in response.get("results", []):
            results.append({
                "id": page.get("id"),
                "url": page.get("url"),
                "properties": page.get("properties", {}),
                "created_time": page.get("created_time"),
            })
        return results

    async def get_page(self, page_id: str) -> Dict[str, Any]:
        logger.info(f"Getting Notion page {page_id}")

        if self.mock_mode:
            return MOCK_PAGES.get(page_id, {
                "id": page_id,
                "url": f"https://notion.so/{page_id.replace('-', '')}",
                "properties": {
                    "title": {"title": [{"plain_text": "Mock Page"}]},
                },
                "content": "This is a mock Notion page.",
                "created_time": "2026-07-25T12:00:00.000Z",
            })

        client = self._get_client()
        if not client:
            raise RuntimeError("Notion client not configured")

        page = client.pages.retrieve(page_id=page_id)
        children = client.blocks.children.list(block_id=page_id)
        content_parts = []
        for block in children.get("results", []):
            if block.get("type") == "paragraph":
                texts = block.get("paragraph", {}).get("rich_text", [])
                content_parts.append("".join(t.get("plain_text", "") for t in texts))

        return {
            "id": page.get("id"),
            "url": page.get("url"),
            "properties": page.get("properties", {}),
            "content": "\n".join(content_parts),
            "created_time": page.get("created_time"),
            "last_edited_time": page.get("last_edited_time"),
        }

    def _convert_properties(self, properties: Dict[str, Any]) -> Dict[str, Any]:
        notion_props = {}
        for key, value in properties.items():
            if isinstance(value, dict) and "type" in value:
                notion_props[key] = value
            elif isinstance(value, str):
                notion_props[key] = {"title": [{"type": "text", "text": {"content": value}}]}
            elif isinstance(value, list):
                notion_props[key] = {"rich_text": [{"type": "text", "text": {"content": ", ".join(str(v) for v in value)}}]}
            elif isinstance(value, bool):
                notion_props[key] = {"checkbox": value}
            elif isinstance(value, (int, float)):
                notion_props[key] = {"number": value}
            else:
                notion_props[key] = {"rich_text": [{"type": "text", "text": {"content": str(value)}}]}
        return notion_props
