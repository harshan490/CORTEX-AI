import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from celery import Task
from celery.utils.log import get_task_logger
from scheduler.celery_app import celery_app

logger = get_task_logger("cortex.tasks")


def run_async(coro):
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import threading
            result = []
            exception = []

            def _run():
                new_loop = asyncio.new_event_loop()
                try:
                    asyncio.set_event_loop(new_loop)
                    r = new_loop.run_until_complete(coro)
                    result.append(r)
                except Exception as e:
                    exception.append(e)
                finally:
                    new_loop.close()

            thread = threading.Thread(target=_run, daemon=True)
            thread.start()
            thread.join()
            if exception:
                raise exception[0]
            return result[0] if result else None
        else:
            return asyncio.run(coro)
    except RuntimeError:
        return asyncio.run(coro)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60, name="scheduler.tasks.check_reminders")
def check_reminders(self):
    logger.info("Checking pending reminders...")
    try:
        from database import async_session_factory
        from database import crud
        from sqlalchemy import select, update
        from database.models import Reminder, ReminderStatus, Task

        reminders = run_async(_get_pending_reminders())

        sent_count = 0
        failed_count = 0

        for reminder in reminders:
            try:
                result = run_async(_send_reminder(reminder))
                if result:
                    sent_count += 1
                else:
                    failed_count += 1
            except Exception as e:
                logger.error(f"Failed to send reminder {reminder.get('id')}: {e}")
                failed_count += 1

        logger.info(f"Reminder check complete: {sent_count} sent, {failed_count} failed")
        return {
            "status": "completed",
            "checked": len(reminders),
            "sent": sent_count,
            "failed": failed_count,
        }
    except Exception as e:
        logger.exception(f"Reminder check failed: {e}")
        self.retry(exc=e)


async def _get_pending_reminders():
    from database import async_session_factory
    from database.models import Reminder, ReminderStatus
    from sqlalchemy import select, and_
    from datetime import datetime, timezone

    async with async_session_factory() as session:
        now = datetime.now(timezone.utc)
        result = await session.execute(
            select(Reminder).where(
                and_(Reminder.status == ReminderStatus.pending, Reminder.scheduled_for <= now)
            )
        )
        reminders = result.scalars().all()
        return [
            {
                "id": str(r.id),
                "task_id": str(r.task_id),
                "type": r.type.value if hasattr(r.type, "value") else r.type,
                "recipient_id": str(r.recipient_id),
                "message": r.message,
                "scheduled_for": r.scheduled_for.isoformat() if r.scheduled_for else None,
            }
            for r in reminders
        ]


async def _send_reminder(reminder: Dict) -> bool:
    from database import async_session_factory
    from database.models import ReminderStatus
    from sqlalchemy import update
    from database.models import Reminder

    reminder_type = reminder.get("type", "email")
    recipient_id = reminder.get("recipient_id")
    message = reminder.get("message", "You have a pending task reminder.")

    logger.info(f"Sending {reminder_type} reminder to {recipient_id}: {message}")

    if reminder_type == "email":
        from tools.registry import get_tool_registry
        registry = get_tool_registry()
        try:
            tool = registry.get_tool("gmail")
            user_email = f"user_{recipient_id[:8]}@example.com"
            await tool.send_email(
                to=user_email,
                subject="Task Reminder - CORTEX AI",
                body=f"Reminder: {message}",
            )
        except Exception as e:
            logger.error(f"Email reminder failed: {e}")

    async with async_session_factory() as session:
        from sqlalchemy import select
        from database.models import Reminder
        from datetime import datetime, timezone
        result = await session.execute(
            select(Reminder).where(Reminder.id == reminder["id"])
        )
        db_reminder = result.scalar_one_or_none()
        if db_reminder:
            db_reminder.status = ReminderStatus.sent
            db_reminder.sent_at = datetime.now(timezone.utc)
            await session.commit()

    return True


@celery_app.task(bind=True, max_retries=2, default_retry_delay=120, name="scheduler.tasks.process_meeting_background")
def process_meeting_background(self, meeting_id: str):
    logger.info(f"Background processing meeting: {meeting_id}")
    try:
        from services.meeting import MeetingService
        from database import async_session_factory

        async def _process():
            async with async_session_factory() as session:
                service = MeetingService()
                result = await service.process_meeting(meeting_id, db_session=session)
                return result

        result = run_async(_process())
        logger.info(f"Meeting {meeting_id} processing complete: {result.get('status')}")
        return {
            "meeting_id": meeting_id,
            "status": result.get("status", "completed"),
            "has_transcript": bool(result.get("transcript")),
            "has_summary": bool(result.get("summary")),
        }
    except Exception as e:
        logger.exception(f"Meeting background processing failed for {meeting_id}: {e}")
        self.retry(exc=e)


