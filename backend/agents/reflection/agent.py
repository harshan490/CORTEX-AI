import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from uuid import uuid4

from agents.base_agent import BaseAgent, AgentContext, AgentResult


logger = logging.getLogger("agent.reflection")


class ReflectionAgent(BaseAgent):
    def __init__(self, config: Optional[Dict] = None):
        super().__init__(name="reflection", config=config)

    async def process(self, context: AgentContext) -> AgentResult:
        meeting_data = context.state.get("meeting_data", {})
        transcript = meeting_data.get("transcript", "")
        action_item_output = context.state.get("action_item_output", {})
        planner_output = context.state.get("planner_output", {})
        verifier_output = context.state.get("verifier_output", {})
        meeting_analysis = context.state.get("meeting_analysis", {})

        action_items = action_item_output.get("action_items", [])
        decisions = action_item_output.get("decisions", [])
        risks = action_item_output.get("risks", [])
        planner_tasks = planner_output.get("tasks", [])
        verifier_issues = verifier_output.get("issues", [])

        self.log("Running self-reflection on extracted results")

        missed_items = self._find_missed_items(
            transcript, action_items, meeting_analysis
        )
        inferred_deadlines = self._infer_missing_deadlines(
            action_items, transcript
        )
        conflicts = self._find_conflicts(
            action_items, decisions, planner_tasks
        )
        alternative_plans = self._suggest_alternatives(
            planner_tasks, meeting_analysis
        )
        additional_risks = self._detect_additional_risks(
            transcript, risks, meeting_analysis
        )
        confidence_assessment = self._self_assess(
            action_items, decisions, risks,
            missed_items, conflicts, verifier_issues
        )
        reflection_notes = self._generate_reflection_notes(
            missed_items, conflicts, additional_risks, alternative_plans,
            confidence_assessment
        )

        return AgentResult(
            success=True,
            data={
                "missed_items": missed_items,
                "inferred_deadlines": inferred_deadlines,
                "conflicts": conflicts,
                "alternative_plans": alternative_plans,
                "additional_risks": additional_risks,
                "confidence_assessment": confidence_assessment,
                "reflection_notes": reflection_notes,
                "reflection_timestamp": datetime.utcnow().isoformat(),
            },
            reasoning=f"Reflection found {len(missed_items)} missed items, "
                      f"{len(conflicts)} conflicts, {len(additional_risks)} additional risks. "
                      f"Self-confidence: {confidence_assessment.get('overall', 0.5):.2f}",
            confidence=confidence_assessment.get("overall", 0.5),
            next_steps=[
                "Review missed items and add as needed",
                "Resolve identified conflicts",
                "Evaluate alternative plans",
                "Proceed to execution",
            ],
        )

    def _find_missed_items(
        self,
        transcript: str,
        action_items: List[Dict],
        meeting_analysis: Dict,
    ) -> List[Dict]:
        missed = []
        existing_descs = {
            self._normalize(i.get("description", "")) for i in action_items
        }

        signals = [
            ("promise", r"\b(will|gonna|plan to|intend to)\b"),
            ("obligation", r"\b(need to|must|should|have to|has to)\b"),
            ("request", r"\b(can you|could you|would you|please)\b"),
            ("delegation", r"\b(assign|responsible|owner|handle|take care of)\b"),
            ("follow_up", r"\b(follow up|check|circle back|revisit)\b"),
        ]

        lines = transcript.strip().split("\n")
        for i, line in enumerate(lines):
            line = line.strip()
            if not line or len(line) < 20:
                continue

            lower = line.lower()
            norm = self._normalize(line)

            if norm in existing_descs:
                continue

            for signal_type, pattern in signals:
                import re
                if re.search(pattern, lower):
                    matched = False
                    for existing in existing_descs:
                        words = set(norm.split())
                        existing_words = set(existing.split())
                        overlap = len(words & existing_words) / max(len(words | existing_words), 1)
                        if overlap > 0.6:
                            matched = True
                            break

                    if not matched:
                        missed.append({
                            "id": str(uuid4()),
                            "description": line[:200],
                            "signal_type": signal_type,
                            "line_number": i,
                            "confidence": 0.55 if signal_type == "promise" else 0.5,
                            "reasoning": f"Line contains '{signal_type}' signal but no "
                                         f"matching action item was extracted",
                        })
                    break

        return missed[:10]

    def _infer_missing_deadlines(
        self,
        action_items: List[Dict],
        transcript: str,
    ) -> List[Dict]:
        inferred = []
        today = datetime.utcnow()

        for item in action_items:
            if item.get("deadline"):
                continue

            desc = item.get("description", "")
            lower = desc.lower()
            owner = item.get("owner")
            priority = item.get("priority", "medium")

            deadline_delta = 7
            reasoning = "Default: 7 days (no specific deadline mentioned)"

            if priority == "urgent":
                deadline_delta = 1
                reasoning = "Urgent priority inferred: 1 day"
            elif priority == "high":
                deadline_delta = 3
                reasoning = "High priority inferred: 3 days"
            elif priority == "low":
                deadline_delta = 14
                reasoning = "Low priority inferred: 14 days"

            if "by friday" in lower:
                days_ahead = (4 - today.weekday()) % 7
                if days_ahead == 0:
                    days_ahead = 7
                deadline_delta = days_ahead
                reasoning = "Phrase 'by Friday' detected"
            elif "by monday" in lower:
                days_ahead = (0 - today.weekday()) % 7
                if days_ahead <= 0:
                    days_ahead += 7
                deadline_delta = days_ahead
                reasoning = "Phrase 'by Monday' detected"
            elif "next week" in lower:
                deadline_delta = 7
                reasoning = "Phrase 'next week' detected"
            elif "this week" in lower:
                deadline_delta = 5
                reasoning = "Phrase 'this week' detected"
            elif "asap" in lower or "urgent" in lower:
                deadline_delta = 2
                reasoning = "Keyword 'ASAP' or 'urgent' detected"

            deadline_date = today + timedelta(days=deadline_delta)
            inferred.append({
                "item_id": item.get("id", ""),
                "description": desc[:100],
                "suggested_deadline": deadline_date.isoformat(),
                "reasoning": reasoning,
                "confidence": 0.6 if reasoning.startswith("Default") else 0.8,
            })

        return inferred

    def _find_conflicts(
        self,
        action_items: List[Dict],
        decisions: List[Dict],
        planner_tasks: List[Dict],
    ) -> List[Dict]:
        conflicts = []

        decision_texts = [d.get("description", "").lower() for d in decisions]

        for item in action_items:
            desc = item.get("description", "").lower()
            for decision_text in decision_texts:
                if self._is_contradictory(desc, decision_text):
                    conflicts.append({
                        "id": str(uuid4()),
                        "type": "item_vs_decision",
                        "description": f"Action item conflicts with decision",
                        "item_ref": item.get("description", "")[:80],
                        "decision_ref": decision_text[:80],
                        "severity": "high",
                        "resolution_suggestion": "Review discussion context to determine intent",
                    })

        owner_tasks: Dict[str, List[str]] = {}
        for item in action_items:
            owner = item.get("owner", "unassigned")
            if owner not in owner_tasks:
                owner_tasks[owner] = []
            owner_tasks[owner].append(item.get("description", ""))

        for owner, tasks in owner_tasks.items():
            time_estimate = sum(
                len(t.split()) * 0.05 for t in tasks
            )
            if time_estimate > 8:
                conflicts.append({
                    "id": str(uuid4()),
                    "type": "workload_imbalance",
                    "description": f"{owner} has ~{time_estimate:.1f}h estimated work",
                    "item_ref": f"{len(tasks)} tasks assigned",
                    "decision_ref": "",
                    "severity": "medium",
                    "resolution_suggestion": f"Re-distribute tasks from {owner} to balance workload",
                })

        return conflicts

    def _is_contradictory(self, text1: str, text2: str) -> bool:
        contrast_pairs = [
            ("implement", "remove"),
            ("add", "deprecate"),
            ("increase", "decrease"),
            ("start", "stop"),
            ("enable", "disable"),
            ("use", "migrate from"),
            ("upgrade", "downgrade"),
            ("expand", "reduce"),
        ]

        for a, b in contrast_pairs:
            if (a in text1 and b in text2) or (b in text1 and a in text2):
                return True
        return False

    def _suggest_alternatives(
        self,
        planner_tasks: List[Dict],
        meeting_analysis: Dict,
    ) -> List[Dict]:
        alternatives = []

        if len(planner_tasks) > 5:
            parallel_groups = []
            for i in range(0, len(planner_tasks), 3):
                group = planner_tasks[i:i + 3]
                parallel_groups.append([t.get("id", "") for t in group])

            alternatives.append({
                "id": str(uuid4()),
                "type": "parallel_execution",
                "description": "Group tasks into parallel execution batches",
                "suggestion": f"Tasks can be organized into {len(parallel_groups)} "
                              f"parallel groups instead of sequential execution",
                "expected_improvement": f"~{len(parallel_groups) * 2}h reduction in total time",
                "confidence": 0.65,
            })

        priority_grouping = {}
        for task in planner_tasks:
            pri = task.get("priority", "medium")
            priority_grouping.setdefault(pri, []).append(task.get("description", "")[:60])

        if "urgent" in priority_grouping and len(priority_grouping["urgent"]) > 2:
            alternatives.append({
                "id": str(uuid4()),
                "type": "priority_focus",
                "description": "Focus sprint on urgent items first",
                "suggestion": f"Complete {len(priority_grouping['urgent'])} urgent items "
                              f"before starting medium/low priority work",
                "expected_improvement": "Reduced risk of missed deadlines",
                "confidence": 0.8,
            })

        meeting_type = meeting_analysis.get("meeting_type", "general")
        if meeting_type == "standup" and not planner_tasks:
            alternatives.append({
                "id": str(uuid4()),
                "type": "follow_up_meeting",
                "description": "Schedule a planning session",
                "suggestion": "Standup identified work items but no detailed plan was "
                              "created. Recommend scheduling a planning session.",
                "expected_improvement": "Clear task assignments and timelines",
                "confidence": 0.9,
            })

        return alternatives

    def _detect_additional_risks(
        self,
        transcript: str,
        existing_risks: List[Dict],
        meeting_analysis: Dict,
    ) -> List[Dict]:
        additional = []
        existing_texts = {r.get("description", "").lower() for r in existing_risks}

        risk_patterns = [
            (r"\b(depends? on|blocked by|waiting for)\b", "dependency",
             "External dependency identified"),
            (r"\b(tight|aggressive|unrealistic)\s+(deadline|timeline|schedule)\b",
             "timeline", "Aggressive timeline risk"),
            (r"\b(scope creep|expanding|gold plating)\b", "scope",
             "Potential scope creep identified"),
            (r"\b(unclear|ambiguous|not defined)\s+(requirement|spec|goal)\b",
             "requirements", "Unclear requirements risk"),
            (r"\b(understaffed|overworked|burnout|too much)\b",
             "resources", "Resource constraint risk"),
            (r"\b(tech debt|technical debt|legacy)\b",
             "technical", "Technical debt may impact velocity"),
            (r"\b(integration|compatibility|merge conflict)\b",
             "integration", "Integration risk identified"),
            (r"\b(regulatory|compliance|audit|legal)\b",
             "compliance", "Compliance or regulatory risk"),
        ]

        lines = transcript.strip().split("\n")
        for line in lines:
            lower = line.lower()
            import re
            for pattern, risk_type, description in risk_patterns:
                if re.search(pattern, lower):
                    if lower not in existing_texts:
                        additional.append({
                            "id": str(uuid4()),
                            "description": f"[{risk_type}] {line.strip()[:150]}",
                            "risk_type": risk_type,
                            "severity": self._assess_risk_severity(line),
                            "confidence": 0.6,
                            "reasoning": description,
                        })
                        existing_texts.add(lower)
                    break

        sentiment = meeting_analysis.get("sentiment", {})
        if sentiment.get("label") == "negative" and sentiment.get("overall", 0.5) < 0.3:
            additional.append({
                "id": str(uuid4()),
                "description": "Negative meeting sentiment may indicate team friction "
                               "or unresolved issues",
                "risk_type": "team_dynamics",
                "severity": "medium",
                "confidence": 0.7,
                "reasoning": "Overall sentiment score indicates negative tone",
            })

        return additional

    def _assess_risk_severity(self, text: str) -> str:
        lower = text.lower()
        if any(w in lower for w in ["critical", "blocker", "urgent",
                                      "security", "compliance"]):
            return "critical"
        if any(w in lower for w in ["high", "significant", "major",
                                      "aggressive", "unrealistic"]):
            return "high"
        if any(w in lower for w in ["minor", "small", "slight"]):
            return "low"
        return "medium"

    def _self_assess(
        self,
        action_items: List[Dict],
        decisions: List[Dict],
        risks: List[Dict],
        missed_items: List[Dict],
        conflicts: List[Dict],
        verifier_issues: List[Dict],
    ) -> Dict[str, Any]:
        factors = {}

        extraction_rate = len(action_items) / max(len(action_items) + len(missed_items), 1)
        factors["extraction_completeness"] = round(extraction_rate, 3)

        avg_confidence = 0.5
        if action_items:
            avg_confidence = sum(
                i.get("confidence", 0.5) for i in action_items
            ) / len(action_items)
        factors["average_item_confidence"] = round(avg_confidence, 3)

        conflict_penalty = len(conflicts) * 0.05
        factors["conflict_penalty"] = round(min(0.5, conflict_penalty), 3)

        risk_coverage = len(risks) / max(len(risks) + 1, 1)
        factors["risk_coverage"] = round(min(1.0, risk_coverage), 3)

        verifier_score = 50
        if verifier_issues:
            score = 100 - len(verifier_issues) * 5
            verifier_score = max(0, min(100, score))
        factors["verifier_alignment"] = round(verifier_score / 100, 3)

        overall = (
            extraction_rate * 0.3
            + avg_confidence * 0.25
            + (1 - min(0.5, conflict_penalty)) * 0.15
            + risk_coverage * 0.1
            + (verifier_score / 100) * 0.2
        )
        overall = max(0.0, min(1.0, overall))

        if overall > 0.8:
            assessment = "high"
        elif overall > 0.5:
            assessment = "medium"
        else:
            assessment = "low"

        recommendations = []
        if extraction_rate < 0.7:
            recommendations.append("Manual review of transcript for missed items")
        if avg_confidence < 0.6:
            recommendations.append("Re-extract with adjusted confidence thresholds")
        if conflicts:
            recommendations.append(f"Resolve {len(conflicts)} identified conflicts")
        if verifier_score < 60:
            recommendations.append("Address verification issues before proceeding")

        return {
            "overall": round(overall, 3),
            "assessment": assessment,
            "factors": factors,
            "recommendations": recommendations,
        }

    def _generate_reflection_notes(
        self,
        missed_items: List[Dict],
        conflicts: List[Dict],
        additional_risks: List[Dict],
        alternative_plans: List[Dict],
        confidence_assessment: Dict[str, Any],
    ) -> List[str]:
        notes = []

        if missed_items:
            notes.append(
                f"Missed {len(missed_items)} potential action items during initial extraction. "
                f"Review lines: {', '.join(str(m.get('line_number', '?')) for m in missed_items[:3])}."
            )
        else:
            notes.append("Extraction appears complete - no missed items detected.")

        if conflicts:
            notes.append(
                f"Detected {len(conflicts)} conflicts requiring resolution "
                f"before execution can proceed."
            )
        else:
            notes.append("No conflicts detected between action items and decisions.")

        if additional_risks:
            notes.append(
                f"Identified {len(additional_risks)} additional risks not captured during "
                f"initial extraction."
            )

        if alternative_plans:
            notes.append(
                f"Generated {len(alternative_plans)} alternative execution strategies "
                f"worth evaluating."
            )

        assessment = confidence_assessment.get("assessment", "unknown")
        overall = confidence_assessment.get("overall", 0.5)
        notes.append(
            f"Self-confidence assessment: {assessment.upper()} ({overall:.2f}). "
            f"{'Proceed with caution' if assessment in ('low', 'medium') else 'Results are reliable'}."
        )

        return notes

    def _normalize(self, text: str) -> str:
        import re
        return re.sub(r'\s+', ' ', text.lower().strip())
