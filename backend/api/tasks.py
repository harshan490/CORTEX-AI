import uuid
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from database.crud import create_task, get_tasks, get_task, update_task, delete_task, create_reminder
from api.dependencies import get_current_user
from models.schemas import TaskCreate, TaskResponse, TaskUpdate, ReminderCreate, ReminderResponse
from database.models import User, ItemStatus

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])


@router.get("/", response_model=list[TaskResponse])
async def list_tasks(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    owner_id: Optional[uuid.UUID] = Query(None),
    meeting_id: Optional[uuid.UUID] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    status_enum = None
    if status:
        try:
            status_enum = ItemStatus(status)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")
    tasks = await get_tasks(db, status=status_enum, priority=priority,
                             owner_id=owner_id, meeting_id=meeting_id,
                             skip=skip, limit=limit)
    return [TaskResponse.model_validate(t) for t in tasks]


@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task_endpoint(
    data: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = await create_task(
        db, title=data.title, owner_id=data.owner_id or current_user.id,
        meeting_id=data.meeting_id, description=data.description,
        priority=data.priority, deadline=data.deadline,
        source=data.source, external_id=data.external_id,
        external_type=data.external_type
    )
    return TaskResponse.model_validate(task)


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task_endpoint(
    task_id: uuid.UUID,
    data: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = await get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    kwargs = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    if not kwargs:
        return TaskResponse.model_validate(task)
    updated = await update_task(db, task_id, **kwargs)
    return TaskResponse.model_validate(updated)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task_endpoint(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deleted = await delete_task(db, task_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Task not found")


@router.post("/{task_id}/complete", response_model=TaskResponse)
async def complete_task(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = await get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    updated = await update_task(db, task_id, status=ItemStatus.completed)
    return TaskResponse.model_validate(updated)


@router.post("/{task_id}/remind", response_model=ReminderResponse)
async def remind_task(
    task_id: uuid.UUID,
    data: ReminderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = await get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    reminder = await create_reminder(db, task_id=task_id, recipient_id=current_user.id,
                                      scheduled_for=data.scheduled_for,
                                      type=data.type, message=data.message)
    return ReminderResponse.model_validate(reminder)
