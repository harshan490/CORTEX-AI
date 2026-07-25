import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional

from agents.base_agent import AgentContext, AgentResult
from agents.workflow import WorkflowGraph, WorkflowState, WorkflowStatus
from config import settings
from database import crud

logger = logging.getLogger("cortex.workflows.meeting")

ProgressCallback = Callable[[str, str, float], None]


class MeetingWorkflowError(Exception):
    pass


class MeetingWorkflowConfig:
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        config = config or {}
        self.enable_transcription = config.get("enable_transcription", True)
        self.enable_diarization = config.get("enable_diarization", True)
        self.enable_memory_retrieval = config.get("enable_memory_retrieval", True)
        self.enable_action_extraction = config.get("enable_action_extraction", True)
        self.enable_verification = config.get("enable_verification", True)
        self.enable_reflection = config.get("enable_reflection", True)
        self.enable_notifications = config.get("enable_notifications", True)
        self.enable_tool_execution = config.get("enable_tool_execution", True)
        self.max_retries_per_step = config.get("max_retries_per_step", 3)
        self.timeout_seconds = config.get("timeout_seconds", 600)
        self.webhook_url = config.get("webhook_url")
        self.send_webhooks = config.get("send_webhooks", False)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "enable_transcription": self.enable_transcription,
            "enable_diarization": self.enable_diarization,
            "enable_memory_retrieval": self.enable_memory_retrieval,
            "enable_action_extraction": self.enable_action_extraction,
            "enable_verification": self.enable_verification,
            "enable_reflection": self.enable_reflection,
            "enable_notifications": self.enable_notifications,
            "enable_tool_execution": self.enable_tool_execution,
            "max_retries_per_step": self.max_retries_per_step,
            "timeout_seconds": self.timeout_seconds,
        }


class MeetingWorkflowState:
    def __init__(self, meeting_id: str, config: MeetingWorkflowConfig):
        self.meeting_id = meeting_id
        self.config = config
        self.state_id = str(uuid.uuid4())
        self.status = "pending"
        self.current_step = ""
        self.steps: List[Dict[str, Any]] = []
        self.results: Dict[str, Any] = {}
        self.errors: List[Dict[str, Any]] = []
        self.start_time: Optional[datetime] = None
        self.end_time: Optional[datetime] = None
        self.meeting_data: Optional[Dict] = None
        self.db_session = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "state_id": self.state_id,
            "meeting_id": self.meeting_id,
            "status": self.status,
            "current_step": self.current_step,
            "steps": self.steps,
            "results": self.results,
            "errors": self.errors,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
        }


