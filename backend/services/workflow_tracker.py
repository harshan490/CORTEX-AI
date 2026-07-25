"""WorkflowState tracking for meeting processing pipelines."""
import uuid
import logging
from datetime import datetime, timezone
from sqlalchemy import select, update as sql_update
from sqlalchemy.ext.asyncio import AsyncSession
from database.models import WorkflowState

logger = logging.getLogger("cortex.workflow")

# Stage definitions with progress values
STAGES = [
    ("transcript_received", 5),
    ("transcript_validation", 10),
    ("provider_health_check", 20),
    ("intelligence_extraction", 30),
    ("participant_extraction", 50),
    ("action_item_extraction", 55),
    ("decision_extraction", 60),
    ("risk_extraction", 63),
    ("dependency_extraction", 66),
    ("clarification_generation", 70),
    ("result_validation", 80),
    ("database_persistence", 90),
    ("awaiting_review", 95),
    ("completed", 100),
]


async def get_or_create_workflow(
    db: AsyncSession, meeting_id: uuid.UUID
) -> WorkflowState:
    """Get existing workflow for meeting, or create one. Handles reprocessing."""
    result = await db.execute(
        select(WorkflowState).where(WorkflowState.meeting_id == meeting_id)
    )
    workflow = result.scalar_one_or_none()

    if workflow is None:
        workflow = WorkflowState(
            meeting_id=meeting_id,
            current_step="transcript_received",
            status="processing",
            progress=5,
            attempt=1,
            started_at=datetime.now(timezone.utc),
        )
        db.add(workflow)
        await db.flush()
        await db.refresh(workflow)
        return workflow

    # Reprocessing: increment attempt, reset state
    workflow.attempt += 1
    workflow.status = "processing"
    workflow.current_step = "transcript_received"
    workflow.progress = 5
    workflow.error = None
    workflow.completed_at = None
    workflow.started_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(workflow)
    return workflow


async def update_stage(
    db: AsyncSession,
    workflow_id: uuid.UUID,
    stage: str,
    progress: int,
) -> None:
    """Update workflow to a new stage with monotonic progress."""
    await db.execute(
        sql_update(WorkflowState)
        .where(WorkflowState.id == workflow_id)
        .values(
            current_step=stage,
            progress=progress,
            updated_at=datetime.now(timezone.utc),
        )
    )
    await db.flush()


async def mark_awaiting_review(
    db: AsyncSession, workflow_id: uuid.UUID
) -> None:
    """Mark workflow as awaiting review (terminal for processing, not complete)."""
    await db.execute(
        sql_update(WorkflowState)
        .where(WorkflowState.id == workflow_id)
        .values(
            status="awaiting_review",
            current_step="awaiting_review",
            progress=95,
            updated_at=datetime.now(timezone.utc),
        )
    )
    await db.flush()


async def mark_completed(
    db: AsyncSession, meeting_id: uuid.UUID
) -> None:
    """Mark workflow as completed (after approval)."""
    await db.execute(
        sql_update(WorkflowState)
        .where(WorkflowState.meeting_id == meeting_id)
        .values(
            status="completed",
            current_step="completed",
            progress=100,
            completed_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
    )
    await db.flush()


async def mark_failed(
    db: AsyncSession,
    workflow_id: uuid.UUID,
    error_message: str,
) -> None:
    """Mark workflow as failed, preserving the last successful stage."""
    await db.execute(
        sql_update(WorkflowState)
        .where(WorkflowState.id == workflow_id)
        .values(
            status="failed",
            error=error_message[:500],  # Truncate to prevent huge errors
            completed_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
    )
    await db.flush()
