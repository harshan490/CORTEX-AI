import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, DateTime, JSON, ForeignKey, Enum, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from database import Base
import enum


def utcnow():
    return datetime.now(timezone.utc)


def new_uuid():
    return uuid.uuid4()


class MeetingStatus(str, enum.Enum):
    scheduled = "scheduled"
    in_progress = "in_progress"
    completed = "completed"
    processing = "processing"
    awaiting_review = "awaiting_review"
    failed = "failed"


class Priority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class ItemStatus(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"
    overdue = "overdue"


class ReminderType(str, enum.Enum):
    email = "email"
    slack = "slack"
    push = "push"


class ReminderStatus(str, enum.Enum):
    pending = "pending"
    sent = "sent"
    failed = "failed"


class TaskSource(str, enum.Enum):
    manual = "manual"
    meeting = "meeting"
    email = "email"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    avatar_url = Column(Text, nullable=True)
    google_id = Column(String(255), unique=True, nullable=True)
    role = Column(String(255), nullable=True)
    timezone = Column(String(100), nullable=True)
    hashed_password = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    meetings = relationship("Meeting", back_populates="creator")
    action_items = relationship("ActionItem", back_populates="owner", foreign_keys="ActionItem.owner_id")
    tasks = relationship("Task", back_populates="owner", foreign_keys="Task.owner_id")
    reminders = relationship("Reminder", back_populates="recipient", foreign_keys="Reminder.recipient_id")
    participations = relationship("Participant", back_populates="user")


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    title = Column(String(500), nullable=False)
    date = Column(DateTime(timezone=True), nullable=False)
    duration_seconds = Column(Integer, nullable=True)
    status = Column(Enum(MeetingStatus), default=MeetingStatus.scheduled, nullable=False)
    transcript = Column(JSON, nullable=True)
    summary = Column(Text, nullable=True)
    processing_confidence = Column(Float, nullable=True)
    gcal_event_id = Column(String(255), nullable=True)
    recording_url = Column(Text, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    creator = relationship("User", back_populates="meetings")
    participants = relationship("Participant", back_populates="meeting", cascade="all, delete-orphan")
    action_items = relationship("ActionItem", back_populates="meeting", cascade="all, delete-orphan")
    decisions = relationship("Decision", back_populates="meeting", cascade="all, delete-orphan")
    risks = relationship("Risk", back_populates="meeting", cascade="all, delete-orphan")
    dependencies = relationship("Dependency", back_populates="meeting", cascade="all, delete-orphan")
    clarifications = relationship("Clarification", back_populates="meeting", cascade="all, delete-orphan")
    agent_logs = relationship("AgentLog", back_populates="meeting", cascade="all, delete-orphan")
    workflow_states = relationship("WorkflowState", back_populates="meeting", cascade="all, delete-orphan")


class Participant(Base):
    __tablename__ = "participants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    meeting_id = Column(UUID(as_uuid=True), ForeignKey("meetings.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    name = Column(String(255), nullable=False)
    role = Column(String(100), nullable=True)
    speaking_time_seconds = Column(Integer, default=0, nullable=False)
    joined_at = Column(DateTime(timezone=True), nullable=True)
    left_at = Column(DateTime(timezone=True), nullable=True)

    meeting = relationship("Meeting", back_populates="participants")
    user = relationship("User", back_populates="participations")


class ActionItem(Base):
    __tablename__ = "action_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    meeting_id = Column(UUID(as_uuid=True), ForeignKey("meetings.id"), nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    assignee_name = Column(String(255), nullable=True)
    deadline = Column(DateTime(timezone=True), nullable=True)
    priority = Column(Enum(Priority), default=Priority.medium, nullable=False)
    status = Column(Enum(ItemStatus), default=ItemStatus.pending, nullable=False)
    risk_level = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    evidence = Column(Text, nullable=True)
    confidence = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    meeting = relationship("Meeting", back_populates="action_items")
    owner = relationship("User", back_populates="action_items", foreign_keys=[owner_id])


class Decision(Base):
    __tablename__ = "decisions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    meeting_id = Column(UUID(as_uuid=True), ForeignKey("meetings.id"), nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    made_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    decided_by_name = Column(String(255), nullable=True)
    evidence = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    confidence = Column(Float, nullable=True)
    is_confirmed = Column(Boolean, default=False, nullable=False)

    meeting = relationship("Meeting", back_populates="decisions")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    meeting_id = Column(UUID(as_uuid=True), ForeignKey("meetings.id"), nullable=True)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    status = Column(Enum(ItemStatus), default=ItemStatus.pending, nullable=False)
    priority = Column(Enum(Priority), default=Priority.medium, nullable=False)
    deadline = Column(DateTime(timezone=True), nullable=True)
    source = Column(Enum(TaskSource), default=TaskSource.manual, nullable=False)
    external_id = Column(String(255), nullable=True)
    external_type = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    owner = relationship("User", back_populates="tasks", foreign_keys=[owner_id])
    reminders = relationship("Reminder", back_populates="task", cascade="all, delete-orphan")


class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id"), nullable=False)
    type = Column(Enum(ReminderType), default=ReminderType.email, nullable=False)
    recipient_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(Enum(ReminderStatus), default=ReminderStatus.pending, nullable=False)
    message = Column(Text, nullable=True)
    scheduled_for = Column(DateTime(timezone=True), nullable=False)

    task = relationship("Task", back_populates="reminders")
    recipient = relationship("User", back_populates="reminders")


class AgentLog(Base):
    __tablename__ = "agent_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    agent_name = Column(String(255), nullable=False, index=True)
    meeting_id = Column(UUID(as_uuid=True), ForeignKey("meetings.id"), nullable=True)
    action = Column(String(255), nullable=False)
    status = Column(String(50), nullable=False)
    started_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    result = Column(JSON, nullable=True)
    error = Column(Text, nullable=True)

    meeting = relationship("Meeting", back_populates="agent_logs")


class OrganizationMemory(Base):
    __tablename__ = "organization_memory"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    key = Column(String(255), unique=True, nullable=False, index=True)
    content = Column(JSON, nullable=False)
    embedding = Column(JSON, nullable=True)
    source_type = Column(String(50), nullable=True)
    source_id = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)


class RiskSeverity(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class RiskLikelihood(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class Risk(Base):
    __tablename__ = "risks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    meeting_id = Column(UUID(as_uuid=True), ForeignKey("meetings.id"), nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(Enum(RiskSeverity), default=RiskSeverity.medium, nullable=False)
    likelihood = Column(Enum(RiskLikelihood), default=RiskLikelihood.medium, nullable=False)
    mitigation = Column(Text, nullable=True)
    owner = Column(String(255), nullable=True)
    evidence = Column(Text, nullable=True)
    confidence = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    meeting = relationship("Meeting", back_populates="risks")


class Dependency(Base):
    __tablename__ = "dependencies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    meeting_id = Column(UUID(as_uuid=True), ForeignKey("meetings.id"), nullable=False)
    from_item = Column(String(500), nullable=False)
    to_item = Column(String(500), nullable=False)
    dependency_type = Column(String(50), default="blocks", nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    meeting = relationship("Meeting", back_populates="dependencies")


class Clarification(Base):
    __tablename__ = "clarifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    meeting_id = Column(UUID(as_uuid=True), ForeignKey("meetings.id"), nullable=False)
    question = Column(Text, nullable=False)
    context = Column(Text, nullable=True)
    evidence = Column(Text, nullable=True)
    status = Column(String(50), default="pending", nullable=False)
    resolution = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    meeting = relationship("Meeting", back_populates="clarifications")


class WorkflowState(Base):
    __tablename__ = "workflow_states"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    meeting_id = Column(UUID(as_uuid=True), ForeignKey("meetings.id"), nullable=False)
    current_step = Column(String(255), nullable=False)
    status = Column(String(50), nullable=False)
    progress = Column(Integer, default=0, nullable=False)
    state_data = Column(JSON, nullable=True)
    error = Column(Text, nullable=True)
    attempt = Column(Integer, default=1, nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint('meeting_id', name='uq_workflow_states_meeting_id'),
    )

    meeting = relationship("Meeting", back_populates="workflow_states")
