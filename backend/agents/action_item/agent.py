import re
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
from uuid import uuid4

from agents.base_agent import BaseAgent, AgentContext, AgentResult


logger = logging.getLogger("agent.action_item")


ACTION_INDICATORS = [
    "i will", "i'll", "i need to", "i have to", "i'm going to",
    "we will", "we'll", "we need to", "we have to",
    "assign", "assigned", "responsible", "owner",
    "todo", "to-do", "action item", "action:",
    "follow up", "follow-up", "take care of",
    "handle", "deal with", "look into", "investigate",
    "create a", "create an", "set up", "implement",
    "schedule", "organize", "prepare", "draft",
    "send", "email", "reach out", "contact",
    "fix", "resolve", "address", "improve",
    "deliver", "submit", "complete", "finish",
    "make sure", "ensure", "verify", "check",
    "coordinate", "sync", "align with",
]

DECISION_INDICATORS = [
    "decided", "decision", "agreed", "consensus",
    "we will go with", "let's go with", "moving forward with",
    "settled on", "chosen", "selected", "approved",
    "signed off", "confirmed", "finalized",
    "outcome", "conclusion", "resolution",
]

RISK_INDICATORS = [
    "risk", "blocker", "blocked", "stuck", "issue",
    "problem", "concern", "worried", "challenge",
    "difficult", "hard", "complex", "bottleneck",
    "dependency", "waiting on", "blocked by",
    "at risk", "jeopardy", "critical", "urgent",
    "delayed", "delay", "overdue", "behind schedule",
    "uncertain", "unclear", "not sure",
]

DEADLINE_PATTERNS = [
    (r"by\s+(?:end\s+of\s+)?(today|tomorrow|eod)", 1),
    (r"by\s+(?:end\s+of\s+)?(this\s+week|friday|eow)", 5),
    (r"by\s+(?:end\s+of\s+)?(next\s+week|monday|tuesday|wednesday|thursday|friday)", 7),
    (r"by\s+(\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*\d{0,4})", 30),
    (r"(asap|as soon as possible|immediately|urgent)", 1),
    (r"this\s+(week|sprint|quarter)", 7),
    (r"next\s+(week|sprint|quarter)", 14),
    (r"(q1|q2|q3|q4)\s*\d{0,4}", 90),
]


