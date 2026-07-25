from celery import Celery
from celery.schedules import crontab
from config import settings

celery_app = Celery(
    "cortex",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["scheduler.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    result_expires=3600 * 24 * 7,
    task_default_queue="cortex.default",
    task_routes={
        "scheduler.tasks.process_meeting_background": {"queue": "cortex.meetings"},
        "scheduler.tasks.generate_daily_summary": {"queue": "cortex.analytics"},
        "scheduler.tasks.update_analytics": {"queue": "cortex.analytics"},
        "scheduler.tasks.cleanup_old_data": {"queue": "cortex.maintenance"},
        "scheduler.tasks.sync_calendar": {"queue": "cortex.integrations"},
        "scheduler.tasks.check_reminders": {"queue": "cortex.notifications"},
    },
    task_default_exchange="cortex",
    task_default_exchange_type="direct",
    beat_schedule={
        "check-reminders-every-5-minutes": {
            "task": "scheduler.tasks.check_reminders",
            "schedule": crontab(minute="*/5"),
            "options": {"expires": 60},
        },
        "generate-daily-summary": {
            "task": "scheduler.tasks.generate_daily_summary",
            "schedule": crontab(hour=18, minute=0),
        },
        "update-analytics-hourly": {
            "task": "scheduler.tasks.update_analytics",
            "schedule": crontab(minute="0"),
        },
        "cleanup-old-data-daily": {
            "task": "scheduler.tasks.cleanup_old_data",
            "schedule": crontab(hour=3, minute=0),
        },
        "sync-calendar-every-15-minutes": {
            "task": "scheduler.tasks.sync_calendar",
            "schedule": crontab(minute="*/15"),
            "options": {"expires": 300},
        },
    },
)


celery_app.conf.beat_schedule = {
    "check-reminders-every-5-minutes": {
        "task": "scheduler.tasks.check_reminders",
        "schedule": crontab(minute="*/5"),
        "options": {"expires": 60},
    },
    "generate-daily-summary": {
        "task": "scheduler.tasks.generate_daily_summary",
        "schedule": crontab(hour=18, minute=0),
    },
    "update-analytics-hourly": {
        "task": "scheduler.tasks.update_analytics",
        "schedule": crontab(minute="0"),
    },
    "cleanup-old-data-daily": {
        "task": "scheduler.tasks.cleanup_old_data",
        "schedule": crontab(hour=3, minute=0),
    },
    "sync-calendar-every-15-minutes": {
        "task": "scheduler.tasks.sync_calendar",
        "schedule": crontab(minute="*/15"),
        "options": {"expires": 300},
    },
}


import logging
logger = logging.getLogger("cortex.celery")


@celery_app.task(bind=True, name="celery.ping")
def celery_ping(self):
    return {"status": "pong", "worker": self.request.hostname}
