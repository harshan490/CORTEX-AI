import logging
import uuid
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, Body, status
from sqlalchemy import delete as sql_delete, update as sql_update
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from database.crud import (
    create_meeting, get_meeting, get_meetings, update_meeting, delete_meeting,
    create_action_item, get_action_items, get_decisions_by_meeting,
    create_agent_log, get_agent_logs_by_meeting, create_decision,
)
from api.dependencies import get_current_user
from models.schemas import (
    MeetingCreate, MeetingResponse, MeetingUpdate,
    TranscriptUpload, TranscriptResponse,
    ActionItemCreate, ActionItemResponse,
    DecisionResponse, RiskResponse, DependencyResponse, ClarificationResponse,
)
from database.models import (
    User, MeetingStatus,
    ActionItem as ActionItemModel, Decision as DecisionModel, AgentLog,
    Participant as ParticipantModel, Risk as RiskModel,
    Dependency as DependencyModel, Clarification as ClarificationModel,
)

logger = logging.getLogger("cortex.meetings")

router = APIRouter(prefix="/api/meetings", tags=["Meetings"])

_REL_KEYS = {'participants', 'action_items', 'decisions', 'agent_logs',
             'workflow_states', 'risks', 'dependencies', 'clarifications'}


def _meeting_response(m) -> MeetingResponse:
    """Build a MeetingResponse from an eagerly-loaded Meeting ORM object."""
    fields = {k: v for k, v in m.__dict__.items() if not k.startswith('_') and k not in _REL_KEYS}
    participants = []
    if hasattr(m, 'participants'):
        for p in m.participants:
            participants.append({k: v for k, v in p.__dict__.items() if not k.startswith('_')})
    return MeetingResponse(
        **fields,
        participants=participants,
        action_item_count=len(m.action_items) if hasattr(m, 'action_items') else 0,
        decision_count=len(m.decisions) if hasattr(m, 'decisions') else 0,
        risk_count=len(m.risks) if hasattr(m, 'risks') else 0,
        dependency_count=len(m.dependencies) if hasattr(m, 'dependencies') else 0,
        clarification_count=len(m.clarifications) if hasattr(m, 'clarifications') else 0,
    )


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
    return [_meeting_response(m) for m in meetings]


