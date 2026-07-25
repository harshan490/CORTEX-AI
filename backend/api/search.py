from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_
from database import get_db
from api.dependencies import get_current_user
from models.schemas import SearchResult, SearchResponse
from database.models import User, Meeting, Decision, Task, ActionItem
import uuid

router = APIRouter(prefix="/api/search", tags=["Search"])


@router.get("/", response_model=SearchResponse)
async def search(
    q: str = Query(..., min_length=1, max_length=500),
    type: Optional[str] = Query(None, description="meeting, decision, task, action_item"),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    results = []
    search_pattern = f"%{q}%"

    types_to_search = [type] if type else ["meeting", "decision", "task", "action_item"]

    if "meeting" in types_to_search:
        query = select(Meeting).where(
            or_(Meeting.title.ilike(search_pattern), Meeting.summary.ilike(search_pattern))
        )
        if date_from:
            query = query.where(Meeting.date >= date_from)
        if date_to:
            query = query.where(Meeting.date <= date_to)
        query = query.order_by(Meeting.date.desc()).limit(limit)
        rows = (await db.execute(query)).scalars().all()
        for r in rows:
            results.append(SearchResult(
                id=r.id, type="meeting", title=r.title,
                snippet=(r.summary or "")[:200], score=1.0,
                created_at=r.created_at,
            ))

    if "decision" in types_to_search:
        query = select(Decision).where(
            or_(Decision.title.ilike(search_pattern), Decision.description.ilike(search_pattern))
        )
        if date_from:
            query = query.where(Decision.timestamp >= date_from)
        if date_to:
            query = query.where(Decision.timestamp <= date_to)
        query = query.order_by(Decision.timestamp.desc()).limit(limit)
        rows = (await db.execute(query)).scalars().all()
        for r in rows:
            results.append(SearchResult(
                id=r.id, type="decision", title=r.title,
                snippet=(r.description or "")[:200], score=0.9,
                created_at=r.timestamp,
            ))

    if "task" in types_to_search:
        query = select(Task).where(
            or_(Task.title.ilike(search_pattern), Task.description.ilike(search_pattern))
        )
        if date_from:
            query = query.where(Task.created_at >= date_from)
        if date_to:
            query = query.where(Task.created_at <= date_to)
        query = query.order_by(Task.created_at.desc()).limit(limit)
        rows = (await db.execute(query)).scalars().all()
        for r in rows:
            results.append(SearchResult(
                id=r.id, type="task", title=r.title,
                snippet=(r.description or "")[:200], score=0.8,
                created_at=r.created_at,
            ))

    if "action_item" in types_to_search:
        query = select(ActionItem).where(
            or_(ActionItem.title.ilike(search_pattern), ActionItem.description.ilike(search_pattern))
        )
        if date_from:
            query = query.where(ActionItem.created_at >= date_from)
        if date_to:
            query = query.where(ActionItem.created_at <= date_to)
        query = query.order_by(ActionItem.created_at.desc()).limit(limit)
        rows = (await db.execute(query)).scalars().all()
        for r in rows:
            results.append(SearchResult(
                id=r.id, type="action_item", title=r.title,
                snippet=(r.description or "")[:200], score=0.85,
                created_at=r.created_at,
            ))

    results.sort(key=lambda r: r.score, reverse=True)
    total = len(results)
    paginated = results[skip:skip + limit]

    return SearchResponse(results=paginated, total=total)


_recent_searches: list[str] = []


@router.get("/recent-searches")
async def get_recent_searches(
    current_user: User = Depends(get_current_user),
):
    return {"recent_searches": _recent_searches[-20:]}