class ActionItemAgent(BaseAgent):
    def __init__(self, config: Optional[Dict] = None):
        super().__init__(name="action_item", config=config)

    async def process(self, context: AgentContext) -> AgentResult:
        meeting_data = context.state.get("meeting_data", {})
        transcript = meeting_data.get("transcript", "")
        meeting_analysis = context.state.get("meeting_analysis", {})
        planner_output = context.state.get("planner_output", {})

        if not transcript:
            return AgentResult(
                success=False,
                error="No transcript provided",
                reasoning="Action Item extraction requires a transcript",
            )

        self.log("Extracting action items from meeting transcript")

        segments = meeting_analysis.get("segments", [])
        speaker_map = meeting_analysis.get("speaker_map", {})
        planner_tasks = planner_output.get("tasks", [])

        action_items = self._extract_action_items(
            transcript, segments, speaker_map
        )
        decisions = self._extract_decisions(transcript, segments)
        risks = self._extract_risks(transcript, segments)
        ambiguous_items = self._identify_ambiguous_items(action_items)

        merged_items = self._merge_with_planner_tasks(action_items, planner_tasks)
        extraction_confidence = self._compute_confidence(
            merged_items, decisions, risks
        )

        return AgentResult(
            success=True,
            data={
                "action_items": merged_items,
                "decisions": decisions,
                "risks": risks,
                "extraction_confidence": extraction_confidence,
                "ambiguous_items": ambiguous_items,
                "item_count": len(merged_items),
                "decision_count": len(decisions),
                "risk_count": len(risks),
            },
            reasoning=f"Extracted {len(merged_items)} action items, "
                      f"{len(decisions)} decisions, {len(risks)} risks",
            confidence=extraction_confidence,
            next_steps=[
                "Verify extracted items",
                "Assign owners where missing",
                "Set deadlines where missing",
            ],
        )

    def _extract_action_items(
        self,
        transcript: str,
        segments: List[Dict],
        speaker_map: Dict[str, str],
    ) -> List[Dict]:
        items = []
        seen = set()
        sentences = re.split(r'(?<=[.!?])\s+', transcript)

        action_segment_text = ""
        for seg in segments:
            if seg.get("topic") == "action_items":
                action_segment_text = seg.get("text", "")

        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence or len(sentence) < 10:
                continue

            lower = sentence.lower()

            if not any(ind in lower for ind in ACTION_INDICATORS):
                continue

            norm = self._normalize(sentence)
            if norm in seen:
                continue
            seen.add(norm)

            owner = self._infer_owner(sentence, speaker_map)
            deadline = self._infer_deadline(sentence)

            items.append({
                "id": str(uuid4()),
                "description": sentence,
                "owner": owner,
                "deadline": deadline,
                "priority": self._infer_priority(sentence),
                "status": "pending",
                "confidence": self._score_action_confidence(sentence),
                "source": "explicit",
                "extracted_at": datetime.utcnow().isoformat(),
            })

        if action_segment_text:
            action_sentences = re.split(r'(?<=[.!?])\s+', action_segment_text)
            for sentence in action_sentences:
                sentence = sentence.strip()
                if not sentence or len(sentence) < 10:
                    continue
                norm = self._normalize(sentence)
                if norm in seen:
                    continue
                seen.add(norm)

                owner = self._infer_owner(sentence, speaker_map)
                deadline = self._infer_deadline(sentence)

                items.append({
                    "id": str(uuid4()),
                    "description": sentence,
                    "owner": owner,
                    "deadline": deadline,
                    "priority": self._infer_priority(sentence),
                    "status": "pending",
                    "confidence": self._score_action_confidence(sentence),
                    "source": "action_segment",
                    "extracted_at": datetime.utcnow().isoformat(),
                })

        implicit = self._extract_implicit_items(
            transcript, sentences, seen, speaker_map
        )
        items.extend(implicit)

        return items

    def _extract_implicit_items(
        self,
        transcript: str,
        sentences: List[str],
        seen: set,
        speaker_map: Dict[str, str],
    ) -> List[Dict]:
        implicit = []
        task_keywords = [
            "needs to", "should", "must", "has to", "ought to",
            "could you", "can you", "would you", "please",
            "don't forget", "remember to", "make sure",
            "important to", "critical to", "necessary to",
        ]

        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence or len(sentence) < 15:
                continue

            lower = sentence.lower()
            if not any(kw in lower for kw in task_keywords):
                continue

            norm = self._normalize(sentence)
            if norm in seen:
                continue
            seen.add(norm)

            implicit.append({
                "id": str(uuid4()),
                "description": sentence,
                "owner": self._infer_owner(sentence, speaker_map),
                "deadline": self._infer_deadline(sentence),
                "priority": self._infer_priority(sentence),
                "status": "pending",
                "confidence": self._score_action_confidence(sentence) * 0.7,
                "source": "implicit",
                "extracted_at": datetime.utcnow().isoformat(),
            })

        return implicit

    def _extract_decisions(self, transcript: str,
                            segments: List[Dict]) -> List[Dict]:
        decisions = []
        seen = set()
        sentences = re.split(r'(?<=[.!?])\s+', transcript)

        for seg in segments:
            if seg.get("topic") == "decision":
                text = seg.get("text", "")
                seg_sentences = re.split(r'(?<=[.!?])\s+', text)
                for sentence in seg_sentences:
                    sentence = sentence.strip()
                    if not sentence or len(sentence) < 10:
                        continue
                    norm = self._normalize(sentence)
                    if norm in seen:
                        continue
                    seen.add(norm)
                    decisions.append({
                        "id": str(uuid4()),
                        "description": sentence,
                        "context": self._extract_decision_context(sentence, transcript),
                        "confidence": 0.85,
                    })

        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence or len(sentence) < 10:
                continue
            lower = sentence.lower()
            if not any(ind in lower for ind in DECISION_INDICATORS):
                continue
            norm = self._normalize(sentence)
            if norm in seen:
                continue
            seen.add(norm)

            decisions.append({
                "id": str(uuid4()),
                "description": sentence,
                "context": self._extract_decision_context(sentence, transcript),
                "confidence": 0.75,
            })

        return decisions

    def _extract_risks(self, transcript: str,
                        segments: List[Dict]) -> List[Dict]:
        risks = []
        seen = set()
        sentences = re.split(r'(?<=[.!?])\s+', transcript)

        for seg in segments:
            if seg.get("topic") == "blockers":
                text = seg.get("text", "")
                seg_sentences = re.split(r'(?<=[.!?])\s+', text)
                for sentence in seg_sentences:
                    sentence = sentence.strip()
                    if not sentence or len(sentence) < 10:
                        continue
                    norm = self._normalize(sentence)
                    if norm in seen:
                        continue
                    seen.add(norm)
                    risks.append({
                        "id": str(uuid4()),
                        "description": sentence,
                        "severity": self._assess_risk_severity(sentence),
                        "confidence": 0.8,
                    })

        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence or len(sentence) < 10:
                continue
            lower = sentence.lower()
            if not any(ind in lower for ind in RISK_INDICATORS):
                continue
            norm = self._normalize(sentence)
            if norm in seen:
                continue
            seen.add(norm)

            risks.append({
                "id": str(uuid4()),
                "description": sentence,
                "severity": self._assess_risk_severity(sentence),
                "confidence": 0.7,
            })

        return risks

    def _infer_owner(self, sentence: str,
                      speaker_map: Dict[str, str]) -> Optional[str]:
        lower = sentence.lower()

        patterns = [
            r"(?:assign|assigned|responsible|owner)[:\s]+([A-Za-z\s]+?)(?:\.|,|$)",
            r"(?:to\s+)([A-Za-z]+)(?:\s+(?:will|to|\.|,|$))",
            r"(?:^|\s)([A-Za-z]+)\s+(?:will|can|is going to)\s",
        ]

        for pattern in patterns:
            match = re.search(pattern, sentence)
            if match:
                name = match.group(1).strip().lower()
                if name in speaker_map or name in [s.lower() for s in speaker_map]:
                    return name

        if speaker_map:
            for speaker_name in speaker_map:
                if speaker_name.lower() in lower:
                    return speaker_name

        return None

    def _infer_deadline(self, sentence: str) -> Optional[str]:
        lower = sentence.lower()
        today = datetime.utcnow()

        for pattern, days in DEADLINE_PATTERNS:
            match = re.search(pattern, lower)
            if match:
                if days == 90:
                    quarter_str = match.group(1).upper()
                    quarter_num = 1
                    if "Q2" in quarter_str:
                        quarter_num = 2
                    elif "Q3" in quarter_str:
                        quarter_num = 3
                    elif "Q4" in quarter_str:
                        quarter_num = 4
                    year = today.year
                    if quarter_num == 1:
                        deadline_date = datetime(year, 3, 31)
                    elif quarter_num == 2:
                        deadline_date = datetime(year, 6, 30)
                    elif quarter_num == 3:
                        deadline_date = datetime(year, 9, 30)
                    else:
                        deadline_date = datetime(year, 12, 31)
                    if deadline_date < today:
                        deadline_date = deadline_date.replace(year=year + 1)
                    return deadline_date.isoformat()

                matched_text = match.group(1)
                if matched_text in ("today", "eod", "asap", "immediately", "urgent"):
                    deadline_date = today
                elif matched_text in ("tomorrow",):
                    deadline_date = today + timedelta(days=1)
                elif matched_text in ("this week", "eow", "friday"):
                    days_ahead = 4 - today.weekday()
                    if days_ahead <= 0:
                        days_ahead += 7
                    deadline_date = today + timedelta(days=days_ahead)
                elif matched_text in ("next week",):
                    deadline_date = today + timedelta(days=7)
                elif days == 1:
                    deadline_date = today + timedelta(days=1)
                elif days == 5:
                    deadline_date = today + timedelta(days=5)
                elif days == 7:
                    deadline_date = today + timedelta(days=7)
                elif days == 14:
                    deadline_date = today + timedelta(days=14)
                elif days == 30:
                    try:
                        deadline_date = today + timedelta(days=30)
                    except (ValueError, AttributeError):
                        deadline_date = today + timedelta(days=30)
                else:
                    deadline_date = today + timedelta(days=days)

                return deadline_date.isoformat()

        return None

    def _infer_priority(self, sentence: str) -> str:
        lower = sentence.lower()
        urgent_words = ["urgent", "critical", "asap", "immediately",
                         "blocker", "p0", "p1", "top priority", "highest"]
        high_words = ["important", "high priority", "p2", "soon",
                       "need this", "must have"]
        low_words = ["nice to have", "low priority", "someday",
                      "not urgent", "when you get a chance"]

        if any(w in lower for w in urgent_words):
            return "urgent"
        if any(w in lower for w in high_words):
            return "high"
        if any(w in lower for w in low_words):
            return "low"
        return "medium"

    def _assess_risk_severity(self, sentence: str) -> str:
        lower = sentence.lower()
        critical_words = ["critical", "blocker", "blocked", "urgent",
                           "sev", "outage", "down", "crash", "security"]
        high_words = ["major", "significant", "serious", "important",
                       "high", "risk", "concern"]
        low_words = ["minor", "small", "trivial", "low", "slight"]

        if any(w in lower for w in critical_words):
            return "critical"
        if any(w in lower for w in high_words):
            return "high"
        if any(w in lower for w in low_words):
            return "low"
        return "medium"

    def _score_action_confidence(self, sentence: str) -> float:
        lower = sentence.lower()
        score = 0.5

        explicit = ["i will", "i'll", "assign", "todo", "action item"]
        if any(e in lower for e in explicit):
            score += 0.3

        has_owner = self._infer_owner(sentence, {}) is not None
        if has_owner:
            score += 0.15

        has_deadline = self._infer_deadline(sentence) is not None
        if has_deadline:
            score += 0.15

        length_factor = min(1.0, len(sentence) / 200)
        score += length_factor * 0.1

        return min(1.0, score)

    def _extract_decision_context(self, decision_text: str,
                                   transcript: str) -> str:
        idx = transcript.find(decision_text)
        if idx == -1:
            return ""

        start = max(0, idx - 200)
        end = min(len(transcript), idx + len(decision_text) + 200)
        context = transcript[start:end]

        if len(context) > 400:
            context = context[:400] + "..."

        return context

    def _identify_ambiguous_items(self, items: List[Dict]) -> List[Dict]:
        ambiguous = []
        for item in items:
            issues = []
            if not item.get("owner"):
                issues.append("missing_owner")
            if not item.get("deadline"):
                issues.append("missing_deadline")
            if item.get("confidence", 1.0) < 0.5:
                issues.append("low_confidence")

            if issues:
                ambiguous.append({
                    "id": item["id"],
                    "description": item["description"],
                    "issues": issues,
                    "suggestion": self._generate_suggestion(issues),
                })
        return ambiguous

    def _merge_with_planner_tasks(self, action_items: List[Dict],
                                    planner_tasks: List[Dict]) -> List[Dict]:
        if not planner_tasks:
            return action_items

        merged = list(action_items)
        seen_descriptions = {self._normalize(a["description"]) for a in action_items}

        for task in planner_tasks:
            desc = task.get("description", "")
            norm = self._normalize(desc)
            if norm and norm not in seen_descriptions:
                seen_descriptions.add(norm)
                merged.append({
                    "id": task.get("id", str(uuid4())),
                    "description": desc,
                    "owner": task.get("owner"),
                    "deadline": task.get("deadline"),
                    "priority": task.get("priority", "medium"),
                    "status": "pending",
                    "confidence": 0.65,
                    "source": "planner",
                    "extracted_at": datetime.utcnow().isoformat(),
                })

        return merged

    def _compute_confidence(self, action_items: List[Dict],
                             decisions: List[Dict],
                             risks: List[Dict]) -> float:
        if not action_items and not decisions:
            return 0.0

        scores = [i.get("confidence", 0.5) for i in action_items]
        avg_score = sum(scores) / max(len(scores), 1) if scores else 0.5

        has_decisions = len(decisions) > 0
        has_risks = len(risks) > 0

        confidence = avg_score
        if has_decisions:
            confidence += 0.05
        if has_risks:
            confidence += 0.05

        return min(1.0, confidence)

    def _generate_suggestion(self, issues: List[str]) -> str:
        suggestions = {
            "missing_owner": "Review transcript for owner assignment or assign manually",
            "missing_deadline": "Infer deadline from context or set default (7 days)",
            "low_confidence": "Manual review recommended for this item",
        }
        return "; ".join(suggestions.get(i, "") for i in issues)

    def _normalize(self, text: str) -> str:
        return re.sub(r'\s+', ' ', text.lower().strip())