@router.post("/", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED)
async def create_meeting_endpoint(
    data: MeetingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    created = await create_meeting(
        db, title=data.title, date=data.date, created_by=current_user.id,
        duration_seconds=data.duration_seconds, gcal_event_id=data.gcal_event_id,
        recording_url=data.recording_url
    )
    meeting = await get_meeting(db, created.id)
    return _meeting_response(meeting)


@router.get("/{meeting_id}", response_model=MeetingResponse)
async def get_meeting_endpoint(
    meeting_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meeting = await get_meeting(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return _meeting_response(meeting)


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
        return _meeting_response(meeting)
    updated = await update_meeting(db, meeting_id, **kwargs)

    # If meeting is being approved (status=completed), mark workflow as completed
    if kwargs.get("status") == "completed" or kwargs.get("status") == MeetingStatus.completed:
        try:
            from services.workflow_tracker import mark_completed
            await mark_completed(db, meeting_id)
        except Exception:
            pass  # Don't fail the meeting update if workflow update fails

    return _meeting_response(updated)


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
    data: Optional[TranscriptUpload] = Body(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meeting = await get_meeting(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if not data:
        raise HTTPException(status_code=400, detail="JSON body with segments is required")
    segments = data.segments
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
async def process_meeting_endpoint(
    meeting_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from services.workflow_tracker import (
        get_or_create_workflow, update_stage, mark_awaiting_review, mark_failed,
    )

    meeting = await get_meeting(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    # Reject processing if no transcript
    transcript_data = meeting.transcript or {}
    segments = transcript_data.get("segments", []) if isinstance(transcript_data, dict) else []
    if not segments:
        raise HTTPException(status_code=400, detail="Cannot process meeting without transcript segments")

    # Create or reset workflow (idempotent upsert keyed by meeting_id)
    workflow = await get_or_create_workflow(db, meeting_id)

    # Set status to processing
    await update_meeting(db, meeting_id, status=MeetingStatus.processing)

    log = await create_agent_log(db, agent_name="meeting_processor", action="process_meeting",
                                  status="started", meeting_id=meeting_id)

    try:
        # Stage: transcript_validation
        await update_stage(db, workflow.id, "transcript_validation", 10)

        from services.llm import LLMService
        llm = LLMService()

        # Stage: provider_health_check
        await update_stage(db, workflow.id, "provider_health_check", 20)

        # Build transcript text for LLM
        full_text = "\n".join(
            f"{seg.get('speaker', 'Unknown')}: {seg.get('text', '')}" for seg in segments
        )

        # Stage: intelligence_extraction
        await update_stage(db, workflow.id, "intelligence_extraction", 30)

        # Single structured extraction call
        intel = await llm.extract_meeting_intelligence(full_text)

        # Stage: result_validation
        await update_stage(db, workflow.id, "result_validation", 70)

        # Delete existing extracted data for idempotency
        await db.execute(sql_delete(ActionItemModel).where(ActionItemModel.meeting_id == meeting_id))
        await db.execute(sql_delete(DecisionModel).where(DecisionModel.meeting_id == meeting_id))
        await db.execute(sql_delete(ParticipantModel).where(ParticipantModel.meeting_id == meeting_id))
        await db.execute(sql_delete(RiskModel).where(RiskModel.meeting_id == meeting_id))
        await db.execute(sql_delete(DependencyModel).where(DependencyModel.meeting_id == meeting_id))
        await db.execute(sql_delete(ClarificationModel).where(ClarificationModel.meeting_id == meeting_id))
        await db.flush()

        # Stage: database_persistence
        await update_stage(db, workflow.id, "database_persistence", 80)

        # Persist participants (deduplicated case-insensitively)
        seen_names = set()
        for p in intel.participants:
            normalized = p.name.strip().lower()
            if normalized and normalized not in seen_names:
                seen_names.add(normalized)
                db.add(ParticipantModel(
                    meeting_id=meeting_id, name=p.name.strip(), role=p.role,
                ))
        await db.flush()

        # Persist action items
        for item in intel.action_items:
            priority = item.priority if item.priority in ('low', 'medium', 'high', 'critical') else 'medium'
            await create_action_item(
                db,
                meeting_id=meeting_id,
                title=item.title,
                description=item.description or None,
                assignee_name=item.assignee,
                priority=priority,
                evidence=item.evidence or None,
                confidence=item.confidence,
            )

        # Persist decisions
        for dec in intel.decisions:
            await create_decision(
                db,
                meeting_id=meeting_id,
                title=dec.title,
                description=dec.description or None,
                decided_by_name=dec.decided_by,
                evidence=dec.evidence or None,
                confidence=dec.confidence,
            )

        # Persist risks
        for risk in intel.risks:
            severity = risk.severity if risk.severity in ('low', 'medium', 'high', 'critical') else 'medium'
            likelihood = risk.likelihood if risk.likelihood in ('low', 'medium', 'high') else 'medium'
            db.add(RiskModel(
                meeting_id=meeting_id,
                title=risk.title,
                description=risk.description or None,
                severity=severity,
                likelihood=likelihood,
                mitigation=risk.mitigation,
                owner=risk.owner,
                evidence=risk.evidence or None,
                confidence=risk.confidence,
            ))

        # Persist dependencies
        for dep in intel.dependencies:
            db.add(DependencyModel(
                meeting_id=meeting_id,
                from_item=dep.from_item,
                to_item=dep.to_item,
                dependency_type=dep.dependency_type,
                description=dep.description or None,
            ))

        # Persist clarifications
        for clar in intel.clarifications:
            db.add(ClarificationModel(
                meeting_id=meeting_id,
                question=clar.question,
                context=clar.context or None,
                evidence=clar.evidence or None,
            ))

        await db.flush()

        # Update meeting with summary, confidence, and set to awaiting_review
        await update_meeting(
            db, meeting_id,
            summary=intel.summary,
            processing_confidence=intel.overall_confidence,
            status=MeetingStatus.awaiting_review,
        )

        # Stage: awaiting_review (terminal processing state)
        await mark_awaiting_review(db, workflow.id)

        # Update agent log
        await db.execute(
            sql_update(AgentLog).where(AgentLog.id == log.id)
            .values(status="completed", completed_at=datetime.now(timezone.utc))
        )
        await db.flush()

        # Expire session cache so re-fetch picks up all new relationships
        db.expire_all()
        updated = await get_meeting(db, meeting_id)
        return {
            "message": "Processing completed",
            "status": "awaiting_review",
            "log_id": str(log.id),
            "meeting": _meeting_response(updated).model_dump(mode='json'),
        }

    except Exception as e:
        logger.exception(f"Processing failed for meeting {meeting_id}: {e}")
        from services.llm import OllamaError, CerebrasError
        if isinstance(e, (OllamaError, CerebrasError)):
            safe_err = f"LLM processing failed: {e}"
        else:
            safe_err = "Meeting processing failed unexpectedly."
        try:
            await update_meeting(db, meeting_id, status=MeetingStatus.failed)
            await db.execute(
                sql_update(AgentLog).where(AgentLog.id == log.id)
                .values(status="failed", error=str(e), completed_at=datetime.now(timezone.utc))
            )
            await mark_failed(db, workflow.id, safe_err)
            # Explicitly commit so failure state persists (get_db would rollback on exception)
            await db.commit()
        except Exception:
            pass
        safe_msg = safe_err if isinstance(e, (OllamaError, CerebrasError)) else "Meeting processing failed. Check server logs for details."
        raise HTTPException(status_code=500, detail=safe_msg)


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


@router.get("/{meeting_id}/risks", response_model=list[RiskResponse])
async def get_meeting_risks(
    meeting_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meeting = await get_meeting(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return [RiskResponse.model_validate(r) for r in meeting.risks]


@router.get("/{meeting_id}/dependencies", response_model=list[DependencyResponse])
async def get_meeting_dependencies(
    meeting_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meeting = await get_meeting(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return [DependencyResponse.model_validate(d) for d in meeting.dependencies]


@router.get("/{meeting_id}/clarifications", response_model=list[ClarificationResponse])
async def get_meeting_clarifications(
    meeting_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meeting = await get_meeting(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return [ClarificationResponse.model_validate(c) for c in meeting.clarifications]


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
