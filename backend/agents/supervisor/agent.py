import asyncio
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional
from enum import Enum

from agents.base_agent import BaseAgent, AgentContext, AgentResult


logger = logging.getLogger("agent.supervisor")


class AgentStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


class SupervisorAgent(BaseAgent):
    def __init__(self, config: Optional[Dict] = None):
        super().__init__(name="supervisor", config=config)
        self._agent_registry: Dict[str, BaseAgent] = {}
        self._execution_plan: List[Dict[str, Any]] = []
        self._results: Dict[str, AgentResult] = {}
        self._status: Dict[str, AgentStatus] = {}

    def register_agent(self, agent: BaseAgent) -> None:
        self._agent_registry[agent.name] = agent

    def register_agents(self, agents: List[BaseAgent]) -> None:
        for agent in agents:
            self.register_agent(agent)

    async def process(self, context: AgentContext) -> AgentResult:
        meeting_id = context.meeting_id or "unknown"
        context.state["meeting_id"] = meeting_id
        context.state["start_time"] = datetime.utcnow().isoformat()

        self.log(f"Starting supervisor workflow for meeting {meeting_id}")

        meeting_data = context.state.get("meeting_data", {})
        transcript = meeting_data.get("transcript", "")
        meeting_type = await self._analyze_meeting_type(transcript, meeting_data)
        context.state["meeting_type"] = meeting_type

        complexity = self._assess_complexity(transcript, meeting_data)
        context.state["complexity"] = complexity

        self._build_execution_plan(meeting_type, complexity)
        context.state["execution_plan"] = self._execution_plan

        execution_results = await self._execute_plan(context)

        aggregated = self._aggregate_results(execution_results)
        recommendations = self._generate_recommendations(aggregated)

        return AgentResult(
            success=True,
            data={
                "execution_plan": self._execution_plan,
                "status": "completed",
                "results": {k: v.model_dump() for k, v in execution_results.items()},
                "meeting_type": meeting_type,
                "complexity": complexity,
            },
            reasoning=f"Supervisor workflow completed for {meeting_id}. "
                      f"Executed {len(execution_results)} agents. "
                      f"Meeting type: {meeting_type}, Complexity: {complexity}.",
            confidence=0.95,
            next_steps=recommendations,
        )

    async def _analyze_meeting_type(self, transcript: str, metadata: Dict) -> str:
        keywords = {
            "standup": ["yesterday", "today", "blocker", "standup", "daily"],
            "planning": ["sprint", "planning", "story", "point", "backlog",
                         "priority", "milestone"],
            "review": ["review", "demo", "showcase", "completed", "done",
                       "feedback"],
            "retrospective": ["retro", "retrospective", "improve", "went well",
                              "change", "action item"],
            "one_on_one": ["1:1", "one-on-one", "career", "growth", "feedback",
                           "personal"],
            "design": ["design", "architecture", "proposal", "decision",
                       "trade-off"],
            "incident": ["incident", "outage", "bug", "critical", "hotfix",
                         "sev"],
            "brainstorm": ["brainstorm", "idea", "think", "possible",
                           "what if", "explore"],
        }

        text_lower = transcript.lower()
        scores = {}
        for mtype, words in keywords.items():
            score = sum(1 for w in words if w in text_lower)
            if score > 0:
                scores[mtype] = score

        explicit_type = metadata.get("meeting_type", "").lower()
        if explicit_type and explicit_type in keywords:
            scores[explicit_type] = scores.get(explicit_type, 0) + 5

        if not scores:
            return "general"

        return max(scores, key=scores.get)

    def _assess_complexity(self, transcript: str, metadata: Dict) -> str:
        word_count = len(transcript.split())
        participant_count = len(metadata.get("participants", []))

        complexity_factors = 0
        if word_count > 2000:
            complexity_factors += 2
        elif word_count > 500:
            complexity_factors += 1

        if participant_count > 8:
            complexity_factors += 2
        elif participant_count > 3:
            complexity_factors += 1

        complex_keywords = ["architecture", "migration", "redesign",
                            "strategic", "restructure", "compliance",
                            "security", "performance"]
        text_lower = transcript.lower()
        keyword_hits = sum(1 for kw in complex_keywords if kw in text_lower)
        complexity_factors += keyword_hits // 3

        duration_min = metadata.get("duration_minutes", 0)
        if duration_min > 60:
            complexity_factors += 1

        if complexity_factors >= 4:
            return "high"
        elif complexity_factors >= 2:
            return "medium"
        return "low"

    def _build_execution_plan(self, meeting_type: str, complexity: str) -> None:
        default_agents = [
            "memory", "meeting", "planner", "action_item",
            "verifier", "reflection", "execution", "reminder", "analytics"
        ]

        plan = []
        status_map = {}

        always_run = {"memory", "meeting"}
        sequential_after_parallel = ["planner", "action_item", "verifier",
                                     "reflection"]

        for agent_name in default_agents:
            deps = []
            if agent_name in always_run:
                deps = []
            elif agent_name == "planner":
                deps = ["memory", "meeting"]
            elif agent_name == "action_item":
                deps = ["planner", "meeting"]
            elif agent_name == "verifier":
                deps = ["action_item"]
            elif agent_name == "reflection":
                deps = ["verifier"]
            elif agent_name == "execution":
                deps = ["reflection"]
            elif agent_name == "reminder":
                deps = ["execution"]
            elif agent_name == "analytics":
                deps = ["reflection", "execution", "reminder"]

            entry = {
                "agent": agent_name,
                "dependencies": deps,
                "status": AgentStatus.PENDING.value,
                "priority": 0 if agent_name in always_run else 1,
                "retry_count": 0,
                "max_retries": 2 if complexity == "high" else 1,
            }
            plan.append(entry)
            status_map[agent_name] = AgentStatus.PENDING

        self._execution_plan = plan
        self._status = status_map

    async def _execute_plan(self, context: AgentContext) -> Dict[str, AgentResult]:
        results: Dict[str, AgentResult] = {}
        completed = set()
        failed = set()

        plan_copy = [dict(e) for e in self._execution_plan]

        STATE_KEY_ALIASES = {
            "memory": "memory_context",
            "meeting": "meeting_analysis",
        }

        def _update_state(agent_name: str, result: AgentResult) -> None:
            data = result.data if hasattr(result, "data") else {}
            context.state[f"{agent_name}_output"] = data
            alias = STATE_KEY_ALIASES.get(agent_name)
            if alias:
                context.state[alias] = data

        max_iterations = 50
        iteration = 0

        while len(completed) + len(failed) < len(plan_copy) and iteration < max_iterations:
            iteration += 1
            ready = []

            for entry in plan_copy:
                agent_name = entry["agent"]
                if agent_name in completed or agent_name in failed:
                    continue
                deps = entry["dependencies"]
                dep_failed = any(d in failed for d in deps)
                dep_met = all(d in completed for d in deps)

                if dep_met and not dep_failed:
                    ready.append(entry)
                elif dep_failed:
                    logger.warning(f"Skipping {agent_name}, dependency failed")
                    results[agent_name] = AgentResult(
                        success=False,
                        error=f"Dependency failed: one of {deps}",
                        reasoning="Skipped due to failed dependency",
                    )
                    failed.add(agent_name)

            if not ready:
                if len(completed) + len(failed) < len(plan_copy):
                    logger.warning("Deadlock detected in execution plan")
                    for entry in plan_copy:
                        if entry["agent"] not in completed and entry["agent"] not in failed:
                            results[entry["agent"]] = AgentResult(
                                success=False,
                                error="Deadlock: dependencies never satisfied",
                                reasoning="Skipped due to execution deadlock",
                            )
                            failed.add(entry["agent"])
                break

            tasks = []
            for entry in ready:
                agent_name = entry["agent"]
                entry["status"] = AgentStatus.RUNNING.value
                agent_ctx = AgentContext(
                    agent_name=agent_name,
                    meeting_id=context.meeting_id,
                    session_id=context.session_id,
                    state=dict(context.state),
                )
                tasks.append(self._run_agent_safe(agent_name, agent_ctx, entry))

            batch_results = await asyncio.gather(*tasks, return_exceptions=False)

            for agent_name, result in batch_results:
                if result.success:
                    completed.add(agent_name)
                else:
                    entry = next(e for e in plan_copy if e["agent"] == agent_name)
                    if entry["retry_count"] < entry["max_retries"]:
                        entry["retry_count"] += 1
                        logger.info(f"Retrying {agent_name} (attempt {entry['retry_count']})")
                        entry["status"] = AgentStatus.PENDING.value
                    else:
                        failed.add(agent_name)
                results[agent_name] = result
                _update_state(agent_name, result)

        return results

    async def _run_agent_safe(self, agent_name: str, ctx: AgentContext,
                               entry: Dict) -> tuple:
        if agent_name not in self._agent_registry:
            fake_result = AgentResult(
                success=True,
                data={f"{agent_name}_processed": True},
                reasoning=f"{agent_name} not registered, using mock result",
                confidence=0.5,
            )
            return (agent_name, fake_result)

        agent = self._agent_registry[agent_name]
        try:
            result = await agent.run(ctx)
            self._status[agent_name] = AgentStatus.COMPLETED if result.success else AgentStatus.FAILED
            return (agent_name, result)
        except Exception as e:
            logger.exception(f"Agent {agent_name} raised exception")
            return (agent_name, AgentResult(
                success=False,
                error=str(e),
                reasoning=f"Unhandled exception in {agent_name}",
            ))

    def _aggregate_results(self, results: Dict[str, AgentResult]) -> Dict[str, Any]:
        aggregated = {
            "total_agents": len(results),
            "successful": sum(1 for r in results.values() if r.success),
            "failed": sum(1 for r in results.values() if not r.success),
            "key_findings": [],
            "action_items_count": 0,
            "decisions_count": 0,
            "risks_count": 0,
        }

        for agent_name, result in results.items():
            data = result.data
            if "action_items" in data:
                aggregated["action_items_count"] += len(data["action_items"])
            if "decisions" in data:
                aggregated["decisions_count"] += len(data["decisions"])
            if "risks" in data:
                aggregated["risks_count"] += len(data["risks"])
            if "key_points" in data:
                aggregated["key_findings"].extend(data["key_points"])

        return aggregated

    def _generate_recommendations(self, aggregated: Dict[str, Any]) -> List[str]:
        recommendations = []

        if aggregated["failed"] > 0:
            recommendations.append(
                f"Review failed agents ({aggregated['failed']} total)"
            )

        if aggregated["action_items_count"] == 0:
            recommendations.append("No action items extracted; manual review recommended")

        if aggregated["risks_count"] > 3:
            recommendations.append(
                f"High number of risks ({aggregated['risks_count']}); "
                f"schedule risk mitigation meeting"
            )

        recommendations.append("Review aggregated results and distribute action items")
        recommendations.append("Schedule follow-up meeting if critical path items exist")

        return recommendations
