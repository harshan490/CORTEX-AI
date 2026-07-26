import uuid
from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, Field, EmailStr


# ── Auth ─────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: str = Field(..., examples=["user@example.com"])
    name: str = Field(..., min_length=1, max_length=255, examples=["Jane Doe"])
    password: Optional[str] = Field(None, min_length=6, examples=["securepassword"])
    google_id_token: Optional[str] = None


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    name: str
    avatar_url: Optional[str] = None
    google_id: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    avatar_url: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class LoginRequest(BaseModel):
    email: str
    password: str


class GoogleAuthRequest(BaseModel):
    id_token: str


# ── Meeting ──────────────────────────────────────────────────────────────────

class MeetingCreate(BaseModel):
    title: str = Field(..., max_length=500, examples=["Sprint Planning"])
    date: datetime = Field(..., examples=["2026-07-25T10:00:00Z"])
    duration_seconds: Optional[int] = Field(None, ge=0)
    gcal_event_id: Optional[str] = None
    recording_url: Optional[str] = None


class MeetingUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=500)
    date: Optional[datetime] = None
    duration_seconds: Optional[int] = Field(None, ge=0)
    status: Optional[str] = None
    transcript: Optional[Any] = None
    summary: Optional[str] = None
    gcal_event_id: Optional[str] = None
    recording_url: Optional[str] = None


class MeetingResponse(BaseModel):
    id: uuid.UUID
    title: str
    date: datetime
    duration_seconds: Optional[int] = None
    status: str
    summary: Optional[str] = None
    processing_confidence: Optional[float] = None
    transcript: Optional[Any] = None
    gcal_event_id: Optional[str] = None
    recording_url: Optional[str] = None
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime
    participants: list[Any] = []
    action_item_count: int = 0
    decision_count: int = 0
    risk_count: int = 0
    dependency_count: int = 0
    clarification_count: int = 0

    model_config = {"from_attributes": True}


class TranscriptUpload(BaseModel):
    segments: list[dict] = Field(..., examples=[[{"speaker": "Alice", "text": "Let's start.", "start": 0.0, "end": 2.5}]])


class TranscriptResponse(BaseModel):
    meeting_id: uuid.UUID
    segments: list[dict]
    total_duration: Optional[float] = None


# ── Action Item ──────────────────────────────────────────────────────────────

class ActionItemCreate(BaseModel):
    title: str = Field(..., max_length=500)
    description: Optional[str] = None
    owner_id: Optional[uuid.UUID] = None
    assignee_name: Optional[str] = None
    deadline: Optional[datetime] = None
    priority: str = "medium"
    risk_level: Optional[str] = None
    notes: Optional[str] = None


class ActionItemUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=500)
    description: Optional[str] = None
    owner_id: Optional[uuid.UUID] = None
    assignee_name: Optional[str] = None
    deadline: Optional[datetime] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    risk_level: Optional[str] = None
    notes: Optional[str] = None


class ActionItemResponse(BaseModel):
    id: uuid.UUID
    meeting_id: uuid.UUID
    title: str
    description: Optional[str] = None
    owner_id: Optional[uuid.UUID] = None
    assignee_name: Optional[str] = None
    deadline: Optional[datetime] = None
    priority: str
    status: str
    risk_level: Optional[str] = None
    notes: Optional[str] = None
    evidence: Optional[str] = None
    confidence: float = 0.0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Decision ─────────────────────────────────────────────────────────────────

class DecisionCreate(BaseModel):
    title: str = Field(..., max_length=500)
    description: Optional[str] = None
    made_by: Optional[uuid.UUID] = None
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    is_confirmed: bool = False


class DecisionResponse(BaseModel):
    id: uuid.UUID
    meeting_id: uuid.UUID
    title: str
    description: Optional[str] = None
    made_by: Optional[uuid.UUID] = None
    decided_by_name: Optional[str] = None
    evidence: Optional[str] = None
    timestamp: datetime
    confidence: Optional[float] = None
    is_confirmed: bool

    model_config = {"from_attributes": True}


# ── Risk ─────────────────────────────────────────────────────────────────────