async def run_meeting_workflow(
    meeting_id: str,
    config: Optional[Dict[str, Any]] = None,
    db_session=None,
    progress_callback: Optional[ProgressCallback] = None,
) -> Dict[str, Any]:
    workflow_config = MeetingWorkflowConfig(config)
    state = MeetingWorkflowState(meeting_id, workflow_config)
    state.start_time = datetime.now(timezone.utc)
    state.status = "running"
    state.db_session = db_session

    logger.info(f"Meeting workflow started: {meeting_id} (state={state.state_id})")

    try:
        meeting = None
        if db_session:
            meeting_id_uuid = uuid.UUID(meeting_id) if isinstance(meeting_id, str) else meeting_id
            meeting = await crud.get_meeting(db_session, meeting_id_uuid)
            if meeting:
                state.meeting_data = {
                    "title": meeting.title,
                    "date": meeting.date.isoformat() if meeting.date else None,
                    "duration_seconds": meeting.duration_seconds,
                    "status": meeting.status.value if hasattr(meeting.status, "value") else meeting.status,
                    "transcript": meeting.transcript,
                    "participants": [{"name": p.name, "role": p.role} for p in (meeting.participants or [])],
                }
                await _log_step(state, db_session, "load_meeting", "completed")
                await _trigger_webhook(state, "meeting.loaded")
                _notify_progress(progress_callback, "load_meeting", "completed", 0.05)

        if not state.meeting_data:
            state.meeting_data = {"meeting_id": meeting_id, "loaded_via": "id_only"}

        if workflow_config.enable_transcription:
            await _run_step(state, "transcription", _transcribe_meeting, progress_callback)
        else:
            _notify_progress(progress_callback, "transcription", "skipped", 0.15)

        _notify_progress(progress_callback, "workflow_graph", "starting", 0.20)
        try:
            agent_config = _build_agent_config(workflow_config, state)
            graph = WorkflowGraph(config=agent_config)

            meeting_data = state.meeting_data or {}
            agent_meeting_data = {
                "transcript": (state.results.get("transcription") or {}).get("full_text", ""),
                "participants": meeting_data.get("participants", []),
                "metadata": {
                    "title": meeting_data.get("title", "Untitled Meeting"),
                    "date": str(meeting_data.get("date", "")),
                    "duration_minutes": (
                        (meeting_data.get("duration_seconds") or 0) // 60
                        if meeting_data.get("duration_seconds")
                        else 30
                    ),
                },
            }

            workflow_state = await graph.execute(
                meeting_id=meeting_id,
                meeting_data=agent_meeting_data,
            )
            _merge_workflow_results(state, workflow_state)
            _notify_progress(progress_callback, "workflow_graph", "completed", 0.75)

            await _log_step(state, db_session, "agent_workflow", "completed")
        except ImportError as e:
            logger.warning(f"Agent workflow module unavailable: {e}")
            await _log_step(state, db_session, "agent_workflow", "skipped", error=str(e))
            _notify_progress(progress_callback, "workflow_graph", "skipped", 0.75)
        except Exception as e:
            logger.exception(f"Agent workflow failed: {e}")
            await _log_step(state, db_session, "agent_workflow", "failed", error=str(e))
            _notify_progress(progress_callback, "workflow_graph", "failed", 0.75)

        if workflow_config.enable_tool_execution:
            await _run_step(state, "tool_execution", _execute_tools, progress_callback)
        else:
            _notify_progress(progress_callback, "tool_execution", "skipped", 0.85)

        if workflow_config.enable_notifications:
            await _run_step(state, "notifications", _send_notifications, progress_callback)
        else:
            _notify_progress(progress_callback, "notifications", "skipped", 0.95)

        await _run_step(state, "persistence", _persist_results, progress_callback, db_session=db_session)

        state.status = "completed" if not state.errors else "completed_with_errors"
        state.end_time = datetime.now(timezone.utc)

        if state.status == "completed":
            logger.info(f"Meeting workflow completed successfully: {meeting_id}")
        else:
            logger.warning(f"Meeting workflow completed with errors: {meeting_id} - {state.errors}")

        await _log_step(state, db_session, "workflow_complete", state.status)
        await _trigger_webhook(state, f"meeting.{state.status}")

    except Exception as e:
        state.status = "failed"
        state.end_time = datetime.now(timezone.utc)
        state.errors.append({"step": "workflow", "error": str(e)})
        logger.exception(f"Meeting workflow failed: {meeting_id}")
        await _log_step(state, db_session, "workflow", "failed", error=str(e))
        await _trigger_webhook(state, "meeting.failed")

    if db_session and meeting:
        try:
            from database.models import MeetingStatus
            status_map = {
                "completed": MeetingStatus.completed,
                "completed_with_errors": MeetingStatus.completed,
                "failed": MeetingStatus.completed,
            }
            await crud.update_meeting(
                db_session,
                meeting.id,
                status=status_map.get(state.status, MeetingStatus.completed),
            )
        except Exception as e:
            logger.error(f"Failed to update meeting status: {e}")

    _notify_progress(progress_callback, "workflow", state.status, 1.0)

    return state.to_dict()


