import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import select, update, delete, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from database.models import (
    User, Meeting, Participant, ActionItem, Decision, Task, Reminder,
    AgentLog, OrganizationMemory, WorkflowState, MeetingStatus, ItemStatus,
    Risk, Dependency, Clarification,
)


# ── User ─────────────────────────────────────────────────────────────────────

async def create_user(db: AsyncSession, email: str, name: str, hashed_password: Optional[str] = None,
                      google_id: Optional[str] = None, avatar_url: Optional[str] = None) -> User:
    user = User(
        email=email, name=name, hashed_password=hashed_password,
        google_id=google_id, avatar_url=avatar_url
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


async def get_user(db: AsyncSession, user_id: uuid.UUID) -> Optional[User]:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_by_google_id(db: AsyncSession, google_id: str) -> Optional[User]:
    result = await db.execute(select(User).where(User.google_id == google_id))
    return result.scalar_one_or_none()


async def update_user(db: AsyncSession, user_id: uuid.UUID, **kwargs) -> Optional[User]:
    kwargs["updated_at"] = datetime.now(timezone.utc)
    await db.execute(update(User).where(User.id == user_id).values(**kwargs))
    await db.flush()
    return await get_user(db, user_id)


# ── Meeting ──────────────────────────────────────────────────────────────────

async def create_meeting(db: AsyncSession, title: str, date: datetime, created_by: uuid.UUID,
                         duration_seconds: Optional[int] = None,
                         gcal_event_id: Optional[str] = None,
                         recording_url: Optional[str] = None) -> Meeting:
    meeting = Meeting(
        title=title, date=date, created_by=created_by,
        duration_seconds=duration_seconds, gcal_event_id=gcal_event_id,
        recording_url=recording_url
    )
    db.add(meeting)
    await db.flush()
    await db.refresh(meeting)
    return meeting


async def get_meeting(db: AsyncSession, meeting_id: uuid.UUID) -> Optional[Meeting]:
    result = await db.execute(
        select(Meeting)
        .options(selectinload(Meeting.participants), selectinload(Meeting.action_items),
                 selectinload(Meeting.decisions), selectinload(Meeting.agent_logs),
                 selectinload(Meeting.risks), selectinload(Meeting.dependencies),
                 selectinload(Meeting.clarifications))
        .where(Meeting.id == meeting_id)
    )
    return result.scalar_one_or_none()


async def get_meetings(db: AsyncSession, status: Optional[MeetingStatus] = None,
                        date_from: Optional[datetime] = None, date_to: Optional[datetime] = None,
                        user_id: Optional[uuid.UUID] = None,
                        skip: int = 0, limit: int = 50) -> List[Meeting]:
    conditions = []
    if status:
        conditions.append(Meeting.status == status)
    if date_from:
        conditions.append(Meeting.date >= date_from)
    if date_to:
        conditions.append(Meeting.date <= date_to)
    if user_id:
        conditions.append(Meeting.created_by == user_id)
    query = (
        select(Meeting)
        .options(selectinload(Meeting.participants), selectinload(Meeting.action_items),
                 selectinload(Meeting.decisions), selectinload(Meeting.agent_logs),
                 selectinload(Meeting.risks), selectinload(Meeting.dependencies),
                 selectinload(Meeting.clarifications))
        .order_by(Meeting.date.desc())
    )
    if conditions:
        query = query.where(and_(*conditions))
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def update_meeting(db: AsyncSession, meeting_id: uuid.UUID, **kwargs) -> Optional[Meeting]:
    kwargs["updated_at"] = datetime.now(timezone.utc)
    await db.execute(update(Meeting).where(Meeting.id == meeting_id).values(**kwargs))
    await db.flush()
    return await get_meeting(db, meeting_id)


async def delete_meeting(db: AsyncSession, meeting_id: uuid.UUID) -> bool:
    result = await db.execute(delete(Meeting).where(Meeting.id == meeting_id))
    await db.flush()
    return result.rowcount > 0


# ── Action Item ──────────────────────────────────────────────────────────────

async def create_action_item(db: AsyncSession, meeting_id: uuid.UUID, title: str,
                              owner_id: Optional[uuid.UUID] = None, **kwargs) -> ActionItem:
    item = ActionItem(meeting_id=meeting_id, title=title, owner_id=owner_id, **kwargs)
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return item


async def get_action_item(db: AsyncSession, item_id: uuid.UUID) -> Optional[ActionItem]:
    result = await db.execute(select(ActionItem).where(ActionItem.id == item_id))
    return result.scalar_one_or_none()


async def get_action_items(db: AsyncSession, meeting_id: Optional[uuid.UUID] = None,
                            owner_id: Optional[uuid.UUID] = None,
                            status: Optional[ItemStatus] = None,
                            priority: Optional[str] = None,
                            skip: int = 0, limit: int = 100) -> List[ActionItem]:
    conditions = []
    if meeting_id:
        conditions.append(ActionItem.meeting_id == meeting_id)
    if owner_id:
        conditions.append(ActionItem.owner_id == owner_id)
    if status:
        conditions.append(ActionItem.status == status)
    if priority:
        conditions.append(ActionItem.priority == priority)
    query = select(ActionItem).order_by(ActionItem.created_at.desc())
    if conditions:
        query = query.where(and_(*conditions))
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def update_action_item(db: AsyncSession, item_id: uuid.UUID, **kwargs) -> Optional[ActionItem]:
    kwargs["updated_at"] = datetime.now(timezone.utc)
    await db.execute(update(ActionItem).where(ActionItem.id == item_id).values(**kwargs))
    await db.flush()
    return await get_action_item(db, item_id)


async def delete_action_item(db: AsyncSession, item_id: uuid.UUID) -> bool:
    result = await db.execute(delete(ActionItem).where(ActionItem.id == item_id))
    await db.flush()
    return result.rowcount > 0


# ── Decision ─────────────────────────────────────────────────────────────────

async def create_decision(db: AsyncSession, meeting_id: uuid.UUID, title: str,
                           made_by: Optional[uuid.UUID] = None, **kwargs) -> Decision:
    decision = Decision(meeting_id=meeting_id, title=title, made_by=made_by, **kwargs)
    db.add(decision)
    await db.flush()
    await db.refresh(decision)
    return decision


async def get_decisions_by_meeting(db: AsyncSession, meeting_id: uuid.UUID) -> List[Decision]:
    result = await db.execute(
        select(Decision).where(Decision.meeting_id == meeting_id).order_by(Decision.timestamp)
    )
    return list(result.scalars().all())


# ── Task ─────────────────────────────────────────────────────────────────────

async def create_task(db: AsyncSession, title: str, owner_id: Optional[uuid.UUID] = None,
                       meeting_id: Optional[uuid.UUID] = None, **kwargs) -> Task:
    task = Task(title=title, owner_id=owner_id, meeting_id=meeting_id, **kwargs)
    db.add(task)
    await db.flush()
    await db.refresh(task)
    return task


async def get_tasks(db: AsyncSession, status: Optional[ItemStatus] = None,
                     priority: Optional[str] = None,
                     owner_id: Optional[uuid.UUID] = None,
                     meeting_id: Optional[uuid.UUID] = None,
                     skip: int = 0, limit: int = 100) -> List[Task]:
    conditions = []
    if status:
        conditions.append(Task.status == status)
    if priority:
        conditions.append(Task.priority == priority)
    if owner_id:
        conditions.append(Task.owner_id == owner_id)
    if meeting_id:
        conditions.append(Task.meeting_id == meeting_id)
    query = select(Task).order_by(Task.created_at.desc())
    if conditions:
        query = query.where(and_(*conditions))
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_task(db: AsyncSession, task_id: uuid.UUID) -> Optional[Task]:
    result = await db.execute(select(Task).where(Task.id == task_id))
    return result.scalar_one_or_none()


async def update_task(db: AsyncSession, task_id: uuid.UUID, **kwargs) -> Optional[Task]:
    kwargs["updated_at"] = datetime.now(timezone.utc)
    await db.execute(update(Task).where(Task.id == task_id).values(**kwargs))
    await db.flush()
    return await get_task(db, task_id)


async def delete_task(db: AsyncSession, task_id: uuid.UUID) -> bool:
    result = await db.execute(delete(Task).where(Task.id == task_id))
    await db.flush()
    return result.rowcount > 0


# ── Reminder ─────────────────────────────────────────────────────────────────

async def create_reminder(db: AsyncSession, task_id: uuid.UUID, recipient_id: uuid.UUID,
                           scheduled_for: datetime, **kwargs) -> Reminder:
    reminder = Reminder(task_id=task_id, recipient_id=recipient_id, scheduled_for=scheduled_for, **kwargs)
    db.add(reminder)
    await db.flush()
    await db.refresh(reminder)
    return reminder


async def get_pending_reminders(db: AsyncSession) -> List[Reminder]:
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(Reminder).where(
            and_(Reminder.status == "pending", Reminder.scheduled_for <= now)
        )
    )
    return list(result.scalars().all())


