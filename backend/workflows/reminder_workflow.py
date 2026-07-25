import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from config import settings

logger = logging.getLogger("cortex.workflows.reminder")


class ReminderWorkflowState:
    def __init__(self):
        self.checked_count = 0
        self.sent_count = 0
        self.failed_count = 0
        self.escalated_count = 0
        self.errors: List[Dict[str, Any]] = []
        self.actions: List[Dict[str, Any]] = []
        self.start_time: Optional[datetime] = None
        self.end_time: Optional[datetime] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "checked": self.checked_count,
            "sent": self.sent_count,
            "failed": self.failed_count,
            "escalated": self.escalated_count,
            "errors": self.errors,
            "actions": self.actions[-50:],
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "duration_seconds": (
                (self.end_time - self.start_time).total_seconds()
                if self.start_time and self.end_time
                else None
            ),
        }


ESCALATION_DELAY_MAP = {
    "critical": timedelta(hours=1),
    "high": timedelta(hours=4),
    "medium": timedelta(hours=24),
    "low": timedelta(days=3),
}


async def run_reminder_workflow() -> Dict[str, Any]:
    state = ReminderWorkflowState()
    state.start_time = datetime.now(timezone.utc)
    logger.info("Reminder workflow started")

    try:
        reminders = await _fetch_pending_reminders()
        state.checked_count = len(reminders)
        logger.info(f"Found {len(reminders)} pending reminders")

        for reminder in reminders:
            try:
                result = await _process_reminder(reminder)
                if result.get("status") == "sent":
                    state.sent_count += 1
                    state.actions.append({
                        "type": "sent",
                        "reminder_id": reminder["id"],
                        "task_id": reminder.get("task_id"),
                        "method": reminder.get("type", "email"),
                    })
                elif result.get("status") == "failed":
                    state.failed_count += 1
                    state.errors.append({
                        "reminder_id": reminder["id"],
                        "error": result.get("error", "Unknown error"),
                    })
                    escalated = await _handle_escalation(reminder)
                    if escalated:
                        state.escalated_count += 1
                        state.actions.append({
                            "type": "escalated",
                            "reminder_id": reminder["id"],
                            "escalation_level": escalated,
                        })
            except Exception as e:
                logger.exception(f"Error processing reminder {reminder.get('id')}: {e}")
                state.failed_count += 1
                state.errors.append({
                    "reminder_id": reminder.get("id"),
                    "error": str(e),
                })

    except Exception as e:
        logger.exception(f"Reminder workflow failed: {e}")
        state.errors.append({"step": "fetch_reminders", "error": str(e)})

    state.end_time = datetime.now(timezone.utc)
    elapsed = (state.end_time - state.start_time).total_seconds()
    logger.info(
        f"Reminder workflow completed in {elapsed:.2f}s: "
        f"checked={state.checked_count}, sent={state.sent_count}, "
        f"failed={state.failed_count}, escalated={state.escalated_count}"
    )

    try:
        await _log_workflow_results(state)
    except Exception as e:
        logger.error(f"Failed to log reminder workflow results: {e}")

    return state.to_dict()


async def _fetch_pending_reminders() -> List[Dict[str, Any]]:
    try:
        from database import async_session_factory
        from database.models import Reminder, ReminderStatus
        from sqlalchemy import select, and_

        async with async_session_factory() as session:
            now = datetime.now(timezone.utc)
            result = await session.execute(
                select(Reminder).where(
                    and_(
                        Reminder.status == ReminderStatus.pending,
                        Reminder.scheduled_for <= now,
                    )
                ).order_by(Reminder.scheduled_for.asc())
            )
            reminders = result.scalars().all()
            return [
                {
                    "id": str(r.id),
                    "task_id": str(r.task_id),
                    "recipient_id": str(r.recipient_id),
                    "type": r.type.value if hasattr(r.type, "value") else r.type,
                    "message": r.message or "You have a pending task reminder.",
                    "scheduled_for": r.scheduled_for,
                    "status": r.status.value if hasattr(r.status, "value") else r.status,
                }
                for r in reminders
            ]
    except Exception as e:
        logger.error(f"Failed to fetch pending reminders: {e}")
        return []


