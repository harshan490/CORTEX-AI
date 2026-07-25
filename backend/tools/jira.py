import json
import logging
import uuid
from typing import Any, Dict, List, Optional

from config import settings

logger = logging.getLogger("cortex.tools.jira")

MOCK_PROJECTS = {
    "CORTEX": {"key": "CORTEX", "name": "CORTEX AI", "lead": "alice@example.com"},
    "API": {"key": "API", "name": "API Integration", "lead": "bob@example.com"},
}

MOCK_ISSUES = []


class JiraTool:
    def __init__(self, mock_mode: bool = True, url: Optional[str] = None,
                 username: Optional[str] = None, api_token: Optional[str] = None):
        self.mock_mode = mock_mode
        self.url = url or settings.JIRA_URL
        self.username = username or settings.JIRA_USERNAME
        self.api_token = api_token or settings.JIRA_API_TOKEN
        self._client = None

    def _get_client(self):
        if self._client is None and not self.mock_mode and all([self.url, self.username, self.api_token]):
            from jira import JIRA
            self._client = JIRA(
                server=self.url,
                basic_auth=(self.username, self.api_token),
            )
        return self._client

    async def create_issue(
        self,
        project: str,
        summary: str,
        description: str = "",
        issue_type: str = "Task",
        assignee: Optional[str] = None,
        priority: str = "Medium",
    ) -> Dict[str, Any]:
        logger.info(f"Creating Jira issue in {project}: {summary}")

        if self.mock_mode:
            issue_key = f"{project.upper()}-{len(MOCK_ISSUES) + 1}"
            issue = {
                "id": str(uuid.uuid4()),
                "key": issue_key,
                "summary": summary,
                "description": description,
                "status": "To Do",
                "issue_type": issue_type,
                "priority": priority,
                "assignee": assignee,
                "created": "2026-07-25T12:00:00.000Z",
                "url": f"{self.url or 'https://mock.atlassian.net'}/browse/{issue_key}",
            }
            MOCK_ISSUES.append(issue)
            return issue

        client = self._get_client()
        if not client:
            raise RuntimeError("Jira client not configured")

        issue_dict = {
            "project": {"key": project.upper()},
            "summary": summary,
            "description": description,
            "issuetype": {"name": issue_type},
            "priority": {"name": priority},
        }
        if assignee:
            issue_dict["assignee"] = {"name": assignee}

        new_issue = client.create_issue(fields=issue_dict)
        return {
            "id": new_issue.id,
            "key": new_issue.key,
            "summary": summary,
            "description": description,
            "status": str(new_issue.fields.status),
            "issue_type": issue_type,
            "priority": priority,
            "assignee": assignee,
            "created": str(new_issue.fields.created),
            "url": f"{self.url}/browse/{new_issue.key}",
        }

    async def update_issue(self, issue_key: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        logger.info(f"Updating Jira issue {issue_key}")

        if self.mock_mode:
            for issue in MOCK_ISSUES:
                if issue["key"] == issue_key:
                    issue.update(updates)
                    issue["updated"] = "2026-07-25T12:30:00.000Z"
                    return issue
            return {"error": f"Issue {issue_key} not found"}

        client = self._get_client()
        if not client:
            raise RuntimeError("Jira client not configured")

        issue = client.issue(issue_key)
        field_mapping = {
            "summary": "summary",
            "description": "description",
            "assignee": ("assignee", lambda v: {"name": v}),
            "priority": ("priority", lambda v: {"name": v}),
            "status": ("status", lambda v: {"name": v}),
            "issue_type": ("issuetype", lambda v: {"name": v}),
        }

        update_fields = {}
        for key, value in updates.items():
            if key in field_mapping:
                mapped = field_mapping[key]
                if isinstance(mapped, tuple):
                    field_name, transformer = mapped
                    update_fields[field_name] = transformer(value)
                else:
                    update_fields[mapped] = value

        if update_fields:
            issue.update(fields=update_fields)

        return {
            "key": issue_key,
            "status": "updated",
            "updated_at": "2026-07-25T12:30:00.000Z",
        }

    async def get_issue(self, issue_key: str) -> Dict[str, Any]:
        logger.info(f"Getting Jira issue {issue_key}")

        if self.mock_mode:
            for issue in MOCK_ISSUES:
                if issue["key"] == issue_key:
                    return issue.copy()
            return {
                "id": str(uuid.uuid4()),
                "key": issue_key,
                "summary": "Mock issue",
                "description": "This is a mock issue",
                "status": "In Progress",
                "issue_type": "Task",
                "priority": "Medium",
                "assignee": "alice@example.com",
                "created": "2026-07-24T10:00:00.000Z",
                "url": f"{self.url or 'https://mock.atlassian.net'}/browse/{issue_key}",
            }

        client = self._get_client()
        if not client:
            raise RuntimeError("Jira client not configured")

        issue = client.issue(issue_key)
        return {
            "id": issue.id,
            "key": issue.key,
            "summary": str(issue.fields.summary),
            "description": str(getattr(issue.fields, "description", "")),
            "status": str(issue.fields.status),
            "issue_type": str(issue.fields.issuetype),
            "priority": str(getattr(issue.fields, "priority", "")),
            "assignee": str(getattr(issue.fields.assignee, "emailAddress", "")) if issue.fields.assignee else None,
            "created": str(issue.fields.created),
            "updated": str(getattr(issue.fields, "updated", "")),
            "url": f"{self.url}/browse/{issue.key}",
        }

    async def search_issues(self, jql_query: str) -> List[Dict[str, Any]]:
        logger.info(f"Searching Jira issues: {jql_query}")

        if self.mock_mode:
            results = []
            for issue in MOCK_ISSUES:
                if jql_query.lower() in issue["summary"].lower() or jql_query.lower() in issue["description"].lower():
                    results.append(issue.copy())
            if not results:
                results.append({
                    "id": str(uuid.uuid4()),
                    "key": f"MOCK-{uuid.uuid4().hex[:6].upper()}",
                    "summary": f"Result matching: {jql_query}",
                    "description": f"Mock search result for query: {jql_query}",
                    "status": "Open",
                    "priority": "Medium",
                    "created": "2026-07-25T12:00:00.000Z",
                })
            return results

        client = self._get_client()
        if not client:
            raise RuntimeError("Jira client not configured")

        issues = client.search_issues(jql_query)
        results = []
        for issue in issues:
            results.append({
                "id": issue.id,
                "key": issue.key,
                "summary": str(issue.fields.summary),
                "status": str(issue.fields.status),
                "priority": str(getattr(issue.fields, "priority", "")),
                "assignee": str(getattr(issue.fields.assignee, "displayName", "")) if issue.fields.assignee else None,
                "created": str(issue.fields.created),
                "url": f"{self.url}/browse/{issue.key}",
            })
        return results

    async def add_comment(self, issue_key: str, comment: str) -> Dict[str, Any]:
        logger.info(f"Adding comment to Jira issue {issue_key}")

        if self.mock_mode:
            return {
                "id": str(uuid.uuid4()),
                "issue_key": issue_key,
                "comment": comment,
                "author": "CORTEX AI",
                "created": "2026-07-25T12:00:00.000Z",
            }

        client = self._get_client()
        if not client:
            raise RuntimeError("Jira client not configured")

        new_comment = client.add_comment(issue_key, comment)
        return {
            "id": new_comment.id,
            "issue_key": issue_key,
            "comment": comment,
            "author": str(new_comment.author.displayName),
            "created": str(new_comment.created),
        }
