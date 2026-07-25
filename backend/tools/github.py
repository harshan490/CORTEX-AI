import json
import logging
import os
import uuid
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger("cortex.tools.github")

MOCK_ISSUES = []


class GitHubTool:
    def __init__(self, mock_mode: bool = True, token: Optional[str] = None, repo: Optional[str] = None):
        self.mock_mode = mock_mode
        self.token = token or os.getenv("GITHUB_TOKEN", "")
        self.default_repo = repo or os.getenv("GITHUB_REPO", "")
        self._api_base = "https://api.github.com"

    def _headers(self) -> Dict[str, str]:
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "CORTEX-AI/1.0",
        }
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers

    async def _request(self, method: str, path: str, **kwargs) -> Any:
        if self.mock_mode:
            raise RuntimeError("Cannot make real requests in mock mode")

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.request(
                method,
                f"{self._api_base}{path}",
                headers=self._headers(),
                **kwargs,
            )
            response.raise_for_status()
            return response.json()

    async def create_issue(
        self,
        repo: str,
        title: str,
        body: str = "",
        assignees: Optional[List[str]] = None,
        labels: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        logger.info(f"Creating GitHub issue in {repo}: {title}")

        if self.mock_mode:
            issue = {
                "id": uuid.uuid4().hex[:12],
                "number": len(MOCK_ISSUES) + 1,
                "title": title,
                "body": body,
                "state": "open",
                "assignees": assignees or [],
                "labels": [{"name": l} for l in (labels or [])],
                "url": f"https://github.com/{repo}/issues/{len(MOCK_ISSUES) + 1}",
                "created_at": "2026-07-25T12:00:00Z",
            }
            MOCK_ISSUES.append(issue)
            return issue

        data = {"title": title, "body": body}
        if assignees:
            data["assignees"] = assignees
        if labels:
            data["labels"] = labels

        result = await self._request("POST", f"/repos/{repo}/issues", json=data)
        return {
            "id": str(result.get("id")),
            "number": result.get("number"),
            "title": result.get("title"),
            "body": result.get("body"),
            "state": result.get("state"),
            "assignees": [a.get("login") for a in result.get("assignees", [])],
            "labels": [l.get("name") for l in result.get("labels", [])],
            "url": result.get("html_url"),
            "created_at": result.get("created_at"),
        }

    async def update_issue(
        self,
        repo: str,
        issue_number: int,
        updates: Dict[str, Any],
    ) -> Dict[str, Any]:
        logger.info(f"Updating GitHub issue #{issue_number} in {repo}")

        if self.mock_mode:
            for issue in MOCK_ISSUES:
                if issue["number"] == issue_number:
                    issue.update(updates)
                    issue["updated_at"] = "2026-07-25T12:30:00Z"
                    return issue
            return {"error": f"Issue #{issue_number} not found"}

        result = await self._request(
            "PATCH",
            f"/repos/{repo}/issues/{issue_number}",
            json=updates,
        )
        return {
            "number": result.get("number"),
            "title": result.get("title"),
            "state": result.get("state"),
            "updated_at": result.get("updated_at"),
        }

    async def get_issues(
        self,
        repo: str,
        state: str = "open",
        labels: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        logger.info(f"Getting GitHub issues for {repo} (state={state})")

        if self.mock_mode:
            results = [i.copy() for i in MOCK_ISSUES if i.get("state") == state]
            if labels:
                results = [
                    i for i in results
                    if any(l.get("name") in labels for l in i.get("labels", []))
                ]
            if not results:
                results.append({
                    "number": 1,
                    "title": "Sample Issue",
                    "body": "This is a mock issue description.",
                    "state": state,
                    "assignees": [],
                    "labels": [{"name": l} for l in (labels or ["bug"])],
                    "url": f"https://github.com/{repo}/issues/1",
                    "created_at": "2026-07-24T10:00:00Z",
                })
            return results

        params = {"state": state, "per_page": 100}
        if labels:
            params["labels"] = ",".join(labels)

        results = await self._request("GET", f"/repos/{repo}/issues", params=params)
        return [
            {
                "number": issue.get("number"),
                "title": issue.get("title"),
                "body": issue.get("body"),
                "state": issue.get("state"),
                "assignees": [a.get("login") for a in issue.get("assignees", [])],
                "labels": [l.get("name") for l in issue.get("labels", [])],
                "url": issue.get("html_url"),
                "created_at": issue.get("created_at"),
                "updated_at": issue.get("updated_at"),
            }
            for issue in results
        ]

    async def add_comment(
        self,
        repo: str,
        issue_number: int,
        comment: str,
    ) -> Dict[str, Any]:
        logger.info(f"Adding comment to {repo}#{issue_number}")

        if self.mock_mode:
            return {
                "id": uuid.uuid4().hex[:12],
                "issue_number": issue_number,
                "body": comment,
                "author": "cortex-ai[bot]",
                "created_at": "2026-07-25T12:00:00Z",
                "url": f"https://github.com/{repo}/issues/{issue_number}#issuecomment-mock",
            }

        result = await self._request(
            "POST",
            f"/repos/{repo}/issues/{issue_number}/comments",
            json={"body": comment},
        )
        return {
            "id": str(result.get("id")),
            "issue_number": issue_number,
            "body": result.get("body"),
            "author": result.get("user", {}).get("login"),
            "created_at": result.get("created_at"),
            "url": result.get("html_url"),
        }
