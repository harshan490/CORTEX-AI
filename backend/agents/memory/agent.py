import logging
import hashlib
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from uuid import uuid4

from agents.base_agent import BaseAgent, AgentContext, AgentResult


logger = logging.getLogger("agent.memory")


class MemoryVector:
    def __init__(self):
        self._store: List[Dict[str, Any]] = []

    def insert(self, item: Dict[str, Any]) -> str:
        item_id = str(uuid4())
        item["id"] = item_id
        item["created_at"] = datetime.utcnow().isoformat()
        item["embedding_hash"] = self._compute_hash(item.get("text", ""))
        self._store.append(item)
        return item_id

    def search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        query_hash = self._compute_hash(query)
        scored = []
        for item in self._store:
            score = self._cosine_similarity_hash(query_hash, item["embedding_hash"])
            scored.append((score, item))
        scored.sort(key=lambda x: x[0], reverse=True)
        return [{"item": s[1], "score": round(s[0], 4)} for s in scored[:top_k]]

    def query_by_field(self, field: str, value: Any) -> List[Dict[str, Any]]:
        return [item for item in self._store if item.get(field) == value]

    def _compute_hash(self, text: str) -> str:
        return hashlib.sha256(text.encode()).hexdigest()[:16]

    def _cosine_similarity_hash(self, h1: str, h2: str) -> float:
        b1 = bin(int(h1, 16))[2:].zfill(64)
        b2 = bin(int(h2, 16))[2:].zfill(64)
        matches = sum(1 for a, b in zip(b1, b2) if a == b)
        return matches / len(b1)

    def clear(self) -> None:
        self._store.clear()

    @property
    def size(self) -> int:
        return len(self._store)


_vector_store = MemoryVector()


def _seed_mock_memory() -> None:
    if _vector_store.size > 0:
        return

    mock_meetings = [
        {
            "type": "meeting",
            "meeting_id": "prev-001",
            "project": "cortex-ai",
            "date": (datetime.utcnow() - timedelta(days=7)).isoformat(),
            "summary": "Sprint planning for sprint 12. Discussed dashboard redesign and API optimization.",
            "participants": ["alice", "bob", "charlie"],
            "text": "Sprint planning session. We prioritized dashboard redesign and API optimization.",
            "key_decisions": ["Adopt new charting library", "Deprecate v1 API by Q3"],
        },
        {
            "type": "meeting",
            "meeting_id": "prev-002",
            "project": "cortex-ai",
            "date": (datetime.utcnow() - timedelta(days=3)).isoformat(),
            "summary": "Daily standup - working on notification service integration",
            "participants": ["alice", "bob"],
            "text": "Standup: Alice working on notification service, Bob reviewing PRs.",
            "key_decisions": [],
        },
        {
            "type": "action_item",
            "meeting_id": "prev-001",
            "owner": "alice",
            "description": "Research charting libraries for dashboard",
            "deadline": (datetime.utcnow() + timedelta(days=5)).isoformat(),
            "status": "pending",
            "text": "Research charting libraries for dashboard redesign",
        },
        {
            "type": "action_item",
            "meeting_id": "prev-001",
            "owner": "bob",
            "description": "Draft API deprecation timeline",
            "deadline": (datetime.utcnow() + timedelta(days=10)).isoformat(),
            "status": "pending",
            "text": "Draft API deprecation timeline",
        },
        {
            "type": "decision",
            "meeting_id": "prev-001",
            "description": "Adopt Recharts for new dashboard",
            "rationale": "Better React integration and more active maintenance",
            "text": "Decision: Use Recharts for the new dashboard implementation",
        },
        {
            "type": "decision",
            "meeting_id": "prev-001",
            "description": "Deprecate API v1 by end of Q3",
            "rationale": "Reduce maintenance burden and improve security",
            "text": "Decision: Deprecate API v1 by end of Q3 2026",
        },
        {
            "type": "team_context",
            "member": "alice",
            "role": "senior_engineer",
            "preferences": "Prefers async communication, deep work blocks in morning",
            "availability": "Mon-Thu 9am-5pm UTC",
            "text": "Alice: Senior engineer, prefers async, morning person",
        },
        {
            "type": "team_context",
            "member": "bob",
            "role": "engineer",
            "preferences": "Loves pairing, active on Slack",
            "availability": "Mon-Fri 10am-6pm UTC",
            "text": "Bob: Engineer, collaborative, responsive on Slack",
        },
        {
            "type": "team_context",
            "member": "charlie",
            "role": "product_manager",
            "preferences": "Prefers scheduled meetings, detailed docs",
            "availability": "Mon-Fri 8am-4pm UTC",
            "text": "Charlie: PM, structured communication, documentation-focused",
        },
    ]

    for item in mock_meetings:
        _vector_store.insert(item)


_seed_mock_memory()