@celery_app.task(bind=True, name="scheduler.tasks.generate_daily_summary")
def generate_daily_summary(self):
    logger.info("Generating daily summary...")
    try:
        from database import async_session_factory

        async def _generate():
            async with async_session_factory() as session:
                from sqlalchemy import select, func
                from database.models import Meeting, ActionItem, Task, Decision
                from datetime import datetime, timezone, timedelta

                today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
                tomorrow = today + timedelta(days=1)

                meetings_result = await session.execute(
                    select(func.count()).select_from(Meeting).where(
                        Meeting.date.between(today, tomorrow)
                    )
                )
                meetings_today = meetings_result.scalar() or 0

                tasks_result = await session.execute(
                    select(func.count()).select_from(Task).where(Task.created_at >= today)
                )
                new_tasks = tasks_result.scalar() or 0

                overdue_result = await session.execute(
                    select(func.count()).select_from(Task).where(
                        Task.deadline < today,
                        Task.status != "completed",
                    )
                )
                overdue_tasks = overdue_result.scalar() or 0

                return {
                    "date": today.date().isoformat(),
                    "meetings_today": meetings_today,
                    "new_tasks": new_tasks,
                    "overdue_tasks": overdue_tasks,
                }

        summary = run_async(_generate())
        logger.info(f"Daily summary: {summary}")
        return {"status": "completed", "summary": summary}
    except Exception as e:
        logger.exception(f"Daily summary generation failed: {e}")
        self.retry(exc=e)


@celery_app.task(bind=True, name="scheduler.tasks.update_analytics")
def update_analytics(self):
    logger.info("Updating analytics...")
    try:
        from database import async_session_factory

        async def _update():
            async with async_session_factory() as session:
                from sqlalchemy import select, func
                from database.models import Meeting, ActionItem, Task, Decision, ItemStatus

                total_meetings = (await session.execute(
                    select(func.count()).select_from(Meeting)
                )).scalar() or 0

                total_tasks = (await session.execute(
                    select(func.count()).select_from(Task)
                )).scalar() or 0

                completed_tasks = (await session.execute(
                    select(func.count()).select_from(Task).where(Task.status == ItemStatus.completed)
                )).scalar() or 0

                total_action_items = (await session.execute(
                    select(func.count()).select_from(ActionItem)
                )).scalar() or 0

                completed_action_items = (await session.execute(
                    select(func.count()).select_from(ActionItem).where(ActionItem.status == ItemStatus.completed)
                )).scalar() or 0

                total_decisions = (await session.execute(
                    select(func.count()).select_from(Decision)
                )).scalar() or 0

                return {
                    "total_meetings": total_meetings,
                    "total_tasks": total_tasks,
                    "completed_tasks": completed_tasks,
                    "completion_rate": round(completed_tasks / total_tasks, 4) if total_tasks else 0,
                    "total_action_items": total_action_items,
                    "completed_action_items": completed_action_items,
                    "total_decisions": total_decisions,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }

        stats = run_async(_update())
        logger.info(f"Analytics updated: {stats}")
        return {"status": "completed", "stats": stats}
    except Exception as e:
        logger.exception(f"Analytics update failed: {e}")
        self.retry(exc=e)


@celery_app.task(bind=True, name="scheduler.tasks.cleanup_old_data")
def cleanup_old_data(self):
    logger.info("Running data retention cleanup...")
    try:
        from database import async_session_factory
        from datetime import datetime, timedelta, timezone
        import uuid

        async def _cleanup():
            async with async_session_factory() as session:
                from sqlalchemy import delete
                from database.models import AgentLog, WorkflowState

                cutoff = datetime.now(timezone.utc) - timedelta(days=90)

                logs_result = await session.execute(
                    delete(AgentLog).where(AgentLog.created_at < cutoff)
                )
                deleted_logs = logs_result.rowcount

                states_result = await session.execute(
                    delete(WorkflowState).where(WorkflowState.created_at < cutoff)
                )
                deleted_states = states_result.rowcount

                await session.commit()
                return {
                    "deleted_agent_logs": deleted_logs,
                    "deleted_workflow_states": deleted_states,
                    "cutoff_date": cutoff.isoformat(),
                }

        result = run_async(_cleanup())
        logger.info(f"Cleanup complete: {result}")
        return {"status": "completed", "deleted": result}
    except Exception as e:
        logger.exception(f"Data cleanup failed: {e}")
        self.retry(exc=e)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=300, name="scheduler.tasks.sync_calendar")
def sync_calendar(self):
    logger.info("Syncing calendar...")
    try:
        from database import async_session_factory
        from datetime import datetime, timedelta, timezone

        async def _sync():
            async with async_session_factory() as session:
                from tools.registry import get_tool_registry
                registry = get_tool_registry()

                if not registry.is_tool_available("calendar"):
                    return {"status": "skipped", "reason": "Calendar tool not available"}

                calendar = registry.get_tool("calendar")
                now = datetime.now(timezone.utc)
                events = await calendar.get_events(
                    time_min=now - timedelta(days=1),
                    time_max=now + timedelta(days=14),
                    max_results=100,
                )

                from database.models import Meeting
                from sqlalchemy import select

                gcal_event_ids = {e["id"] for e in events if e.get("id")}
                existing_result = await session.execute(
                    select(Meeting).where(Meeting.gcal_event_id.in_(gcal_event_ids))
                )
                existing = {str(m.gcal_event_id) for m in existing_result.scalars().all()}

                new_events = [e for e in events if e.get("id") not in existing]
                return {
                    "status": "completed",
                    "total_events": len(events),
                    "existing": len(existing),
                    "new_events": len(new_events),
                    "synced_at": datetime.now(timezone.utc).isoformat(),
                }

        result = run_async(_sync())
        logger.info(f"Calendar sync complete: {result}")
        return result
    except Exception as e:
        logger.exception(f"Calendar sync failed: {e}")
        self.retry(exc=e)
