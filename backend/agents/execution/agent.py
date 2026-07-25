import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Callable, Awaitable
from uuid import uuid4

from agents.base_agent import BaseAgent, AgentContext, AgentResult


logger = logging.getLogger("agent.execution")


AsyncToolFunc = Callable[..., Awaitable[Dict[str, Any]]]


class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, AsyncToolFunc] = {}

    def register(self, name: str, func: AsyncToolFunc) -> None:
        self._tools[name] = func

    def get(self, name: str) -> Optional[AsyncToolFunc]:
        return self._tools.get(name)

    def list_tools(self) -> List[str]:
        return list(self._tools.keys())


async def _mock_send_email(params: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "tool": "send_email",
        "status": "sent",
        "to": params.get("to", "unknown"),
        "subject": params.get("subject", ""),
        "message_id": f"msg-{uuid4().hex[:8]}",
        "sent_at": datetime.utcnow().isoformat(),
    }


async def _mock_create_calendar_event(params: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "tool": "create_calendar_event",
        "status": "created",
        "event_id": f"evt-{uuid4().hex[:8]}",
        "title": params.get("title", ""),
        "start": params.get("start", ""),
        "end": params.get("end", ""),
        "created_at": datetime.utcnow().isoformat(),
    }


async def _mock_create_jira_issue(params: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "tool": "create_jira_issue",
        "status": "created",
        "issue_key": f"PROJ-{uuid4().hex[:6].upper()}",
        "summary": params.get("summary", ""),
        "assignee": params.get("assignee", "unassigned"),
        "priority": params.get("priority", "Medium"),
        "created_at": datetime.utcnow().isoformat(),
    }


async def _mock_send_slack_message(params: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "tool": "send_slack_message",
        "status": "sent",
        "channel": params.get("channel", "general"),
        "ts": f"{datetime.utcnow().timestamp()}",
        "message_preview": params.get("message", "")[:50],
        "sent_at": datetime.utcnow().isoformat(),
    }


async def _mock_create_notion_page(params: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "tool": "create_notion_page",
        "status": "created",
        "page_id": f"page-{uuid4().hex[:12]}",
        "title": params.get("title", ""),
        "url": f"https://notion.so/{uuid4().hex[:16]}",
        "created_at": datetime.utcnow().isoformat(),
    }


async def _mock_create_github_issue(params: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "tool": "create_github_issue",
        "status": "created",
        "issue_number": hash(params.get("title", "")) % 1000 + 1,
        "repo": params.get("repo", "owner/repo"),
        "title": params.get("title", ""),
        "url": f"https://github.com/owner/repo/issues/{hash(params.get('title', '')) % 1000 + 1}",
        "created_at": datetime.utcnow().isoformat(),
    }


_default_tool_registry = ToolRegistry()
_default_tool_registry.register("send_email", _mock_send_email)
_default_tool_registry.register("create_calendar_event", _mock_create_calendar_event)
_default_tool_registry.register("create_jira_issue", _mock_create_jira_issue)
_default_tool_registry.register("send_slack_message", _mock_send_slack_message)
_default_tool_registry.register("create_notion_page", _mock_create_notion_page)
_default_tool_registry.register("create_github_issue", _mock_create_github_issue)


TOOL_MAPPING: Dict[str, str] = {
    "email": "send_email",
    "calendar": "create_calendar_event",
    "jira": "create_jira_issue",
    "slack": "send_slack_message",
    "notion": "create_notion_page",
    "github": "create_github_issue",
}