class MemoryAgent(BaseAgent):
    def __init__(self, config: Optional[Dict] = None):
        super().__init__(name="memory", config=config)
        self._store = _vector_store

    async def process(self, context: AgentContext) -> AgentResult:
        meeting_data = context.state.get("meeting_data", {})
        transcript = meeting_data.get("transcript", "")
        participants = meeting_data.get("participants", [])
        meeting_id = context.meeting_id or "unknown"
        project = meeting_data.get("metadata", {}).get("project", "cortex-ai")

        query = context.state.get("query") or transcript[:500] if transcript else ""

        self.log(f"Retrieving memory context for meeting {meeting_id}")

        previous_meetings = self._retrieve_previous_meetings(query, project)
        pending_items = self._retrieve_pending_items(query, project)
        historical_decisions = self._retrieve_decisions(query, project)
        team_context = self._retrieve_team_context(participants)

        relevance_scores = self._compute_relevance_scores(
            previous_meetings, pending_items, historical_decisions, team_context
        )

        return AgentResult(
            success=True,
            data={
                "previous_meetings": previous_meetings,
                "pending_items": pending_items,
                "historical_decisions": historical_decisions,
                "team_context": team_context,
                "relevance_scores": relevance_scores,
                "project": project,
            },
            reasoning=f"Retrieved {len(previous_meetings)} related meetings, "
                      f"{len(pending_items)} pending items, "
                      f"{len(historical_decisions)} decisions",
            confidence=min(0.9, 0.5 + 0.1 * len(previous_meetings)),
            next_steps=["Provide memory context to planner", "Update memory store with new data"],
        )

    def _retrieve_previous_meetings(self, query: str,
                                     project: str) -> List[Dict]:
        results = self._store.search(query, top_k=5)
        meetings = []
        for r in results:
            item = r["item"]
            if item.get("type") == "meeting":
                meetings.append({
                    "meeting_id": item.get("meeting_id"),
                    "date": item.get("date"),
                    "summary": item.get("summary"),
                    "participants": item.get("participants", []),
                    "key_decisions": item.get("key_decisions", []),
                    "relevance": r["score"],
                })
        return sorted(meetings, key=lambda x: x["relevance"], reverse=True)

    def _retrieve_pending_items(self, query: str,
                                 project: str) -> List[Dict]:
        results = self._store.search(query, top_k=10)
        items = []
        for r in results:
            item = r["item"]
            if item.get("type") == "action_item" and item.get("status") == "pending":
                deadline_str = item.get("deadline", "")
                deadline = None
                try:
                    deadline = datetime.fromisoformat(deadline_str)
                except (ValueError, TypeError):
                    pass

                items.append({
                    "id": item.get("id"),
                    "description": item.get("description"),
                    "owner": item.get("owner"),
                    "deadline": deadline_str,
                    "is_overdue": deadline is not None and deadline < datetime.utcnow() if deadline else False,
                    "source_meeting": item.get("meeting_id"),
                    "relevance": r["score"],
                })
        return sorted(items, key=lambda x: x["relevance"], reverse=True)

    def _retrieve_decisions(self, query: str, project: str) -> List[Dict]:
        results = self._store.search(query, top_k=5)
        decisions = []
        for r in results:
            item = r["item"]
            if item.get("type") == "decision":
                decisions.append({
                    "description": item.get("description"),
                    "rationale": item.get("rationale"),
                    "source_meeting": item.get("meeting_id"),
                    "relevance": r["score"],
                })
        return sorted(decisions, key=lambda x: x["relevance"], reverse=True)

    def _retrieve_team_context(self, participants: List) -> Dict[str, Any]:
        team_data = {}
        for participant in participants:
            name = ""
            if isinstance(participant, dict):
                name = participant.get("name", "").lower()
            elif isinstance(participant, str):
                name = participant.lower()

            if not name:
                continue

            results = self._store.query_by_field("member", name)
            if results:
                item = results[0]
                team_data[name] = {
                    "role": item.get("role", "member"),
                    "preferences": item.get("preferences", ""),
                    "availability": item.get("availability", ""),
                }
            else:
                team_data[name] = {
                    "role": "member",
                    "preferences": "No preferences recorded",
                    "availability": "Unknown",
                }

        return team_data

    def _compute_relevance_scores(self, *args: List) -> Dict[str, float]:
        scores = {}
        total = 0
        count = 0
        for collection in args:
            for item in collection:
                score = item.get("relevance", 0.5) if isinstance(item, dict) else 0.5
                key = item.get("meeting_id", item.get("id", "unknown")) if isinstance(item, dict) else "unknown"
                scores[key] = score
                total += score
                count += 1
        scores["average_relevance"] = round(total / max(count, 1), 4)
        return scores


def get_vector_store() -> MemoryVector:
    return _vector_store