class RiskResponse(BaseModel):
    id: uuid.UUID
    meeting_id: uuid.UUID
    title: str
    description: Optional[str] = None
    severity: str
    likelihood: str
    mitigation: Optional[str] = None
    owner: Optional[str] = None
    evidence: Optional[str] = None
    confidence: float = 0.0
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Dependency ──────────────────────────────────────────────────────────────

class DependencyResponse(BaseModel):
    id: uuid.UUID
    meeting_id: uuid.UUID
    from_item: str
    to_item: str
    dependency_type: str
    description: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Clarification ──────────────────────────────────────────────────────────

class ClarificationResponse(BaseModel):
    id: uuid.UUID
    meeting_id: uuid.UUID
    question: str
    context: Optional[str] = None
    evidence: Optional[str] = None
    status: str = "pending"
    resolution: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Task ─────────────────────────────────────────────────────────────────────

class TaskCreate(BaseModel):
    title: str = Field(..., max_length=500)
    description: Optional[str] = None
    meeting_id: Optional[uuid.UUID] = None
    owner_id: Optional[uuid.UUID] = None
    priority: str = "medium"
    deadline: Optional[datetime] = None
    source: str = "manual"
    external_id: Optional[str] = None
    external_type: Optional[str] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=500)
    description: Optional[str] = None
    owner_id: Optional[uuid.UUID] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    deadline: Optional[datetime] = None


class TaskResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str] = None
    meeting_id: Optional[uuid.UUID] = None
    owner_id: Optional[uuid.UUID] = None
    status: str
    priority: str
    deadline: Optional[datetime] = None
    source: str
    external_id: Optional[str] = None
    external_type: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Reminder ─────────────────────────────────────────────────────────────────

class ReminderCreate(BaseModel):
    type: str = "email"
    message: Optional[str] = None
    scheduled_for: datetime


class ReminderResponse(BaseModel):
    id: uuid.UUID
    task_id: uuid.UUID
    type: str
    recipient_id: uuid.UUID
    sent_at: Optional[datetime] = None
    status: str
    message: Optional[str] = None
    scheduled_for: datetime

    model_config = {"from_attributes": True}


# ── Analytics ────────────────────────────────────────────────────────────────

class AnalyticsResponse(BaseModel):
    period: str
    total_meetings: int
    total_tasks: int
    completed_tasks: int
    completion_rate: float
    total_action_items: int
    completed_action_items: int
    total_decisions: int
    overdue_items: int
    critical_risks: int
    average_duration_minutes: float


class ProductivityScore(BaseModel):
    user_id: uuid.UUID
    user_name: str
    tasks_completed: int
    tasks_pending: int
    completion_rate: float
    on_time_rate: float
    score: float


class TeamPerformanceResponse(BaseModel):
    members: list[ProductivityScore]


class MeetingTrend(BaseModel):
    date: str
    count: int
    total_duration_seconds: int


class MeetingTrendsResponse(BaseModel):
    trends: list[MeetingTrend]


# ── Search ───────────────────────────────────────────────────────────────────

class SearchQuery(BaseModel):
    q: str = Field(..., min_length=1, max_length=500)
    type: Optional[str] = Field(None, description="meeting, decision, task, action_item")
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    skip: int = 0
    limit: int = 20


class SearchResult(BaseModel):
    id: uuid.UUID
    type: str
    title: str
    snippet: str
    score: float
    url: Optional[str] = None
    created_at: datetime


class SearchResponse(BaseModel):
    results: list[SearchResult]
    total: int


# ── Agent ────────────────────────────────────────────────────────────────────

class AgentStatusResponse(BaseModel):
    name: str
    status: str
    last_run: Optional[datetime] = None
    last_result: Optional[str] = None


class AgentLogResponse(BaseModel):
    id: uuid.UUID
    agent_name: str
    meeting_id: Optional[uuid.UUID] = None
    action: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    result: Optional[Any] = None
    error: Optional[str] = None

    model_config = {"from_attributes": True}


class WorkflowStateResponse(BaseModel):
    id: uuid.UUID
    meeting_id: uuid.UUID
    meeting_title: Optional[str] = None
    current_step: str
    status: str
    progress: int = 0
    state_data: Optional[Any] = None
    error: Optional[str] = None
    attempt: int = 1
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
