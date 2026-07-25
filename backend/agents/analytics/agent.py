import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from collections import defaultdict

from agents.base_agent import BaseAgent, AgentContext, AgentResult


logger = logging.getLogger("agent.analytics")


class AnalyticsAgent(BaseAgent):
    def __init__(self, config: Optional[Dict] = None):
        super().__init__(name="analytics", config=config)

    async def process(self, context: AgentContext) -> AgentResult:
        meeting_analysis = context.state.get("meeting_analysis", {})
        action_item_output = context.state.get("action_item_output", {})
        planner_output = context.state.get("planner_output", {})
        verifier_output = context.state.get("verifier_output", {})
        execution_output = context.state.get("execution_output", {})
        reflection_output = context.state.get("reflection_output", {})
        reminder_output = context.state.get("reminder_output", {})

        action_items = action_item_output.get("action_items", [])
        decisions = action_item_output.get("decisions", [])
        risks = action_item_output.get("risks", [])
        planner_tasks = planner_output.get("tasks", [])
        executed = execution_output.get("executed_actions", [])
        failed_actions = execution_output.get("failed_actions", [])

        self.log("Generating analytics report")

        productivity_score = self._calculate_productivity(
            action_items, executed, failed_actions
        )
        workload_distribution = self._analyze_workload(
            action_items, planner_tasks
        )
        completion_rate = self._calculate_completion_rate(
            action_items, executed, planner_tasks
        )
        risk_report = self._generate_risk_report(
            risks, reflection_output, action_items
        )
        trends = self._extract_trends(
            meeting_analysis, action_items, decisions
        )
        insights = self._generate_insights(
            productivity_score, workload_distribution,
            completion_rate, risk_report, trends
        )
        predictions = self._predictive_analytics(
            action_items, completion_rate, risks
        )

        return AgentResult(
            success=True,
            data={
                "productivity_score": productivity_score,
                "workload_distribution": workload_distribution,
                "completion_rate": completion_rate,
                "risk_report": risk_report,
                "trends": trends,
                "insights": insights,
                "predictions": predictions,
                "report_generated_at": datetime.utcnow().isoformat(),
            },
            reasoning=f"Productivity: {productivity_score.get('overall', 0):.1f}/100, "
                      f"Completion: {completion_rate.get('overall', 0):.1f}%, "
                      f"Risks: {risk_report.get('total_risks', 0)}",
            confidence=self._compute_report_confidence(
                action_items, planner_tasks, execution_output
            ),
            next_steps=[
                "Review productivity insights",
                "Address risk report findings",
                "Use predictions for sprint planning",
                "Monitor trends over time",
            ],
        )

    def _calculate_productivity(
        self,
        action_items: List[Dict],
        executed: List[Dict],
        failed: List[Dict],
    ) -> Dict[str, Any]:
        total_items = len(action_items)
        completed = len(executed)
        failed_count = len(failed)

        exec_rate = completed / max(total_items, 1) * 100

        owner_productivity: Dict[str, Dict] = {}
        for action in executed:
            owner = action.get("owner", "unassigned")
            if owner not in owner_productivity:
                owner_productivity[owner] = {
                    "assigned": 0,
                    "completed": 0,
                    "failed": 0,
                }
            owner_productivity[owner]["completed"] += 1

        for action in action_items:
            owner = action.get("owner", "unassigned")
            if owner not in owner_productivity:
                owner_productivity[owner] = {
                    "assigned": 0,
                    "completed": 0,
                    "failed": 0,
                }
            owner_productivity[owner]["assigned"] += 1

        for action in failed:
            owner = action.get("owner", "unassigned")
            if owner in owner_productivity:
                owner_productivity[owner]["failed"] += 1

        per_person = {}
        for owner, data in owner_productivity.items():
            if data["assigned"] > 0:
                score = (data["completed"] / data["assigned"]) * 100
            else:
                score = 0
            per_person[owner] = {
                "score": round(score, 1),
                "tasks_assigned": data["assigned"],
                "tasks_completed": data["completed"],
                "tasks_failed": data["failed"],
            }

        overall = exec_rate
        if failed_count > 0:
            overall -= failed_count * 5

        return {
            "overall": round(max(0, overall), 1),
            "per_person": per_person,
            "total_tasks": total_items,
            "completed_tasks": completed,
            "failed_tasks": failed_count,
        }

    def _analyze_workload(
        self,
        action_items: List[Dict],
        planner_tasks: List[Dict],
    ) -> Dict[str, Any]:
        workload: Dict[str, Dict] = {}
        total_hours = 0.0

        for item in action_items:
            owner = item.get("owner", "unassigned")
            hours = item.get("estimated_hours", 2.0)
            priority = item.get("priority", "medium")
            total_hours += hours

            if owner not in workload:
                workload[owner] = {
                    "task_count": 0,
                    "estimated_hours": 0.0,
                    "priorities": defaultdict(int),
                    "items": [],
                }
            workload[owner]["task_count"] += 1
            workload[owner]["estimated_hours"] += hours
            workload[owner]["priorities"][priority] += 1
            workload[owner]["items"].append(
                item.get("description", "")[:60]
            )

        for task in planner_tasks:
            owner = task.get("owner", "unassigned")
            hours = task.get("estimated_hours", 2.0)

            if owner not in workload:
                workload[owner] = {
                    "task_count": 0,
                    "estimated_hours": 0.0,
                    "priorities": defaultdict(int),
                    "items": [],
                }
            workload[owner]["task_count"] += 1
            workload[owner]["estimated_hours"] += hours

        serializable = {}
        for owner, data in workload.items():
            serializable[owner] = {
                "task_count": data["task_count"],
                "estimated_hours": round(data["estimated_hours"], 1),
                "priorities": dict(data["priorities"]),
                "recent_items": data["items"][:3],
            }

        person_count = max(len(workload), 1)
        avg_hours = total_hours / person_count

        imbalance_score = 0.0
        if workload:
            max_hours = max(d["estimated_hours"] for d in workload.values())
            min_hours = min(d["estimated_hours"] for d in workload.values())
            if max_hours > 0:
                imbalance_score = round((max_hours - min_hours) / max_hours * 100, 1)

        return {
            "per_person": serializable,
            "total_hours": round(total_hours, 1),
            "average_hours_per_person": round(avg_hours, 1),
            "imbalance_score": imbalance_score,
            "imbalance_label": (
                "balanced" if imbalance_score < 20
                else "moderate" if imbalance_score < 50
                else "imbalanced"
            ),
        }

    def _calculate_completion_rate(
        self,
        action_items: List[Dict],
        executed: List[Dict],
        planner_tasks: List[Dict],
    ) -> Dict[str, Any]:
        all_tasks = len(action_items) + len(planner_tasks)
        completed = len(executed)

        overall = (completed / max(all_tasks, 1)) * 100

        priority_rates = {}
        for priority in ["urgent", "high", "medium", "low"]:
            priority_items = [
                i for i in action_items
                if i.get("priority") == priority
            ]
            priority_completed = sum(
                1 for e in executed
                if e.get("priority") == priority or
                any(i.get("id") == e.get("task_id")
                    for i in priority_items)
            )
            if priority_items:
                priority_rates[priority] = round(
                    priority_completed / len(priority_items) * 100, 1
                )
            else:
                priority_rates[priority] = None

        return {
            "overall": round(overall, 1),
            "by_priority": priority_rates,
            "total_tasks": all_tasks,
            "completed": completed,
            "pending": all_tasks - completed,
        }

    def _generate_risk_report(
        self,
        risks: List[Dict],
        reflection_output: Dict[str, Any],
        action_items: List[Dict],
    ) -> Dict[str, Any]:
        additional_risks = reflection_output.get("additional_risks", [])

        all_risks = risks + additional_risks

        severity_counts: Dict[str, int] = defaultdict(int)
        risk_types: Dict[str, int] = defaultdict(int)

        for risk in all_risks:
            severity = risk.get("severity", "medium")
            severity_counts[severity] += 1
            risk_type = risk.get("risk_type", "general")
            risk_types[risk_type] += 1

        high_risk_count = sum(
            1 for r in all_risks
            if r.get("severity") in ("critical", "high")
        )
        medium_risk_count = severity_counts.get("medium", 0)

        risk_score = 0
        risk_score += high_risk_count * 15
        risk_score += medium_risk_count * 8
        risk_score += severity_counts.get("low", 0) * 3
        risk_score = min(100, risk_score)

        top_risks = sorted(
            all_risks,
            key=lambda r: (
                {"critical": 4, "high": 3, "medium": 2, "low": 1}.get(
                    r.get("severity", "medium"), 2
                ),
                r.get("confidence", 0),
            ),
            reverse=True,
        )[:5]

        return {
            "total_risks": len(all_risks),
            "risk_score": risk_score,
            "risk_level": (
                "low" if risk_score < 20
                else "medium" if risk_score < 50
                else "high"
            ),
            "severity_breakdown": dict(severity_counts),
            "type_breakdown": dict(risk_types),
            "top_risks": [
                {
                    "description": r.get("description", "")[:100],
                    "severity": r.get("severity", "medium"),
                    "risk_type": r.get("risk_type", "general"),
                }
                for r in top_risks
            ],
        }

    def _extract_trends(
        self,
        meeting_analysis: Dict[str, Any],
        action_items: List[Dict],
        decisions: List[Dict],
    ) -> List[Dict]:
        trends = []

        meeting_type = meeting_analysis.get("meeting_type", "general")
        sentiment = meeting_analysis.get("sentiment", {})
        key_points = meeting_analysis.get("key_points", [])

        trends.append({
            "category": "meeting",
            "trend": f"Meeting type: {meeting_type}",
            "signal": meeting_type,
            "confidence": 0.9,
        })

        trends.append({
            "category": "sentiment",
            "trend": f"Sentiment: {sentiment.get('label', 'neutral')} "
                     f"({sentiment.get('overall', 0.5):.2f})",
            "signal": sentiment.get("label", "neutral"),
            "confidence": 0.8,
        })

        decision_count = len(decisions)
        if decision_count > 3:
            trends.append({
                "category": "decision_density",
                "trend": f"High decision density: {decision_count} decisions in one meeting",
                "signal": "high_decision_count",
                "confidence": 0.7,
            })

        priority_counts = defaultdict(int)
        for item in action_items:
            priority_counts[item.get("priority", "medium")] += 1
        if priority_counts.get("urgent", 0) > 2:
            trends.append({
                "category": "urgency",
                "trend": f"Multiple urgent items ({priority_counts['urgent']}) suggest "
                         f"a reactive rather than proactive workflow",
                "signal": "high_urgency",
                "confidence": 0.6,
            })

        if meeting_type == "retrospective":
            improvement_keywords = ["improve", "change", "action item"]
            improvement_count = sum(
                1 for kp in key_points
                if any(kw in kp.lower() for kw in improvement_keywords)
            )
            if improvement_count > 3:
                trends.append({
                    "category": "improvement",
                    "trend": f"Retrospective identified {improvement_count} improvement areas",
                    "signal": "high_improvement_signal",
                    "confidence": 0.75,
                })

        return trends

    def _generate_insights(
        self,
        productivity: Dict[str, Any],
        workload: Dict[str, Any],
        completion_rate: Dict[str, Any],
        risk_report: Dict[str, Any],
        trends: List[Dict],
    ) -> List[str]:
        insights = []

        prod_score = productivity.get("overall", 0)
        if prod_score >= 80:
            insights.append("Team is highly productive with strong task completion rate.")
        elif prod_score >= 50:
            insights.append("Team productivity is moderate. Consider reviewing "
                            "blockers and workflow bottlenecks.")
        else:
            insights.append("Productivity is low. Investigate root causes: "
                            "unclear requirements, resource constraints, or process issues.")

        completion = completion_rate.get("overall", 0)
        if completion < 50:
            insights.append("Less than half of tasks are being completed. "
                            "Consider reducing WIP or re-prioritizing.")

        imbalance = workload.get("imbalance_score", 0)
        if imbalance > 50:
            insights.append("Workload is significantly imbalanced. "
                            "Consider redistributing tasks for better team utilization.")

        risk_level = risk_report.get("risk_level", "low")
        if risk_level == "high":
            insights.append("High risk level detected. Schedule risk review "
                            "and mitigation planning session.")
        elif risk_level == "medium":
            insights.append("Moderate risks present. Monitor closely "
                            "and address high-severity items first.")

        if trends:
            meeting_type_trend = next(
                (t for t in trends if t["category"] == "meeting"), None
            )
            if meeting_type_trend:
                mtype = meeting_type_trend["signal"]
                insights.append(
                    f"Meeting type '{mtype}' suggests a focused session. "
                    f"Actionability is typically higher for planning and "
                    f"retrospective meetings."
                )

        return insights

    def _predictive_analytics(
        self,
        action_items: List[Dict],
        completion_rate: Dict[str, Any],
        risks: List[Dict],
    ) -> Dict[str, Any]:
        current_completion = completion_rate.get("overall", 0) / 100

        predicted_delays = []
        at_risk_items = []

        for item in action_items:
            confidence = item.get("confidence", 0.5)
            priority = item.get("priority", "medium")
            deadline_str = item.get("deadline")

            if confidence < 0.4:
                delay_probability = 0.7
            elif priority == "urgent":
                delay_probability = 0.3
            elif priority == "high":
                delay_probability = 0.4
            else:
                delay_probability = 0.5

            delay_factor = (1 - current_completion) * delay_probability

            if delay_factor > 0.5:
                predicted_delays.append({
                    "item_id": item.get("id", ""),
                    "description": item.get("description", "")[:80],
                    "delay_probability": round(delay_factor, 2),
                    "reason": (
                        "Low confidence extraction" if confidence < 0.4
                        else "Historical completion rate suggests risk"
                    ),
                })

            if deadline_str:
                try:
                    deadline = datetime.fromisoformat(deadline_str)
                    days_until_due = (deadline - datetime.utcnow()).days
                    if days_until_due <= 3 and delay_factor > 0.3:
                        at_risk_items.append({
                            "item_id": item.get("id", ""),
                            "description": item.get("description", "")[:80],
                            "days_remaining": days_until_due,
                            "risk_level": "high" if days_until_due <= 1 else "medium",
                        })
                except (ValueError, TypeError):
                    pass

        next_period_prediction = {}
        if current_completion > 0:
            predicted_completion = min(
                1.0,
                current_completion * (1 + 0.1 * len(action_items) / max(len(action_items), 1))
            )
            next_period_prediction = {
                "predicted_completion_rate": round(predicted_completion * 100, 1),
                "optimistic": round(min(1.0, predicted_completion * 1.2) * 100, 1),
                "pessimistic": round(max(0.1, predicted_completion * 0.7) * 100, 1),
            }

        return {
            "predicted_delays": predicted_delays[:10],
            "at_risk_items": at_risk_items[:10],
            "next_period_prediction": next_period_prediction,
            "bottleneck_probability": round(
                (1 - current_completion) * len(action_items) / max(len(action_items), 1) * 100,
                1,
            ),
        }

    def _compute_report_confidence(
        self,
        action_items: List[Dict],
        planner_tasks: List[Dict],
        execution_output: Dict[str, Any],
    ) -> float:
        confidence = 0.7

        if action_items:
            confidence += 0.05

        if planner_tasks:
            confidence += 0.05

        if execution_output:
            executed = execution_output.get("executed_actions", [])
            failed = execution_output.get("failed_actions", [])
            if executed and not failed:
                confidence += 0.1
            elif executed and failed:
                confidence += 0.05

        return min(1.0, confidence)