async def _process_reminder(reminder: Dict) -> Dict[str, Any]:
    reminder_type = reminder.get("type", "email")
    reminder_id = reminder.get("id")
    message = reminder.get("message", "You have a pending task reminder.")
    recipient_id = reminder.get("recipient_id")

    logger.info(f"Processing reminder {reminder_id}: type={reminder_type}, recipient={recipient_id}")

    try:
        if reminder_type in ("email", "slack"):
            result = await _send_reminder_message(reminder_type, recipient_id, message)
        else:
            result = await _send_reminder_message("email", recipient_id, message)

        if result.get("success"):
            await _mark_reminder_sent(reminder_id)
            return {"status": "sent", "method": reminder_type}
        else:
            return {"status": "failed", "error": result.get("error", "Send failed")}

    except Exception as e:
        logger.exception(f"Failed to process reminder {reminder_id}")
        return {"status": "failed", "error": str(e)}


async def _send_reminder_message(method: str, recipient_id: str, message: str) -> Dict[str, Any]:
    from tools.registry import get_tool_registry

    registry = get_tool_registry()

    if method == "email" and registry.is_tool_available("gmail"):
        try:
            gmail = registry.get_tool("gmail")
            user_email = f"user_{recipient_id[:8]}@example.com"
            result = await gmail.send_email(
                to=user_email,
                subject="Task Reminder - CORTEX AI",
                body=message,
            )
            return {"success": True, "result": result}
        except Exception as e:
            logger.warning(f"Email send failed: {e}")
            return {"success": False, "error": str(e)}

    if method == "slack" and registry.is_tool_available("slack"):
        try:
            slack = registry.get_tool("slack")
            result = await slack.send_dm(
                user_id=recipient_id,
                text=f"*Reminder:* {message}",
            )
            return {"success": True, "result": result}
        except Exception as e:
            logger.warning(f"Slack DM failed: {e}")
            return {"success": False, "error": str(e)}

    logger.warning(f"No tool available for method '{method}'")
    return {"success": False, "error": f"Tool for '{method}' not available"}


async def _mark_reminder_sent(reminder_id: str):
    try:
        from database import async_session_factory
        from database.models import Reminder, ReminderStatus
        from sqlalchemy import select

        async with async_session_factory() as session:
            from sqlalchemy import select
            result = await session.execute(
                select(Reminder).where(Reminder.id == reminder_id)
            )
            reminder = result.scalar_one_or_none()
            if reminder:
                reminder.status = ReminderStatus.sent
                reminder.sent_at = datetime.now(timezone.utc)
                await session.commit()
    except Exception as e:
        logger.error(f"Failed to mark reminder {reminder_id} as sent: {e}")


async def _handle_escalation(reminder: Dict) -> Optional[str]:
    try:
        from database import async_session_factory
        from database.models import Reminder, Task, ItemStatus
        from sqlalchemy import select

        async with async_session_factory() as session:
            from database import async_session_factory
            from database.models import Reminder, Task, ItemStatus

            task_result = await session.execute(
                select(Task).where(Task.id == reminder["task_id"])
            )
            task = task_result.scalar_one_or_none()
            if not task:
                return None

            priority = task.priority.value if hasattr(task.priority, "value") else str(task.priority)
            delay = ESCALATION_DELAY_MAP.get(priority, ESCALATION_DELAY_MAP["medium"])
            scheduled_time = reminder.get("scheduled_for")

            if isinstance(scheduled_time, str):
                scheduled_time = datetime.fromisoformat(scheduled_time.replace("Z", "+00:00"))

            if isinstance(scheduled_time, datetime):
                if datetime.now(timezone.utc) - scheduled_time > delay:
                    escalation_level = f"escalated_{priority}"
                    logger.warning(
                        f"Escalating reminder {reminder['id']}: "
                        f"priority={priority}, delay={delay}"
                    )

                    from tools.registry import get_tool_registry
                    registry = get_tool_registry()

                    if registry.is_tool_available("slack"):
                        try:
                            slack = registry.get_tool("slack")
                            await slack.send_message(
                                channel="general",
                                text=(
                                    f":rotating_light: *ESCALATION*: Task reminder overdue!\n"
                                    f"Task: {task.title}\n"
                                    f"Priority: {priority}\n"
                                    f"Reminder: {reminder.get('message', 'No message')}"
                                ),
                            )
                        except Exception as e:
                            logger.warning(f"Escalation notification failed: {e}")

                    return escalation_level

        return None

    except Exception as e:
        logger.error(f"Escalation check failed: {e}")
        return None


async def _log_workflow_results(state: ReminderWorkflowState):
    try:
        logger.info(
            "ReminderWorkflowResult: "
            f"checked={state.checked_count}, "
            f"sent={state.sent_count}, "
            f"failed={state.failed_count}, "
            f"escalated={state.escalated_count}"
        )
    except Exception as e:
        logger.error(f"Failed to log workflow results: {e}")