async def _run_step(
    state: MeetingWorkflowState,
    step_name: str,
    step_func: Callable,
    progress_callback: Optional[ProgressCallback],
    **extra_kwargs,
):
    state.current_step = step_name
    _notify_progress(progress_callback, step_name, "started", 0.0)

    try:
        for attempt in range(state.config.max_retries_per_step):
            try:
                result = await asyncio.wait_for(
                    step_func(state, **extra_kwargs),
                    timeout=state.config.timeout_seconds,
                )
                state.results[step_name] = result
                state.steps.append({
                    "step": step_name,
                    "status": "completed",
                    "attempt": attempt + 1,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
                _notify_progress(progress_callback, step_name, "completed", 1.0)
                await _log_step(state, state.db_session, step_name, "completed")
                return
            except asyncio.TimeoutError:
                logger.warning(f"Step '{step_name}' timed out (attempt {attempt + 1})")
                if attempt < state.config.max_retries_per_step - 1:
                    await asyncio.sleep(2 ** attempt)
                else:
                    raise

        raise RuntimeError(f"Step '{step_name}' exhausted retries")

    except Exception as e:
        logger.exception(f"Step '{step_name}' failed")
        state.errors.append({"step": step_name, "error": str(e)})
        state.steps.append({
            "step": step_name,
            "status": "failed",
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        _notify_progress(progress_callback, step_name, "failed", 1.0)
        await _log_step(state, state.db_session, step_name, "failed", error=str(e))


async def _transcribe_meeting(state: MeetingWorkflowState) -> Dict:
    from services.transcription import TranscriptionService

    service = TranscriptionService()
    meeting_data = state.meeting_data or {}

    recording_url = meeting_data.get("recording_url") or meeting_data.get("transcript")
    if isinstance(recording_url, dict):
        return recording_url

    if recording_url:
        if recording_url.startswith(("http://", "https://")):
            return await service.transcribe_from_url(recording_url)
        return await service.transcribe_audio(recording_url)

    return {"status": "skipped", "reason": "No audio source"}


async def _execute_tools(state: MeetingWorkflowState) -> Dict[str, Any]:
    from tools.registry import get_tool_registry

    registry = get_tool_registry()
    execution_results = {}

    results = state.results.get("workflow_graph", {})
    action_items = results.get("action_items", []) if isinstance(results, dict) else []
    decisions = results.get("decisions", []) if isinstance(results, dict) else []

    if action_items and registry.is_tool_available("jira"):
        try:
            jira = registry.get_tool("jira")
            for item in action_items[:5]:
                issue = await jira.create_issue(
                    project="CORTEX",
                    summary=item.get("task", item.get("title", "Action item")),
                    description=item.get("description", ""),
                    assignee=item.get("assignee"),
                    priority=item.get("priority", "Medium"),
                )
                execution_results.setdefault("jira_issues", []).append(issue)
        except Exception as e:
            logger.warning(f"Jira tool execution failed: {e}")
            execution_results["jira_error"] = str(e)

    if decisions and registry.is_tool_available("notion"):
        try:
            notion = registry.get_tool("notion")
            for decision in decisions[:3]:
                page = await notion.create_page(
                    database_id="decision_log",
                    properties={
                        "title": decision.get("decision", decision.get("title", "Decision")),
                        "rationale": decision.get("rationale", ""),
                    },
                )
                execution_results.setdefault("notion_pages", []).append(page)
        except Exception as e:
            logger.warning(f"Notion tool execution failed: {e}")
            execution_results["notion_error"] = str(e)

    if registry.is_tool_available("slack"):
        try:
            slack = registry.get_tool("slack")
            summary = results.get("summary", "Meeting processed by CORTEX AI")
            await slack.send_message(
                channel="meeting-notes",
                text=f"*Meeting Processed*\n{summary[:500]}",
            )
            execution_results["slack_notified"] = True
        except Exception as e:
            logger.warning(f"Slack notification failed: {e}")

    return execution_results


async def _send_notifications(state: MeetingWorkflowState) -> Dict[str, Any]:
    from tools.registry import get_tool_registry

    registry = get_tool_registry()
    results = {}
    meeting_data = state.meeting_data or {}
    participants = meeting_data.get("participants", [])

    if registry.is_tool_available("slack") and participants:
        try:
            slack = registry.get_tool("slack")
            workflow_results = state.results.get("workflow_graph", {})
            summary = (workflow_results or {}).get("summary", "Meeting processed")
            action_items = (workflow_results or {}).get("action_items", [])

            message = f"*Meeting Summary*\n{summary}\n\n*Action Items*\n"
            if action_items:
                for item in action_items[:10]:
                    assignee = item.get("assignee", "Unassigned")
                    task = item.get("task", item.get("title", "Task"))
                    message += f"• {task} - *{assignee}*\n"
            else:
                message += "No action items extracted.\n"

            for participant in participants[:3]:
                name = participant.get("name", "") if isinstance(participant, dict) else str(participant)
                if name:
                    try:
                        await slack.send_dm(
                            user_id=name.lower().replace(" ", "."),
                            text=f"Your meeting '{meeting_data.get('title', 'Untitled')}' has been processed.\n{message[:200]}",
                        )
                        results.setdefault("dms_sent", []).append(name)
                    except Exception as dm_err:
                        logger.warning(f"Failed to send DM to {name}: {dm_err}")

        except Exception as e:
            logger.warning(f"Slack notification step failed: {e}")
            results["error"] = str(e)

    return results


async def _persist_results(state: MeetingWorkflowState, **kwargs) -> Dict[str, Any]:
    db_session = kwargs.get("db_session") or state.db_session
    if not db_session:
        return {"status": "skipped", "reason": "No database session"}

    meeting_id = uuid.UUID(state.meeting_id) if isinstance(state.meeting_id, str) else state.meeting_id

    update_data = {}
    transcription = state.results.get("transcription")
    if transcription and isinstance(transcription, dict) and "full_text" in transcription:
        update_data["transcript"] = transcription

    workflow_results = state.results.get("workflow_graph", {})
    if isinstance(workflow_results, dict):
        summary = workflow_results.get("summary")
        if summary:
            update_data["summary"] = summary

    if update_data:
        await crud.update_meeting(db_session, meeting_id, **update_data)

    workflow_results = state.results.get("workflow_graph", {})
    if isinstance(workflow_results, dict):
        action_items = workflow_results.get("action_items", [])
        decisions_list = workflow_results.get("decisions", [])

        for item in action_items:
            await crud.create_action_item(
                db_session,
                meeting_id=meeting_id,
                title=item.get("task", item.get("title", "Action item")),
                assignee_name=item.get("assignee"),
                priority=item.get("priority", "medium"),
                description=item.get("description", ""),
            )

        for dec in decisions_list:
            await crud.create_decision(
                db_session,
                meeting_id=meeting_id,
                title=dec.get("decision", dec.get("title", "Decision")),
                confidence=dec.get("confidence", 0.0),
            )

    await crud.create_agent_log(
        db_session,
        agent_name="meeting_workflow",
        action="persist_results",
        status="completed",
        meeting_id=meeting_id,
        result={
            "has_transcript": "transcript" in update_data,
            "has_summary": "summary" in update_data,
            "action_item_count": len(action_items) if isinstance(workflow_results, dict) else 0,
            "decision_count": len(decisions_list) if isinstance(workflow_results, dict) else 0,
        },
    )

    return {"status": "persisted"}


def _merge_workflow_results(state: MeetingWorkflowState, workflow_state: Any):
    if hasattr(workflow_state, "to_dict"):
        state.results["workflow_graph"] = workflow_state.to_dict()
    elif isinstance(workflow_state, dict):
        state.results["workflow_graph"] = workflow_state
    else:
        state.results["workflow_graph"] = {"status": "unknown"}

    wf_data = state.results["workflow_graph"]
    if isinstance(wf_data, dict):
        results_dict = wf_data.get("results", wf_data)
        if isinstance(results_dict, dict):
            for key, value in results_dict.items():
                if key != "supervisor" and key not in state.results:
                    if isinstance(value, dict):
                        data = value.get("data", value)
                        if isinstance(data, dict):
                            state.results[key] = data


def _build_agent_config(workflow_config: MeetingWorkflowConfig, state: MeetingWorkflowState) -> Dict[str, Any]:
    return {
        "supervisor": {"meeting_id": state.meeting_id},
        "memory": {"enabled": workflow_config.enable_memory_retrieval},
        "action_item": {"enabled": workflow_config.enable_action_extraction},
        "verifier": {"enabled": workflow_config.enable_verification},
        "reflection": {"enabled": workflow_config.enable_reflection},
    }


async def _log_step(
    state: MeetingWorkflowState,
    db_session,
    step: str,
    status: str,
    error: Optional[str] = None,
):
    if not db_session:
        return
    try:
        meeting_id = uuid.UUID(state.meeting_id) if isinstance(state.meeting_id, str) else state.meeting_id
        await crud.create_agent_log(
            db_session,
            agent_name="meeting_workflow",
            action=step,
            status=status,
            meeting_id=meeting_id,
            error=error,
        )
    except Exception as e:
        logger.debug(f"Failed to log step {step}: {e}")


async def _trigger_webhook(state: MeetingWorkflowState, event: str):
    if not state.config.send_webhooks or not state.config.webhook_url:
        return
    try:
        import httpx
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(
                state.config.webhook_url,
                json={
                    "event": event,
                    "meeting_id": state.meeting_id,
                    "state_id": state.state_id,
                    "status": state.status,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                },
            )
    except Exception as e:
        logger.warning(f"Webhook trigger failed for {event}: {e}")


def _notify_progress(
    callback: Optional[ProgressCallback],
    step: str,
    status: str,
    progress: float,
):
    if callback:
        try:
            callback(step, status, progress)
        except Exception as e:
            logger.warning(f"Progress callback failed: {e}")