class ExecutionAgent(BaseAgent):
    def __init__(self, config: Optional[Dict] = None,
                 tool_registry: Optional[ToolRegistry] = None):
        super().__init__(name="execution", config=config)
        self._tool_registry = tool_registry or _default_tool_registry

    async def process(self, context: AgentContext) -> AgentResult:
        action_item_output = context.state.get("action_item_output", {})
        verifier_output = context.state.get("verifier_output", {})

        verified_tasks = verifier_output.get("verified_tasks", [])
        all_items = action_item_output.get("action_items", [])
        decisions = action_item_output.get("decisions", [])

        items_to_execute = verified_tasks or all_items

        self.log(f"Preparing to execute {len(items_to_execute)} tasks")

        executed_actions: List[Dict] = []
        failed_actions: List[Dict] = []
        tool_responses: List[Dict] = []

        for item in items_to_execute:
            tool_mapping = self._determine_tool(item)
            if not tool_mapping:
                executed_actions.append({
                    "task_id": item.get("id", ""),
                    "description": item.get("description", "")[:100],
                    "tool": "none",
                    "result": "No tool required; task is informational",
                    "status": "skipped",
                    "executed_at": datetime.utcnow().isoformat(),
                })
                continue

            tool_name = tool_mapping["tool_name"]
            params = tool_mapping["params"]

            tool_func = self._tool_registry.get(tool_name)

            if not tool_func:
                failed_actions.append({
                    "task_id": item.get("id", ""),
                    "description": item.get("description", "")[:100],
                    "tool": tool_name,
                    "error": f"Tool '{tool_name}' not registered",
                    "status": "failed",
                    "executed_at": datetime.utcnow().isoformat(),
                })
                continue

            try:
                response = await tool_func(params)
                tool_responses.append(response)
                executed_actions.append({
                    "task_id": item.get("id", ""),
                    "description": item.get("description", "")[:100],
                    "tool": tool_name,
                    "result": response,
                    "status": "completed",
                    "owner": item.get("owner", "unassigned"),
                    "executed_at": datetime.utcnow().isoformat(),
                })
            except Exception as e:
                logger.exception(f"Tool {tool_name} failed for task {item.get('id', '')}")
                failed_actions.append({
                    "task_id": item.get("id", ""),
                    "description": item.get("description", "")[:100],
                    "tool": tool_name,
                    "error": str(e),
                    "status": "failed",
                    "executed_at": datetime.utcnow().isoformat(),
                })

        execution_summary = {
            "total_attempted": len(items_to_execute),
            "completed": len(executed_actions),
            "failed": len(failed_actions),
            "completion_rate": (
                round(len(executed_actions) / max(len(items_to_execute), 1) * 100, 1)
            ),
            "tools_used": list({a["tool"] for a in executed_actions}),
            "execution_window": {
                "start": min(
                    (a.get("executed_at", "") for a in executed_actions + failed_actions),
                    default=datetime.utcnow().isoformat(),
                ),
                "end": max(
                    (a.get("executed_at", "") for a in executed_actions + failed_actions),
                    default=datetime.utcnow().isoformat(),
                ),
            },
        }

        return AgentResult(
            success=len(failed_actions) < len(items_to_execute),
            data={
                "executed_actions": executed_actions,
                "failed_actions": failed_actions,
                "tool_responses": tool_responses,
                "execution_summary": execution_summary,
                "decisions_logged": len(decisions),
            },
            reasoning=f"Executed {len(executed_actions)} actions, "
                      f"{len(failed_actions)} failed. "
                      f"Completion rate: {execution_summary['completion_rate']}%",
            confidence=(
                0.9 if execution_summary["completion_rate"] >= 80
                else 0.6 if execution_summary["completion_rate"] >= 50
                else 0.3
            ),
            next_steps=[
                "Retry failed actions",
                "Log execution results",
                "Trigger reminders for pending tasks",
            ],
        )

    def _determine_tool(self, item: Dict) -> Optional[Dict[str, Any]]:
        description = item.get("description", "").lower()
        task_type = item.get("task_type", "").lower()

        tool_keywords: Dict[str, List[str]] = {
            "send_email": [
                "email", "send.*mail", "notify", "reach out",
                "contact", "communicate", "inform",
            ],
            "create_calendar_event": [
                "schedule", "calendar", "meeting", "appointment",
                "book", "set up.*call", "arrange",
            ],
            "create_jira_issue": [
                "jira", "ticket", "bug", "story", "task",
                "create.*issue", "log.*bug",
            ],
            "send_slack_message": [
                "slack", "channel", "message", "dm",
                "post.*slack", "notify.*slack",
            ],
            "create_notion_page": [
                "notion", "document", "doc", "wiki",
                "create.*page", "write.*doc",
            ],
            "create_github_issue": [
                "github", "github.*issue", "pr", "pull request",
                "repo", "repository",
            ],
        }

        import re

        for tool_name, keywords in tool_keywords.items():
            for kw in keywords:
                if re.search(kw, description):
                    return self._build_tool_params(tool_name, item)

        type_mapping = {
            "email": "send_email",
            "calendar": "create_calendar_event",
            "jira": "create_jira_issue",
            "slack": "send_slack_message",
            "notion": "create_notion_page",
            "github": "create_github_issue",
        }

        if task_type in type_mapping:
            tool_name = type_mapping[task_type]
            return self._build_tool_params(tool_name, item)

        general_keywords: Dict[str, List[str]] = {
            "send_email": ["assign", "responsible", "owner", "follow up"],
            "create_jira_issue": ["implement", "build", "develop", "fix",
                                   "refactor", "update", "migrate"],
            "create_calendar_event": ["review", "sync", "meet", "discuss"],
            "send_slack_message": ["ask", "check", "coordinate", "share"],
        }

        for tool_name, keywords in general_keywords.items():
            if any(kw in description for kw in keywords):
                return self._build_tool_params(tool_name, item)

        return None

    def _build_tool_params(self, tool_name: str,
                            item: Dict) -> Dict[str, Any]:
        description = item.get("description", "")
        owner = item.get("owner", "unassigned")
        priority = item.get("priority", "medium")
        deadline = item.get("deadline", "")

        base_params = {
            "description": description,
            "owner": owner,
            "priority": priority,
            "deadline": deadline,
        }

        tool_params_map: Dict[str, Dict[str, Any]] = {
            "send_email": {
                "to": owner or "team@example.com",
                "subject": f"Action Item: {description[:80]}",
                "body": f"Task: {description}\nPriority: {priority}\nDeadline: {deadline}",
                "cc": [],
                "bcc": [],
            },
            "create_calendar_event": {
                "title": f"Work on: {description[:80]}",
                "start": datetime.utcnow().isoformat(),
                "end": (datetime.utcnow().replace(hour=0) +
                        __import__("datetime").timedelta(hours=2)).isoformat(),
                "attendees": [owner] if owner and owner != "unassigned" else [],
                "description": description,
            },
            "create_jira_issue": {
                "project": "PROJ",
                "summary": description[:120],
                "description": description,
                "assignee": owner if owner != "unassigned" else None,
                "priority": priority.capitalize(),
                "issue_type": "Task",
                "labels": ["cortex-ai", "auto-generated"],
            },
            "send_slack_message": {
                "channel": f"#{owner or 'general'}".lower().replace(" ", "-"),
                "message": f"*Action Item:* {description}\n"
                           f"*Priority:* {priority}\n"
                           f"*Deadline:* {deadline or 'Not set'}",
                "blocks": None,
            },
            "create_notion_page": {
                "title": f"Action Item: {description[:80]}",
                "parent_page": "Action Items",
                "content": (
                    f"## Action Item\n\n"
                    f"**Description:** {description}\n\n"
                    f"**Owner:** {owner}\n\n"
                    f"**Priority:** {priority}\n\n"
                    f"**Deadline:** {deadline or 'Not set'}\n\n"
                    f"**Status:** Pending\n\n"
                    f"---\n*Auto-generated by CORTEX AI*"
                ),
            },
            "create_github_issue": {
                "repo": "owner/project",
                "title": description[:120],
                "body": (
                    f"## Task\n\n{description}\n\n"
                    f"**Assignee:** {owner}\n"
                    f"**Priority:** {priority}\n"
                    f"**Deadline:** {deadline or 'Not set'}\n\n"
                    f"---\n*Auto-generated by CORTEX AI*"
                ),
                "labels": ["cortex-ai"],
                "assignees": [owner] if owner and owner != "unassigned" else [],
            },
        }

        params = tool_params_map.get(tool_name, base_params)
        params.update(base_params)
        return {"tool_name": tool_name, "params": params}


def get_default_tool_registry() -> ToolRegistry:
    return _default_tool_registry
