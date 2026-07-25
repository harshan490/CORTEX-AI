import uuid
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from database.crud import (
    create_meeting, get_meeting, get_meetings, update_meeting, delete_meeting,
    create_action_item, get_action_items, get_decisions_by_meeting,
    create_agent_log, get_agent_logs_by_meeting
)
from api.dependencies import get_current_user
from models.schemas import (
    MeetingCreate, MeetingResponse, MeetingUpdate,
    TranscriptUpload, TranscriptResponse,
    ActionItemCreate, ActionItemResponse,
    DecisionResponse
)
from database.models import User, MeetingStatus

router = APIRouter(prefix="/api/meetings", tags=["Meetings"])


@router.get("/")
async def list_meetings(
    status: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    status_enum = None
    if status:
        try:
            status_enum = MeetingStatus(status)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")
    meetings = await get_meetings(db, status=status_enum, date_from=date_from, date_to=date_to, skip=skip, limit=limit)
    return [
        MeetingResponse(
            **m.__dict__,
            participants=[p.__dict__ for p in m.participants] if hasattr(m, 'participants') else [],
            action_item_count=len(m.action_items) if hasattr(m, 'action_items') else 0,
            decision_count=len(m.decisions) if hasattr(m, 'decisions') else 0,
        ) for m in meetings
    ]


@router.post("/", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED)
async def create_meeting_endpoint(
    data: MeetingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meeting = await create_meeting(
        db, title=data.title, date=data.date, created_by=current_user.id,
        duration_seconds=data.duration_seconds, gcal_event_id=data.gcal_event_id,
        recording_url=data.recording_url
    )
    return MeetingResponse.model_validate(meeting)


@router.get("/{meeting_id}", response_model=MeetingResponse)
async def get_meeting_endpoint(
    meeting_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meeting = await get_meeting(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return MeetingResponse(
        **meeting.__dict__,
        participants=[p.__dict__ for p in meeting.participants],
        action_item_count=len(meeting.action_items),
        decision_count=len(meeting.decisions),
    )


@router.put("/{meeting_id}", response_model=MeetingResponse)
async def update_meeting_endpoint(
    meeting_id: uuid.UUID,
    data: MeetingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meeting = await get_meeting(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    kwargs = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    if not kwargs:
        return MeetingResponse.model_validate(meeting)
    updated = await update_meeting(db, meeting_id, **kwargs)
    return MeetingResponse.model_validate(updated)


@router.delete("/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_meeting_endpoint(
    meeting_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deleted = await delete_meeting(db, meeting_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Meeting not found")


@router.post("/{meeting_id}/transcript", response_model=TranscriptResponse)
async def upload_transcript(
    meeting_id: uuid.UUID,
    data: Optional[TranscriptUpload] = None,
    file: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meeting = await get_meeting(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if file:
        import json
        content = await file.read()
        segments = json.loads(content) if isinstance(content, bytes) else content
        if isinstance(segments, dict) and "segments" in segments:
            segments = segments["segments"]
    elif data:
        segments = data.segments
    else:
        raise HTTPException(status_code=400, detail="Either JSON body or file is required")
    await update_meeting(db, meeting_id, transcript={"segments": segments})
    return TranscriptResponse(meeting_id=meeting_id, segments=segments)


@router.get("/{meeting_id}/transcript")
async def get_transcript(
    meeting_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meeting = await get_meeting(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if not meeting.transcript:
        return {"segments": []}
    return {"meeting_id": str(meeting_id), "segments": meeting.transcript.get("segments", [])}


@router.post("/{meeting_id}/process")
async def process_meeting(
    meeting_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meeting = await get_meeting(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    log = await create_agent_log(db, agent_name="meeting_processor", action="process_meeting",
                                  status="started", meeting_id=meeting_id)
    return {"message": "Processing started", "log_id": str(log.id)}


@router.get("/{meeting_id}/action-items", response_model=list[ActionItemResponse])
async def get_meeting_action_items(
    meeting_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = await get_action_items(db, meeting_id=meeting_id)
    return [ActionItemResponse.model_validate(i) for i in items]


@router.get("/{meeting_id}/decisions", response_model=list[DecisionResponse])
async def get_meeting_decisions(
    meeting_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    decisions = await get_decisions_by_meeting(db, meeting_id)
    return [DecisionResponse.model_validate(d) for d in decisions]


@router.get("/{meeting_id}/timeline")
async def get_meeting_timeline(
    meeting_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    logs = await get_agent_logs_by_meeting(db, meeting_id)
    return [
        {
            "agent": log.agent_name,
            "action": log.action,
            "status": log.status,
            "started_at": log.started_at.isoformat() if log.started_at else None,
            "completed_at": log.completed_at.isoformat() if log.completed_at else None,
        }
        for log in logs
    ]


@router.get("/{meeting_id}/insights")
async def get_meeting_insights(
    meeting_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meeting = await get_meeting(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    participants = meeting.participants if hasattr(meeting, 'participants') else []
    total_speaking = sum(p.speaking_time_seconds for p in participants)
    return {
        "meeting_id": str(meeting_id),
        "duration_seconds": meeting.duration_seconds,
        "participant_count": len(participants),
        "total_speaking_time_seconds": total_speaking,
        "action_item_count": len(meeting.action_items) if hasattr(meeting, 'action_items') else 0,
        "decision_count": len(meeting.decisions) if hasattr(meeting, 'decisions') else 0,
    }