# ── Agent Log ────────────────────────────────────────────────────────────────

async def create_agent_log(db: AsyncSession, agent_name: str, action: str, status: str,
                            meeting_id: Optional[uuid.UUID] = None, **kwargs) -> AgentLog:
    log = AgentLog(agent_name=agent_name, action=action, status=status, meeting_id=meeting_id, **kwargs)
    db.add(log)
    await db.flush()
    await db.refresh(log)
    return log


async def get_agent_logs_by_meeting(db: AsyncSession, meeting_id: uuid.UUID) -> List[AgentLog]:
    result = await db.execute(
        select(AgentLog).where(AgentLog.meeting_id == meeting_id).order_by(AgentLog.started_at)
    )
    return list(result.scalars().all())


# ── Organization Memory ──────────────────────────────────────────────────────

async def create_memory(db: AsyncSession, key: str, content: dict,
                         source_type: Optional[str] = None,
                         source_id: Optional[str] = None,
                         embedding: Optional[list] = None) -> OrganizationMemory:
    memory = OrganizationMemory(key=key, content=content, source_type=source_type,
                                 source_id=source_id, embedding=embedding)
    db.add(memory)
    await db.flush()
    await db.refresh(memory)
    return memory


async def search_memory(db: AsyncSession, query_text: str, limit: int = 10) -> List[OrganizationMemory]:
    result = await db.execute(
        select(OrganizationMemory).order_by(OrganizationMemory.created_at.desc()).limit(limit)
    )
    return list(result.scalars().all())
