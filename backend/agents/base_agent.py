from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
from datetime import datetime
import uuid
from pydantic import BaseModel


class AgentContext(BaseModel):
    agent_name: str
    meeting_id: Optional[str] = None
    session_id: str = None
    start_time: datetime = None
    state: Dict[str, Any] = {}

    def model_post_init(self, __context: Any) -> None:
        if self.session_id is None:
            self.session_id = str(uuid.uuid4())
        if self.start_time is None:
            self.start_time = datetime.utcnow()
        if self.state is None:
            self.state = {}


class AgentResult(BaseModel):
    success: bool
    data: Dict[str, Any] = {}
    error: Optional[str] = None
    reasoning: str = ""
    confidence: float = 0.0
    next_steps: list[str] = []


class BaseAgent(ABC):
    def __init__(self, name: str, config: Optional[Dict] = None):
        self.name = name
        self.config = config or {}

    @abstractmethod
    async def process(self, context: AgentContext) -> AgentResult:
        pass

    async def run(self, context: AgentContext) -> AgentResult:
        context.start_time = datetime.utcnow()
        try:
            result = await self.process(context)
            return result
        except Exception as e:
            return AgentResult(
                success=False,
                error=str(e),
                reasoning="Error encountered during execution"
            )

    def log(self, message: str, level: str = "info"):
        import logging
        logger = logging.getLogger(f"agent.{self.name}")
        getattr(logger, level)(message)
