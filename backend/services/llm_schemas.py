"""Pydantic models for structured LLM extraction via OpenAI Responses API."""

from typing import List, Optional
from pydantic import BaseModel, Field


class ExtractedParticipant(BaseModel):
    name: str = Field(..., description="Full name of the participant as mentioned in transcript")
    role: Optional[str] = Field(None, description="Role or title if mentioned")


class ExtractedDecision(BaseModel):
    title: str = Field(..., description="Short title of the decision")
    description: str = Field("", description="Details about what was decided")
    decided_by: str = Field("Unknown", description="Name of person who made/announced the decision")
    evidence: str = Field("", description="Direct quote or paraphrase from transcript supporting this")
    confidence: float = Field(0.8, ge=0.0, le=1.0, description="Confidence that this is a real decision")


class ExtractedActionItem(BaseModel):
    title: str = Field(..., description="Short title of the action item")
    description: str = Field("", description="Details about what needs to be done")
    assignee: Optional[str] = Field(None, description="Name of person assigned, or null if unassigned")
    deadline: Optional[str] = Field(None, description="Deadline if mentioned, as free text (e.g. 'August 5, 2026')")
    priority: str = Field("medium", description="Priority: critical, high, medium, or low")
    evidence: str = Field("", description="Direct quote or paraphrase from transcript")
    confidence: float = Field(0.8, ge=0.0, le=1.0)


class ExtractedRisk(BaseModel):
    title: str = Field(..., description="Short title of the risk")
    description: str = Field("", description="Details about the risk")
    severity: str = Field("medium", description="Severity: critical, high, medium, or low")
    likelihood: str = Field("medium", description="Likelihood: high, medium, or low")
    mitigation: Optional[str] = Field(None, description="Proposed mitigation if mentioned")
    owner: Optional[str] = Field(None, description="Person responsible for this risk")
    evidence: str = Field("", description="Direct quote or paraphrase from transcript")
    confidence: float = Field(0.8, ge=0.0, le=1.0)


class ExtractedDependency(BaseModel):
    from_item: str = Field(..., description="The item that depends on or blocks another")
    to_item: str = Field(..., description="The item being depended on or blocked")
    dependency_type: str = Field("blocks", description="Type: blocks, requires, informs, or follows")
    description: str = Field("", description="Brief explanation of the dependency")


class ExtractedClarification(BaseModel):
    question: str = Field(..., description="The unanswered question or ambiguity")
    context: str = Field("", description="Context around why this needs clarification")
    evidence: str = Field("", description="What in the transcript triggered this question")


class MeetingIntelligence(BaseModel):
    """Complete structured extraction from a meeting transcript."""
    participants: List[ExtractedParticipant] = Field(default_factory=list)
    decisions: List[ExtractedDecision] = Field(default_factory=list)
    action_items: List[ExtractedActionItem] = Field(default_factory=list)
    risks: List[ExtractedRisk] = Field(default_factory=list)
    dependencies: List[ExtractedDependency] = Field(default_factory=list)
    clarifications: List[ExtractedClarification] = Field(default_factory=list)
    summary: str = Field("", description="Concise 2-4 sentence executive summary of the meeting")
    overall_confidence: float = Field(0.8, ge=0.0, le=1.0, description="Overall confidence in the extraction quality")
