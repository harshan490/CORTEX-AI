import re
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from agents.base_agent import BaseAgent, AgentContext, AgentResult


logger = logging.getLogger("agent.meeting")


MEETING_TYPES = {
    "standup": {
        "keywords": ["yesterday", "today", "blocker", "standup"],
        "avg_duration_min": 15,
    },
    "planning": {
        "keywords": ["sprint", "planning", "story", "backlog", "priority"],
        "avg_duration_min": 60,
    },
    "review": {
        "keywords": ["review", "demo", "showcase", "feedback", "completed"],
        "avg_duration_min": 45,
    },
    "retrospective": {
        "keywords": ["retro", "improve", "went well", "action item"],
        "avg_duration_min": 60,
    },
    "one_on_one": {
        "keywords": ["1:1", "career", "growth", "personal"],
        "avg_duration_min": 30,
    },
    "design": {
        "keywords": ["design", "architecture", "proposal", "decision"],
        "avg_duration_min": 45,
    },
    "brainstorm": {
        "keywords": ["brainstorm", "idea", "explore", "what if"],
        "avg_duration_min": 45,
    },
    "incident": {
        "keywords": ["incident", "outage", "bug", "critical", "hotfix"],
        "avg_duration_min": 30,
    },
}


class MeetingIntelligenceAgent(BaseAgent):
    def __init__(self, config: Optional[Dict] = None):
        super().__init__(name="meeting", config=config)

    async def process(self, context: AgentContext) -> AgentResult:
        meeting_data = context.state.get("meeting_data", {})
        transcript = meeting_data.get("transcript", "")
        participants = meeting_data.get("participants", [])
        metadata = meeting_data.get("metadata", {})

        if not transcript:
            return AgentResult(
                success=False,
                error="No transcript provided",
                reasoning="Meeting Intelligence requires a transcript to analyze",
            )

        self.log(f"Analyzing meeting transcript ({len(transcript)} chars)")

        meeting_type = await self._classify_meeting_type(transcript, metadata)
        speaker_map = await self._identify_speakers(transcript, participants)
        segments = self._segment_transcript(transcript, speaker_map)
        agenda = self._extract_agenda(segments)
        key_points = self._extract_key_points(transcript, meeting_type)
        sentiment = self._analyze_sentiment(transcript)

        return AgentResult(
            success=True,
            data={
                "meeting_type": meeting_type,
                "agenda": agenda,
                "speaker_map": speaker_map,
                "segments": segments,
                "key_points": key_points,
                "sentiment": sentiment,
                "transcript_length": len(transcript),
                "participant_count": len(participants),
                "analysis_timestamp": datetime.utcnow().isoformat(),
            },
            reasoning=f"Classified as '{meeting_type}' meeting with {len(key_points)} "
                      f"key points, {len(segments)} segments, "
                      f"sentiment {sentiment['overall']:.2f}",
            confidence=0.85 if meeting_type != "general" else 0.6,
            next_steps=["Proceed to planning", "Extract action items"],
        )

    async def _classify_meeting_type(self, transcript: str,
                                      metadata: Dict) -> str:
        text_lower = transcript.lower()
        scores: Dict[str, int] = {}

        for mtype, info in MEETING_TYPES.items():
            score = sum(1 for kw in info["keywords"] if kw in text_lower)
            if score > 0:
                scores[mtype] = score

        explicit = metadata.get("meeting_type", "").lower()
        if explicit in MEETING_TYPES:
            scores[explicit] = scores.get(explicit, 0) + 5

        title = metadata.get("title", "").lower()
        for mtype, info in MEETING_TYPES.items():
            if any(kw in title for kw in info["keywords"]):
                scores[mtype] = scores.get(mtype, 0) + 3

        if not scores:
            return "general"

        return max(scores, key=scores.get)

    async def _identify_speakers(self, transcript: str,
                                  participants: List) -> Dict[str, str]:
        speaker_map: Dict[str, str] = {}
        common_roles = {
            "manager": ["manager", "lead", "head of"],
            "engineer": ["engineer", "developer", "sde", "software"],
            "designer": ["designer", "ux", "ui"],
            "product": ["product manager", "pm", "product owner"],
            "scrum_master": ["scrum master", "scrum"],
            "director": ["director", "vp", "vice president"],
            " stakeholder": ["stakeholder", "client", "customer"],
        }

        for participant in participants:
            name = ""
            role = "member"
            if isinstance(participant, dict):
                name = participant.get("name", participant.get("email", "unknown"))
                role = participant.get("role", "member")
            elif isinstance(participant, str):
                name = participant

            if role == "member" or not role:
                name_lower = name.lower()
                for std_role, keywords in common_roles.items():
                    if any(kw in name_lower for kw in keywords):
                        role = std_role
                        break

            speaker_map[name] = role

        if not speaker_map:
            lines = transcript.strip().split("\n")
            for line in lines[:10]:
                match = re.match(r"^([A-Za-z\s]+?)\s*:", line)
                if match:
                    name = match.group(1).strip()
                    if name not in speaker_map:
                        speaker_map[name] = "member"

        return speaker_map or {"unknown": "member"}

    def _segment_transcript(self, transcript: str,
                             speaker_map: Dict[str, str]) -> List[Dict]:
        lines = transcript.strip().split("\n")
        segments: List[Dict] = []
        current_topic = "introduction"
        current_segment: Dict = {
            "topic": current_topic,
            "start_line": 0,
            "lines": [],
            "speakers": set(),
            "text": "",
        }

        topic_keywords = {
            "status_update": ["update", "progress", "status", "currently",
                              "working on"],
            "blockers": ["blocker", "blocked", "stuck", "issue", "problem",
                         "waiting on"],
            "planning": ["plan", "next", "upcoming", "goal", "sprint"],
            "discussion": ["think", "opinion", "suggest", "propose",
                           "what about"],
            "decision": ["decide", "decision", "agreed", "consensus",
                         "let's go with"],
            "action_items": ["action item", "todo", "to-do", "assign",
                             "will do", "follow up"],
        }

        for i, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue

            line_lower = line.lower()
            detected_topic = None

            for topic, keywords in topic_keywords.items():
                if any(kw in line_lower for kw in keywords):
                    detected_topic = topic
                    break

            if detected_topic and detected_topic != current_topic:
                if current_segment["lines"]:
                    current_segment["text"] = "\n".join(current_segment["lines"])
                    current_segment["speakers"] = list(current_segment["speakers"])
                    segments.append(current_segment)

                current_topic = detected_topic
                current_segment = {
                    "topic": current_topic,
                    "start_line": i,
                    "lines": [],
                    "speakers": set(),
                    "text": "",
                }

            current_segment["lines"].append(line)

            for speaker_name in speaker_map:
                if line.lower().startswith(speaker_name.lower()):
                    current_segment["speakers"].add(speaker_name)

        if current_segment["lines"]:
            current_segment["text"] = "\n".join(current_segment["lines"])
            current_segment["speakers"] = list(current_segment["speakers"])
            segments.append(current_segment)

        return segments

    def _extract_agenda(self, segments: List[Dict]) -> List[Dict]:
        agenda = []
        for i, seg in enumerate(segments):
            agenda.append({
                "topic": seg["topic"],
                "order": i + 1,
                "line_count": len(seg["lines"]),
                "speakers": seg["speakers"],
                "preview": seg["text"][:100] if seg["text"] else "",
            })
        return agenda

    def _extract_key_points(self, transcript: str,
                             meeting_type: str) -> List[str]:
        lines = transcript.strip().split("\n")
        key_points = []
        indicators = [
            "important", "critical", "key", "remember", "notable",
            "significant", "key point", "highlight", "summary",
            "to summarize", "in conclusion", "bottom line",
            "main takeaway", "crucial", "essential", "vital",
        ]

        for line in lines:
            line_lower = line.lower()
            if any(ind in line_lower for ind in indicators):
                cleaned = line.strip()
                if cleaned and len(cleaned) > 15 and cleaned not in key_points:
                    key_points.append(cleaned)

        if meeting_type == "standup":
            for line in lines:
                if any(w in line.lower() for w in ["blocker", "blocked"]):
                    cleaned = line.strip()
                    if cleaned and cleaned not in key_points:
                        key_points.append(f"[BLOCKER] {cleaned}")

        if not key_points:
            if len(lines) > 5:
                middle = len(lines) // 2
                key_points.append(f"Segment summary: {lines[middle][:100]}")
            else:
                key_points.append("Meeting transcript too short for key point extraction")

        return key_points[:10]

    def _analyze_sentiment(self, transcript: str) -> Dict[str, Any]:
        positive_words = {
            "great", "good", "excellent", "amazing", "awesome", "fantastic",
            "wonderful", "happy", "pleased", "satisfied", "love", "perfect",
            "brilliant", "outstanding", "terrific", "superb", "impressive",
            "positive", "optimistic", "confident", "thank", "thanks",
            "appreciate", "welcome", "congratulations", "celebrate",
            "success", "achievement", "milestone", "progress",
        }

        negative_words = {
            "bad", "terrible", "awful", "horrible", "worst", "hate",
            "disappointed", "unhappy", "frustrated", "annoyed", "angry",
            "upset", "sad", "depressing", "negative", "pessimistic",
            "concerned", "worried", "anxious", "problem", "issue",
            "fail", "failed", "failure", "broken", "bug", "error",
            "crash", "critical", "urgent", "blocker", "blocked",
            "difficult", "hard", "challenging", "struggle",
            "disaster", "catastrophe", "toxic", "stress",
        }

        words = transcript.lower().split()
        if not words:
            return {"overall": 0.5, "positive_score": 0.0, "negative_score": 0.0, "label": "neutral"}

        pos_count = sum(1 for w in words if w.strip(".,!?;:") in positive_words)
        neg_count = sum(1 for w in words if w.strip(".,!?;:") in negative_words)
        total = len(words)

        positive_score = pos_count / max(total, 1) * 100
        negative_score = neg_count / max(total, 1) * 100
        overall = 0.5 + (positive_score - negative_score) / 100
        overall = max(0.0, min(1.0, overall))

        if overall > 0.65:
            label = "positive"
        elif overall < 0.35:
            label = "negative"
        else:
            label = "neutral"

        return {
            "overall": round(overall, 4),
            "positive_score": round(positive_score, 2),
            "negative_score": round(negative_score, 2),
            "label": label,
            "positive_count": pos_count,
            "negative_count": neg_count,
        }
