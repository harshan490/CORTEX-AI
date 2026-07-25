from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from database import get_db
from database.crud import get_agent_logs_by_meeting
from api.dependencies import get_current_user
from models.schemas import AgentStatusResponse, AgentLogResponse, WorkflowStateResponse
from database.models import User, AgentLog, WorkflowState
import uuid

router = APIRouter(prefix="/api/agents", tags=["Agents"])

AGENTS = [
    "supervisor", "meeting_intelligence", "memory",
    "planner", "action_item", "verifier",
    "reflection", "tool_execution", "reminder",
    "analytics"
]


@router.get("/", response_model=list[AgentStatusResponse])
async def list_agents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    statuses = []
    for name in AGENTS:
        result = await db.execute(
            select(AgentLog)
            .where(AgentLog.agent_name == name)
            .order_by(AgentLog.started_at.desc())
            .limit(1)
        )
        last_log = result.scalar_one_or_none()
        statuses.append(AgentStatusResponse(
            name=name,
            status=last_log.status if last_log else "idle",
            last_run=last_log.started_at if last_log else None,
            last_result=str(last_log.result) if last_log and last_log.result else None,
        ))
    return statuses


@router.get("/{name}", response_model=AgentStatusResponse)
async def get_agent(
    name: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if name not in AGENTS:
        raise HTTPException(status_code=404, detail=f"Agent '{name}' not found")
    result = await db.execute(
        select(AgentLog)
        .where(AgentLog.agent_name == name)
        .order_by(AgentLog.started_at.desc())
        .limit(1)
    )
    last_log = result.scalar_one_or_none()
    return AgentStatusResponse(
        name=name,
        status=last_log.status if last_log else "idle",
        last_run=last_log.started_at if last_log else None,
        last_result=str(last_log.result) if last_log and last_log.result else None,
    )


@router.post("/{name}/run")
async def run_agent(
    name: str,
    meeting_id: Optional[uuid.UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if name not in AGENTS:
        raise HTTPException(status_code=404, detail=f"Agent '{name}' not found")
    from database.crud import create_agent_log
    log = await create_agent_log(db, agent_name=name, action=f"run_{name}",
                                  status="started", meeting_id=meeting_id)
    return {
        "message": f"Agent '{name}' execution triggered",
        "log_id": str(log.id),
        "status": "started"
    }


@router.get("/logs", response_model=list[AgentLogResponse])
async def get_logs(
    agent_name: Optional[str] = Query(None),
    meeting_id: Optional[uuid.UUID] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(AgentLog).order_by(AgentLog.started_at.desc())
    if agent_name:
        query = query.where(AgentLog.agent_name == agent_name)
    if meeting_id:
        query = query.where(AgentLog.meeting_id == meeting_id)
    query = query.offset(skip).limit(limit)
    rows = (await db.execute(query)).scalars().all()
    return [AgentLogResponse.model_validate(r) for r in rows]


@router.get("/workflows", response_model=list[WorkflowStateResponse])
async def get_workflows(
    meeting_id: Optional[uuid.UUID] = Query(None),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(WorkflowState).order_by(WorkflowState.updated_at.desc())
    if meeting_id:
        query = query.where(WorkflowState.meeting_id == meeting_id)
    if status:
        query = query.where(WorkflowState.status == status)
    rows = (await db.execute(query)).scalars().all()
    return [WorkflowStateResponse.model_validate(r) for r in rows]
