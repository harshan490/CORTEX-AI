import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Set, Tuple
from uuid import uuid4

from agents.base_agent import BaseAgent, AgentContext, AgentResult


logger = logging.getLogger("agent.verifier")


class VerificationIssue:
    def __init__(self, item_id: str, issue_type: str, description: str,
                 severity: str = "medium", suggestion: str = ""):
        self.id = str(uuid4())
        self.item_id = item_id
        self.issue_type = issue_type
        self.description = description
        self.severity = severity
        self.suggestion = suggestion


class VerifierAgent(BaseAgent):
    def __init__(self, config: Optional[Dict] = None):
        super().__init__(name="verifier", config=config)

    async def process(self, context: AgentContext) -> AgentResult:
        action_item_output = context.state.get("action_item_output", {})
        planner_output = context.state.get("planner_output", {})
        meeting_analysis = context.state.get("meeting_analysis", {})

        action_items = action_item_output.get("action_items", [])
        decisions = action_item_output.get("decisions", [])
        risks = action_item_output.get("risks", [])
        planner_tasks = planner_output.get("tasks", [])

        self.log(f"Verifying {len(action_items)} action items, "
                 f"{len(decisions)} decisions, {len(risks)} risks")

        duplicate_check = self._check_duplicates(action_items)
        owner_check = self._check_owners(action_items)
        deadline_check = self._check_deadlines(action_items)
        completeness_check = self._check_completeness(action_items, decisions)
        priority_check = self._check_priorities(action_items)
        cross_ref_check = self._cross_reference_existing(action_items, planner_tasks)

        all_issues = (
            duplicate_check["issues"]
            + owner_check["issues"]
            + deadline_check["issues"]
            + completeness_check["issues"]
            + priority_check["issues"]
            + cross_ref_check["issues"]
        )

        verified_tasks = self._compute_verified_tasks(
            action_items, all_issues
        )
        flagged_tasks = self._compute_flagged_tasks(
            action_items, all_issues
        )

        corrections = self._generate_corrections(all_issues)
        verification_score = self._compute_verification_score(
            action_items, all_issues
        )

        return AgentResult(
            success=True,
            data={
                "verified_tasks": verified_tasks,
                "flagged_tasks": flagged_tasks,
                "issues": [self._issue_to_dict(i) for i in all_issues],
                "corrections": corrections,
                "verification_score": verification_score,
                "summary": {
                    "total_items": len(action_items),
                    "verified_count": len(verified_tasks),
                    "flagged_count": len(flagged_tasks),
                    "issue_count": len(all_issues),
                    "issue_breakdown": self._count_issue_types(all_issues),
                },
            },
            reasoning=f"Verification complete: {len(verified_tasks)} verified, "
                      f"{len(flagged_tasks)} flagged, "
                      f"score {verification_score}/100",
            confidence=min(0.95, 0.5 + 0.05 * verification_score),
            next_steps=[
                "Apply suggested corrections to flagged tasks",
                "Re-verify after corrections",
                "Proceed to reflection",
            ],
        )

    def _check_duplicates(self, items: List[Dict]) -> Dict:
        issues = []
        normalized: Dict[str, List[Dict]] = {}

        for item in items:
            desc = self._normalize(item.get("description", ""))
            if not desc:
                continue
            normalized.setdefault(desc, []).append(item)

        for desc, group in normalized.items():
            if len(group) > 1:
                for item in group[1:]:
                    issues.append(VerificationIssue(
                        item_id=item.get("id", "unknown"),
                        issue_type="duplicate",
                        description=f"Duplicate task: '{desc[:80]}...' "
                                    f"(appears {len(group)} times)",
                        severity="medium",
                        suggestion="Merge duplicate tasks or remove redundant entries",
                    ))

        return {"issues": issues, "duplicate_count": len(issues)}

    def _check_owners(self, items: List[Dict]) -> Dict:
        issues = []
        for item in items:
            owner = item.get("owner")
            if not owner:
                issues.append(VerificationIssue(
                    item_id=item.get("id", "unknown"),
                    issue_type="missing_owner",
                    description=f"No owner assigned: '{item.get('description', '')[:80]}...'",
                    severity="high",
                    suggestion="Review meeting transcript for owner mention or assign manually",
                ))

        return {"issues": issues, "missing_owner_count": len(issues)}

    def _check_deadlines(self, items: List[Dict]) -> Dict:
        issues = []
        for item in items:
            deadline = item.get("deadline")
            priority = item.get("priority", "medium")

            if not deadline:
                if priority in ("urgent", "high"):
                    issues.append(VerificationIssue(
                        item_id=item.get("id", "unknown"),
                        issue_type="missing_deadline",
                        description=f"High-priority task missing deadline: "
                                    f"'{item.get('description', '')[:80]}...'",
                        severity="high",
                        suggestion="High-priority items require explicit deadlines",
                    ))
                else:
                    issues.append(VerificationIssue(
                        item_id=item.get("id", "unknown"),
                        issue_type="missing_deadline",
                        description=f"Task missing deadline: "
                                    f"'{item.get('description', '')[:80]}...'",
                        severity="low",
                        suggestion="Set default deadline of 7 days from now",
                    ))
            else:
                try:
                    deadline_dt = datetime.fromisoformat(deadline)
                    if deadline_dt < datetime.utcnow():
                        issues.append(VerificationIssue(
                            item_id=item.get("id", "unknown"),
                            issue_type="past_deadline",
                            description=f"Deadline already passed: {deadline}",
                            severity="medium",
                            suggestion="Update deadline or mark as overdue",
                        ))
                except (ValueError, TypeError):
                    issues.append(VerificationIssue(
                        item_id=item.get("id", "unknown"),
                        issue_type="invalid_deadline",
                        description=f"Invalid deadline format: {deadline}",
                        severity="medium",
                        suggestion="Re-parse deadline from context or set manually",
                    ))

        return {"issues": issues, "deadline_issue_count": len(issues)}

    def _check_completeness(self, items: List[Dict],
                             decisions: List[Dict]) -> Dict:
        issues = []

        for item in items:
            desc = item.get("description", "")
            if len(desc) < 10:
                issues.append(VerificationIssue(
                    item_id=item.get("id", "unknown"),
                    issue_type="incomplete_description",
                    description=f"Very short description: '{desc}'",
                    severity="medium",
                    suggestion="Expand description with more context from transcript",
                ))

        if not decisions:
            issues.append(VerificationIssue(
                item_id="global",
                issue_type="missing_decisions",
                description="No decisions were extracted from this meeting",
                severity="low",
                suggestion="Review meeting for implicit decisions that may have been missed",
            ))

        confidence_scores = [item.get("confidence", 0.5) for item in items]
        low_conf_items = sum(1 for c in confidence_scores if c < 0.5)
        if low_conf_items > len(items) * 0.5:
            issues.append(VerificationIssue(
                item_id="global",
                issue_type="low_confidence_majority",
                description=f"{low_conf_items}/{len(items)} items have low confidence (<0.5)",
                severity="high",
                suggestion="Manual review strongly recommended for extracted items",
            ))

        return {"issues": issues, "completeness_issue_count": len(issues)}

    def _check_priorities(self, items: List[Dict]) -> Dict:
        issues = []
        urgent_count = sum(1 for i in items if i.get("priority") == "urgent")
        if urgent_count > 3:
            issues.append(VerificationIssue(
                item_id="global",
                issue_type="too_many_urgent",
                description=f"{urgent_count} items marked as urgent - possible over-prioritization",
                severity="medium",
                suggestion="Review if all urgent items are truly critical; "
                          "consider lowering some priorities",
            ))

        for item in items:
            priority = item.get("priority", "medium")
            desc = item.get("description", "")
            if priority == "low" and any(w in desc.lower()
                                          for w in ["urgent", "critical", "blocker"]):
                issues.append(VerificationIssue(
                    item_id=item.get("id", "unknown"),
                    issue_type="priority_mismatch",
                    description=f"Priority '{priority}' but description suggests urgency: '{desc[:80]}...'",
                    severity="medium",
                    suggestion="Re-evaluate priority based on description content",
                ))

        return {"issues": issues, "priority_issue_count": len(issues)}

    def _cross_reference_existing(self, action_items: List[Dict],
                                    planner_tasks: List[Dict]) -> Dict:
        issues = []

        if not planner_tasks:
            return {"issues": issues, "xref_issue_count": 0}

        planner_descs = {self._normalize(t.get("description", ""))
                         for t in planner_tasks if t.get("description")}
        action_descs = {self._normalize(i.get("description", ""))
                        for i in action_items if i.get("description")}

        missing_from_action = planner_descs - action_descs
        for desc in missing_from_action:
            issues.append(VerificationIssue(
                item_id="planner_task",
                issue_type="missing_from_action_items",
                description=f"Planner task not found in action items: '{desc[:80]}...'",
                severity="medium",
                suggestion="Manually add this task to action items if still relevant",
            ))

        return {"issues": issues, "xref_issue_count": len(issues)}

    def _compute_verified_tasks(self, items: List[Dict],
                                  issues: List[VerificationIssue]) -> List[Dict]:
        issue_item_ids = {i.item_id for i in issues if i.item_id != "global"}
        verified = []
        for item in items:
            item_id = item.get("id", "")
            if item_id not in issue_item_ids:
                verified.append(item)
        return verified

    def _compute_flagged_tasks(self, items: List[Dict],
                                 issues: List[VerificationIssue]) -> List[Dict]:
        issue_item_ids = {i.item_id for i in issues if i.item_id != "global"}
        flagged = []
        for item in items:
            item_id = item.get("id", "")
            if item_id in issue_item_ids:
                item_issues = [i for i in issues if i.item_id == item_id]
                flagged.append({
                    "item": item,
                    "issues": [self._issue_to_dict(i) for i in item_issues],
                    "issue_count": len(item_issues),
                })
        return flagged

    def _generate_corrections(self, issues: List[VerificationIssue]) -> List[Dict]:
        corrections = []
        high_severity = [i for i in issues if i.severity == "high"]
        for issue in high_severity:
            if issue.suggestion:
                corrections.append({
                    "item_id": issue.item_id,
                    "issue_type": issue.issue_type,
                    "correction": issue.suggestion,
                    "auto_fixable": issue.issue_type in ("missing_owner", "missing_deadline"),
                })

        medium_issues = [i for i in issues if i.severity == "medium" and i.suggestion]
        for issue in medium_issues[:5]:
            corrections.append({
                "item_id": issue.item_id,
                "issue_type": issue.issue_type,
                "correction": issue.suggestion,
                "auto_fixable": False,
            })

        return corrections

    def _compute_verification_score(self, items: List[Dict],
                                      issues: List[VerificationIssue]) -> int:
        if not items:
            return 0

        score = 100
        penalties = {
            "missing_owner": 15,
            "missing_deadline": 10,
            "past_deadline": 10,
            "duplicate": 8,
            "incomplete_description": 5,
            "low_confidence_majority": 15,
            "too_many_urgent": 8,
            "priority_mismatch": 5,
            "missing_from_action_items": 5,
        }

        for issue in issues:
            penalty = penalties.get(issue.issue_type, 5)
            if issue.severity == "high":
                penalty = int(penalty * 1.5)
            elif issue.severity == "low":
                penalty = int(penalty * 0.5)
            score -= penalty

        return max(0, min(100, score))

    def _count_issue_types(self, issues: List[VerificationIssue]) -> Dict[str, int]:
        counts: Dict[str, int] = {}
        for issue in issues:
            counts[issue.issue_type] = counts.get(issue.issue_type, 0) + 1
        return counts

    def _issue_to_dict(self, issue: VerificationIssue) -> Dict:
        return {
            "id": issue.id,
            "item_id": issue.item_id,
            "issue_type": issue.issue_type,
            "description": issue.description,
            "severity": issue.severity,
            "suggestion": issue.suggestion,
        }

    def _normalize(self, text: str) -> str:
        import re
        return re.sub(r'\s+', ' ', text.lower().strip())
