import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from uuid import uuid4

from agents.base_agent import BaseAgent, AgentContext, AgentResult


logger = logging.getLogger("agent.reminder")


REMINDER_TEMPLATES = {
    "gentle": (
        "Hi {owner}, just a friendly reminder about your task: "
        "\"{description}\" is due on {deadline}. Let me know if you need support!"
    ),
    "firm": (
        "Hi {owner}, this is a reminder that \"{description}\" "
        "was due on {deadline}. Please prioritize this task "
        "and provide a status update."
    ),
    "escalation": (
        "ESCALATION: Task \"{description}\" assigned to {owner} "
        "(deadline: {deadline}) is overdue. Manager has been notified. "
        "Immediate attention required."
    ),
    "daily_digest": (
        "DAILY DIGEST - {date}\n"
        "Overdue Tasks: {overdue_count}\n"
        "Due Today: {due_today_count}\n"
        "Upcoming: {upcoming_count}\n"
        "---\n"
        "{task_list}"
    ),
    "pre_execution": (
        "Ready to execute: \"{description}\". "
        "Initiating automated execution now."
    ),
}


class ReminderAgent(BaseAgent):
    def __init__(self, config: Optional[Dict] = None):
        super().__init__(name="reminder", config=config)
        self._max_daily_digest_tasks = self.config.get("max_daily_digest_tasks", 20)

    async def process(self, context: AgentContext) -> AgentResult:
        action_item_output = context.state.get("action_item_output", {})
        execution_output = context.state.get("execution_output", {})
        planner_output = context.state.get("planner_output", {})

        all_items = list(action_item_output.get("action_items", []))
        executed = execution_output.get("executed_actions", [])
        tasks = planner_output.get("tasks", [])

        self.log(f"Generating reminders for {len(all_items)} tasks")

        now = datetime.utcnow()

        task_deadlines = self._normalize_task_deadlines(all_items, tasks)
        reminders = self._schedule_reminders(task_deadlines, now)
        escalation_queue = self._build_escalation_queue(task_deadlines, now)
        daily_summary = self._build_daily_summary(task_deadlines, now)

        for exec_action in executed:
            task_id = exec_action.get("task_id", exec_action.get("id"))
            if task_id:
                reminders.append({
                    "task_id": task_id,
                    "type": "execution_complete",
                    "message": REMINDER_TEMPLATES["pre_execution"].format(
                        description=exec_action.get("result", "Task executed"),
                    ),
                    "scheduled_time": now.isoformat(),
                    "priority": "high",
                })

        reminder_messages = self._generate_reminder_messages(
            reminders, escalation_queue
        )

        return AgentResult(
            success=True,
            data={
                "reminders": reminders,
                "escalation_queue": escalation_queue,
                "daily_summary": daily_summary,
                "reminder_messages": reminder_messages,
                "stats": {
                    "total_tasks": len(task_deadlines),
                    "overdue_tasks": sum(
                        1 for t in task_deadlines if t.get("is_overdue")
                    ),
                    "due_today": sum(
                        1 for t in task_deadlines
                        if self._is_due_today(t, now)
                    ),
                    "pending_reminders": len(reminders),
                    "escalation_count": len(escalation_queue),
                },
            },
            reasoning=f"Scheduled {len(reminders)} reminders, "
                      f"{len(escalation_queue)} escalations pending",
            confidence=0.85,
            next_steps=[
                "Send scheduled reminders",
                "Process escalation queue",
                "Monitor task completion",
            ],
        )

    def _normalize_task_deadlines(
        self, action_items: List[Dict], planner_tasks: List[Dict]
    ) -> List[Dict]:
        task_map: Dict[str, Dict] = {}
        now = datetime.utcnow()

        for item in action_items:
            task_id = item.get("id", str(uuid4()))
            deadline_str = item.get("deadline")
            deadline = None
            if deadline_str:
                try:
                    deadline = datetime.fromisoformat(deadline_str)
                except (ValueError, TypeError):
                    pass

            task_map[task_id] = {
                "id": task_id,
                "description": item.get("description", ""),
                "owner": item.get("owner", "unassigned"),
                "deadline": deadline,
                "deadline_str": deadline_str or "",
                "priority": item.get("priority", "medium"),
                "status": item.get("status", "pending"),
                "is_overdue": deadline is not None and deadline < now if deadline else False,
                "source": "action_item",
            }

        for task in planner_tasks:
            task_id = task.get("id", str(uuid4()))
            if task_id not in task_map:
                deadline_str = task.get("deadline")
                deadline = None
                if deadline_str:
                    try:
                        deadline = datetime.fromisoformat(deadline_str)
                    except (ValueError, TypeError):
                        pass

                task_map[task_id] = {
                    "id": task_id,
                    "description": task.get("description", ""),
                    "owner": task.get("owner", "unassigned"),
                    "deadline": deadline,
                    "deadline_str": deadline_str or "",
                    "priority": task.get("priority", "medium"),
                    "status": "pending",
                    "is_overdue": deadline is not None and deadline < now if deadline else False,
                    "source": "planner",
                }

        return list(task_map.values())

    def _schedule_reminders(
        self, tasks: List[Dict], now: datetime
    ) -> List[Dict]:
        reminders = []
        seen_tasks: set = set()

        for task in tasks:
            task_id = task["id"]
            if task_id in seen_tasks:
                continue
            seen_tasks.add(task_id)

            deadline = task.get("deadline")
            priority = task.get("priority", "medium")

            if not deadline:
                continue

            days_until_due = (deadline - now).days
            days_overdue = (now - deadline).days if task["is_overdue"] else 0

            if task["is_overdue"]:
                if days_overdue == 0:
                    level = "gentle"
                elif days_overdue <= 2:
                    level = "firm"
                else:
                    level = "escalation"

                reminders.append({
                    "task_id": task_id,
                    "type": f"overdue_{level}",
                    "scheduled_time": now.isoformat(),
                    "trigger": "overdue",
                    "priority": "high" if level == "escalation" else "medium",
                })

            elif days_until_due == 0:
                reminders.append({
                    "task_id": task_id,
                    "type": "due_today",
                    "scheduled_time": now.isoformat(),
                    "trigger": "due_today",
                    "priority": "high" if priority in ("urgent", "high") else "medium",
                })

            elif days_until_due == 1:
                reminders.append({
                    "task_id": task_id,
                    "type": "due_tomorrow",
                    "scheduled_time": now.isoformat(),
                    "trigger": "approaching_deadline",
                    "priority": "medium",
                })

            elif days_until_due <= 3 and priority in ("urgent", "high"):
                reminders.append({
                    "task_id": task_id,
                    "type": "upcoming_urgent",
                    "scheduled_time": now.isoformat(),
                    "trigger": "approaching_deadline",
                    "priority": "high",
                })

            elif days_until_due <= 7 and priority == "urgent":
                reminders.append({
                    "task_id": task_id,
                    "type": "upcoming_urgent_weekly",
                    "scheduled_time": now.isoformat(),
                    "trigger": "weekly_check",
                    "priority": "medium",
                })

        return reminders

    def _build_escalation_queue(
        self, tasks: List[Dict], now: datetime
    ) -> List[Dict]:
        escalation = []

        for task in tasks:
            if not task["is_overdue"]:
                continue

            deadline = task["deadline"]
            days_overdue = (now - deadline).days if deadline else 0

            if days_overdue >= 3:
                escalation.append({
                    "task_id": task["id"],
                    "description": task["description"][:100],
                    "owner": task["owner"],
                    "days_overdue": days_overdue,
                    "original_deadline": task["deadline_str"],
                    "priority": task["priority"],
                    "escalation_level": "manager",
                    "action": "notify_manager",
                    "reason": f"Task overdue by {days_overdue} days with no status update",
                })

            elif days_overdue >= 1:
                escalation.append({
                    "task_id": task["id"],
                    "description": task["description"][:100],
                    "owner": task["owner"],
                    "days_overdue": days_overdue,
                    "original_deadline": task["deadline_str"],
                    "priority": task["priority"],
                    "escalation_level": "team_lead",
                    "action": "request_status_update",
                    "reason": f"Task overdue by {days_overdue} day(s)",
                })

        return sorted(
            escalation,
            key=lambda x: x["days_overdue"],
            reverse=True,
        )

    def _build_daily_summary(
        self, tasks: List[Dict], now: datetime
    ) -> Dict:
        overdue = [t for t in tasks if t["is_overdue"]]
        due_today = [t for t in tasks if self._is_due_today(t, now)]
        upcoming = [
            t for t in tasks
            if t.get("deadline")
            and not t["is_overdue"]
            and 0 < (t["deadline"] - now).days <= 7
        ]

        task_lines = []
        for task_list, label in [
            (overdue, "OVERDUE"),
            (due_today, "DUE TODAY"),
            (upcoming, "UPCOMING (next 7 days)"),
        ]:
            if task_list:
                task_lines.append(f"  [{label}]")
                for t in task_list[:5]:
                    task_lines.append(
                        f"    - {t['description'][:60]} "
                        f"(Owner: {t['owner']}, "
                        f"Deadline: {t['deadline_str'] or 'Not set'})"
                    )
                if len(task_list) > 5:
                    task_lines.append(f"    ... and {len(task_list) - 5} more")

        task_list_str = "\n".join(task_lines) if task_lines else "  No tasks to report."

        return {
            "date": now.strftime("%Y-%m-%d"),
            "overdue_count": len(overdue),
            "due_today_count": len(due_today),
            "upcoming_count": len(upcoming),
            "total_active": len(tasks),
            "summary_text": (
                f"{len(overdue)} overdue, {len(due_today)} due today, "
                f"{len(upcoming)} upcoming this week"
            ),
            "task_list": task_list_str,
        }

    def _generate_reminder_messages(
        self, reminders: List[Dict], escalation_queue: List[Dict]
    ) -> List[Dict]:
        messages = []

        for reminder in reminders:
            task_id = reminder["task_id"]
            template_key = "gentle"

            if "overdue_escalation" in reminder["type"]:
                template_key = "escalation"
            elif "overdue_firm" in reminder["type"]:
                template_key = "firm"
            elif "overdue_gentle" in reminder["type"]:
                template_key = "gentle"
            elif reminder.get("trigger") == "due_today":
                template_key = "gentle"
            elif reminder.get("priority") == "high":
                template_key = "firm"

            messages.append({
                "task_id": task_id,
                "template_key": template_key,
                "reminder_type": reminder["type"],
                "priority": reminder["priority"],
                "scheduled_time": reminder["scheduled_time"],
            })

        for escalation in escalation_queue:
            messages.append({
                "task_id": escalation["task_id"],
                "template_key": "escalation",
                "reminder_type": "escalation",
                "priority": "high",
                "scheduled_time": datetime.utcnow().isoformat(),
                "escalation_level": escalation["escalation_level"],
                "recipient": escalation.get("owner", "manager"),
            })

        return messages

    def _is_due_today(self, task: Dict, now: datetime) -> bool:
        deadline = task.get("deadline")
        if not deadline or task["is_overdue"]:
            return False
        return (
            deadline.year == now.year
            and deadline.month == now.month
            and deadline.day == now.day
        )
