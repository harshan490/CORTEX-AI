from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from database import get_db
from api.dependencies import get_current_user
from models.schemas import (
    AnalyticsResponse, ProductivityScore, TeamPerformanceResponse,
    MeetingTrend, MeetingTrendsResponse
)
from database.models import User, Meeting, Task, ActionItem, Decision, ItemStatus, Priority
from typing import Optional, Literal
from datetime import datetime, timedelta, timezone
import uuid

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

PERIOD_DAYS = {"week": 7, "month": 30, "quarter": 90}


def _period_since(period: str) -> datetime:
    """Return UTC cutoff datetime for the given period."""
    days = PERIOD_DAYS[period]
    return datetime.now(timezone.utc) - timedelta(days=days)


@router.get("/overview", response_model=AnalyticsResponse)
async def get_overview(
    period: Literal["week", "month", "quarter"] = Query("quarter"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    since = _period_since(period)
    user_id = current_user.id

    # Meetings scoped to current user within period
    meeting_base = select(Meeting.id).where(
        Meeting.created_by == user_id,
        Meeting.date >= since,
    )
    user_meeting_ids = meeting_base.subquery()

    total_meetings_result = await db.execute(
        select(func.count()).select_from(user_meeting_ids)
    )
    total_meetings = total_meetings_result.scalar() or 0

    # Average duration
    avg_dur_result = await db.execute(
        select(func.avg(Meeting.duration_seconds)).where(
            Meeting.created_by == user_id,
            Meeting.date >= since,
            Meeting.duration_seconds.isnot(None),
        )
    )
    avg_dur_seconds = avg_dur_result.scalar() or 0
    average_duration_minutes = round(avg_dur_seconds / 60, 1) if avg_dur_seconds else 0.0

    # Tasks scoped to user's meetings within period
    tasks_in_period = (
        select(Task.id, Task.status)
        .join(Meeting, Task.meeting_id == Meeting.id)
        .where(Meeting.created_by == user_id, Meeting.date >= since)
    ).subquery()

    total_tasks_result = await db.execute(
        select(func.count()).select_from(tasks_in_period)
    )
    total_tasks = total_tasks_result.scalar() or 0

    completed_tasks_result = await db.execute(
        select(func.count()).where(
            tasks_in_period.c.status == ItemStatus.completed
        )
    )
    completed_tasks = completed_tasks_result.scalar() or 0

    # Action items scoped to user's meetings within period
    ai_in_period = (
        select(ActionItem.id, ActionItem.status, ActionItem.priority)
        .join(Meeting, ActionItem.meeting_id == Meeting.id)
        .where(Meeting.created_by == user_id, Meeting.date >= since)
    ).subquery()

    total_action_items_result = await db.execute(
        select(func.count()).select_from(ai_in_period)
    )
    total_action_items = total_action_items_result.scalar() or 0

    completed_ai_result = await db.execute(
        select(func.count()).where(
            ai_in_period.c.status == ItemStatus.completed
        )
    )
    completed_action_items = completed_ai_result.scalar() or 0

    # Decisions scoped to user's meetings within period
    total_decisions_result = await db.execute(
        select(func.count(Decision.id))
        .join(Meeting, Decision.meeting_id == Meeting.id)
        .where(Meeting.created_by == user_id, Meeting.date >= since)
    )
    total_decisions = total_decisions_result.scalar() or 0

    # Overdue items
    overdue_result = await db.execute(
        select(func.count()).where(
            ai_in_period.c.status == ItemStatus.overdue
        )
    )
    overdue_items = overdue_result.scalar() or 0

    # Critical risks
    critical_result = await db.execute(
        select(func.count()).where(
            ai_in_period.c.priority == Priority.critical,
            ai_in_period.c.status != ItemStatus.completed,
        )
    )
    critical_risks = critical_result.scalar() or 0

    completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0.0

    return AnalyticsResponse(
        period=period,
        total_meetings=total_meetings,
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        completion_rate=round(completion_rate, 2),
        total_action_items=total_action_items,
        completed_action_items=completed_action_items,
        total_decisions=total_decisions,
        overdue_items=overdue_items,
        critical_risks=critical_risks,
        average_duration_minutes=average_duration_minutes,
    )


@router.get("/meeting-trends", response_model=MeetingTrendsResponse)
async def get_meeting_trends(
    period: Literal["week", "month", "quarter"] = Query("quarter"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    days = PERIOD_DAYS[period]
    since = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(
            func.date(Meeting.date).label("date"),
            func.count(Meeting.id).label("count"),
            func.coalesce(func.sum(Meeting.duration_seconds), 0).label("total_duration")
        )
        .where(Meeting.created_by == current_user.id, Meeting.date >= since)
        .group_by(func.date(Meeting.date))
        .order_by(func.date(Meeting.date))
    )
    rows = result.all()
    trends = [
        MeetingTrend(date=str(row.date), count=row.count, total_duration_seconds=row.total_duration)
        for row in rows
    ]
    return MeetingTrendsResponse(trends=trends)


@router.get("/team-performance", response_model=TeamPerformanceResponse)
async def get_team_performance(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    users_result = await db.execute(select(User))
    users = users_result.scalars().all()
    members = []
    for user in users:
        total = await db.execute(
            select(func.count(Task.id)).where(Task.owner_id == user.id)
        )
        total_tasks = total.scalar() or 0
        completed = await db.execute(
            select(func.count(Task.id)).where(
                Task.owner_id == user.id, Task.status == ItemStatus.completed
            )
        )
        completed_tasks = completed.scalar() or 0
        completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0.0
        score = (completion_rate * 0.6 + (100 if total_tasks > 0 else 0) * 0.4)
        members.append(ProductivityScore(
            user_id=user.id,
            user_name=user.name,
            tasks_completed=completed_tasks,
            tasks_pending=total_tasks - completed_tasks,
            completion_rate=round(completion_rate, 2),
            on_time_rate=round(completion_rate, 2),
            score=round(score, 2),
        ))
    members.sort(key=lambda m: m.score, reverse=True)
    return TeamPerformanceResponse(members=members)


@router.get("/risks")
async def get_risks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from database.crud import get_action_items
    items = await get_action_items(db, priority="critical", status="pending")
    risks = []
    for item in items:
        risks.append({
            "id": str(item.id),
            "title": item.title,
            "meeting_id": str(item.meeting_id),
            "priority": item.priority,
            "status": item.status,
            "risk_level": item.risk_level,
            "deadline": item.deadline.isoformat() if item.deadline else None,
        })
    return {"risks": risks, "total": len(risks)}


@router.get("/productivity-score")
async def get_productivity_score(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total_result = await db.execute(select(func.count(Task.id)))
    total_tasks = total_result.scalar() or 0
    completed_result = await db.execute(
        select(func.count(Task.id)).where(Task.status == ItemStatus.completed)
    )
    completed_tasks = completed_result.scalar() or 0
    completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0.0

    meetings_result = await db.execute(select(func.count(Meeting.id)))
    total_meetings = meetings_result.scalar() or 0

    ai_result = await db.execute(select(func.count(ActionItem.id)))
    total_ai = ai_result.scalar() or 0
    completed_ai_result = await db.execute(
        select(func.count(ActionItem.id)).where(ActionItem.status == ItemStatus.completed)
    )
    completed_ai = completed_ai_result.scalar() or 0
    ai_completion = (completed_ai / total_ai * 100) if total_ai > 0 else 0.0

    score = (
        completion_rate * 0.5 +
        ai_completion * 0.3 +
        min(total_meetings * 5, 20)
    )
    return {
        "overall_score": round(score, 2),
        "task_completion_rate": round(completion_rate, 2),
        "action_item_completion_rate": round(ai_completion, 2),
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "total_action_items": total_ai,
        "completed_action_items": completed_ai,
        "total_meetings": total_meetings,
    }
