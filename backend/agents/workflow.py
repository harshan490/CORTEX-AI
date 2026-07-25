import asyncio
import logging
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple
from uuid import uuid4

from agents.base_agent import BaseAgent, AgentContext, AgentResult
from agents.supervisor.agent import SupervisorAgent
from agents.meeting.agent import MeetingIntelligenceAgent
from agents.memory.agent import MemoryAgent
from agents.planner.agent import PlannerAgent
from agents.action_item.agent import ActionItemAgent
from agents.verifier.agent import VerifierAgent
from agents.reflection.agent import ReflectionAgent
from agents.reminder.agent import ReminderAgent
from agents.execution.agent import ExecutionAgent
from agents.analytics.agent import AnalyticsAgent


logger = logging.getLogger("agent.workflow")


class WorkflowStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    PARTIALLY_COMPLETED = "partially_completed"


class WorkflowState:
    def __init__(
        self,
        meeting_id: str,
        meeting_data: Optional[Dict[str, Any]] = None,
        session_id: Optional[str] = None,
    ):
        self.meeting_id = meeting_id
        self.session_id = session_id or str(uuid4())
        self.status = WorkflowStatus.PENDING
        self.current_agent: Optional[str] = None
        self.execution_plan: List[Dict[str, Any]] = []
        self.results: Dict[str, AgentResult] = {}
        self.error: Optional[str] = None
        self.start_time: Optional[datetime] = None
        self.end_time: Optional[datetime] = None
        self.meeting_data = meeting_data or {}
        self.graph: Optional["WorkflowGraph"] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "meeting_id": self.meeting_id,
            "session_id": self.session_id,
            "status": self.status.value,
            "current_agent": self.current_agent,
            "execution_plan": self.execution_plan,
            "results": {
                k: v.model_dump() if hasattr(v, "model_dump") else v
                for k, v in self.results.items()
            },
            "error": self.error,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "elapsed_seconds": (
                (self.end_time - self.start_time).total_seconds()
                if self.start_time and self.end_time
                else None
            ),
        }


class WorkflowGraph:
    DEFULT_AGENTS = [
        ("memory", MemoryAgent),
        ("meeting", MeetingIntelligenceAgent),
        ("planner", PlannerAgent),
        ("action_item", ActionItemAgent),
        ("verifier", VerifierAgent),
        ("reflection", ReflectionAgent),
        ("execution", ExecutionAgent),
        ("reminder", ReminderAgent),
        ("analytics", AnalyticsAgent),
    ]

    EXECUTION_ORDER = [
        ("memory", [], {"meeting"}),
        ("meeting", [], {"memory"}),
        ("planner", ["memory", "meeting"], set()),
        ("action_item", ["meeting", "planner"], set()),
        ("verifier", ["action_item"], set()),
        ("reflection", ["verifier", "planner", "meeting"], set()),
        ("execution", ["reflection", "verifier"], set()),
        ("reminder", ["execution", "action_item"], set()),
        ("analytics", [
            "reflection", "execution", "reminder", "verifier",
            "action_item", "planner", "meeting", "memory",
        ], set()),
    ]

    def __init__(
        self,
        supervisor: Optional[SupervisorAgent] = None,
        agents: Optional[Dict[str, BaseAgent]] = None,
        config: Optional[Dict[str, Any]] = None,
    ):
        self.config = config or {}
        self.supervisor = supervisor or SupervisorAgent(config=self.config.get("supervisor"))
        self.nodes: Dict[str, BaseAgent] = {}
        self._edges: List[Tuple[str, str]] = []
        self._parallel_groups: List[List[str]] = []

        if agents:
            self.nodes.update(agents)
        else:
            self._initialize_default_agents()

        self._build_execution_structure()

        self.supervisor.register_agents(list(self.nodes.values()))

    def _initialize_default_agents(self) -> None:
        for name, agent_cls in self.DEFULT_AGENTS:
            agent_config = self.config.get(name, {})
            self.nodes[name] = agent_cls(config=agent_config)

    def _build_execution_structure(self) -> None:
        edges: List[Tuple[str, str]] = []
        parallel_groups: List[List[str]] = []
        added = set()

        for name, deps, parallel_with in self.EXECUTION_ORDER:
            for dep in deps:
                if dep in self.nodes:
                    edges.append((dep, name))

            if parallel_with:
                group = [name] + list(parallel_with & self.nodes.keys())
                normalized = frozenset(group)
                if normalized not in added:
                    added.add(normalized)
                    parallel_groups.append(group)

        self._edges = edges
        self._parallel_groups = parallel_groups

    def add_agent(self, name: str, agent: BaseAgent) -> None:
        self.nodes[name] = agent
        self._build_execution_structure()
        self.supervisor.register_agent(agent)

    def add_edge(self, from_node: str, to_node: str) -> None:
        if from_node in self.nodes and to_node in self.nodes:
            self._edges.append((from_node, to_node))

    def remove_agent(self, name: str) -> None:
        self.nodes.pop(name, None)
        self._edges = [(f, t) for f, t in self._edges if f != name and t != name]
        self._parallel_groups = [
            g for g in self._parallel_groups if name not in g
        ]

    async def execute(
        self,
        meeting_id: str,
        meeting_data: Optional[Dict[str, Any]] = None,
        session_id: Optional[str] = None,
    ) -> WorkflowState:
        state = WorkflowState(
            meeting_id=meeting_id,
            meeting_data=meeting_data or {},
            session_id=session_id,
        )
        state.start_time = datetime.utcnow()
        state.status = WorkflowStatus.RUNNING
        state.graph = self

        logger.info(f"Workflow started for meeting {meeting_id} "
                    f"(session {state.session_id})")

        try:
            supervisor_context = AgentContext(
                agent_name="supervisor",
                meeting_id=meeting_id,
                session_id=state.session_id,
                state={
                    "meeting_data": meeting_data or {},
                },
            )

            execution_order = self._compute_execution_order()
            state.execution_plan = [
                {"agent": name, "dependencies": self._get_dependencies(name),
                 "status": "pending", "order": i}
                for i, name in enumerate(execution_order)
            ]

            supervisor_result = await self.supervisor.run(supervisor_context)
            state.results["supervisor"] = supervisor_result

            if supervisor_result.success:
                agent_results_raw = supervisor_result.data.get("results", {})
                for agent_name, result_dict in agent_results_raw.items():
                    if isinstance(result_dict, dict):
                        result = AgentResult(**result_dict)
                        state.results[agent_name] = result
                        state.meeting_data[f"{agent_name}_output"] = (
                            result.model_dump()
                        )

                state.meeting_data["supervisor_output"] = (
                    supervisor_result.model_dump()
                )

            failed_agents = [
                name for name, r in state.results.items()
                if name != "supervisor" and not r.success
            ]
            if failed_agents:
                state.status = WorkflowStatus.PARTIALLY_COMPLETED
                state.error = f"Agents failed: {', '.join(failed_agents)}"
                logger.warning(f"Workflow partially completed. "
                               f"Failed agents: {failed_agents}")
            else:
                state.status = WorkflowStatus.COMPLETED
                logger.info(f"Workflow completed successfully for {meeting_id}")

        except Exception as e:
            state.status = WorkflowStatus.FAILED
            state.error = str(e)
            logger.exception(f"Workflow failed for meeting {meeting_id}: {e}")

        finally:
            state.end_time = datetime.utcnow()
            elapsed = (state.end_time - state.start_time).total_seconds()
            logger.info(f"Workflow finished in {elapsed:.2f}s "
                        f"with status {state.status.value}")

        return state

    def _compute_execution_order(self) -> List[str]:
        in_degree: Dict[str, int] = {name: 0 for name in self.nodes}
        adjacency: Dict[str, List[str]] = {name: [] for name in self.nodes}

        for from_node, to_node in self._edges:
            if from_node in adjacency and to_node in in_degree:
                adjacency[from_node].append(to_node)
                in_degree[to_node] += 1

        queue = [n for n, d in in_degree.items() if d == 0]
        order = []

        while queue:
            batch = list(queue)
            queue.clear()

            for node in batch:
                order.append(node)
                for neighbor in adjacency.get(node, []):
                    in_degree[neighbor] -= 1
                    if in_degree[neighbor] == 0:
                        queue.append(neighbor)

        remaining = [n for n in self.nodes if n not in order]
        order.extend(remaining)

        return order

    def _get_dependencies(self, agent_name: str) -> List[str]:
        return [
            from_node
            for from_node, to_node in self._edges
            if to_node == agent_name
        ]

    async def _execute_nodes(
        self,
        state: WorkflowState,
        execution_order: List[str],
    ) -> Dict[str, AgentResult]:
        results: Dict[str, AgentResult] = {}
        completed: set = set()
        failed: set = set()

        adjacency: Dict[str, List[str]] = {name: [] for name in self.nodes}
        reverse_deps: Dict[str, List[str]] = {name: [] for name in self.nodes}

        for from_node, to_node in self._edges:
            if from_node in adjacency and to_node in reverse_deps:
                adjacency[from_node].append(to_node)
                reverse_deps[to_node].append(from_node)

        pending = set(self.nodes.keys())

        while pending:
            ready = []
            for node in list(pending):
                deps = reverse_deps.get(node, [])
                dep_failed = any(d in failed for d in deps)
                dep_completed = all(d in completed for d in deps) if deps else True

                if dep_failed:
                    logger.warning(f"Skipping {node} - dependency failed")
                    results[node] = AgentResult(
                        success=False,
                        error=f"Dependency failed: {[d for d in deps if d in failed]}",
                        reasoning=f"Skipped because dependency failed",
                    )
                    failed.add(node)
                    pending.discard(node)
                elif dep_completed:
                    ready.append(node)

            if not ready and pending:
                logger.warning(f"Deadlock: pending nodes {pending} "
                               f"have unmet dependencies")
                for node in list(pending):
                    results[node] = AgentResult(
                        success=False,
                        error="Deadlock",
                        reasoning="Execution deadlock - dependencies never satisfied",
                    )
                    failed.add(node)
                break

            parallel_tasks = []
            for node_name in ready:
                agent = self.nodes.get(node_name)
                if not agent:
                    logger.warning(f"Agent '{node_name}' not found in registry")
                    results[node_name] = AgentResult(
                        success=False,
                        error=f"Agent '{node_name}' not registered",
                        reasoning="Agent not available in workflow graph",
                    )
                    failed.add(node_name)
                    pending.discard(node_name)
                    continue

                agent_context = self._build_agent_context(
                    node_name, state, results
                )
                state.current_agent = node_name
                parallel_tasks.append(self._run_agent_task(agent, agent_context, node_name))

            if parallel_tasks:
                task_results = await asyncio.gather(*parallel_tasks, return_exceptions=False)
                for node_name, result in task_results:
                    results[node_name] = result
                    if result.success:
                        completed.add(node_name)
                    else:
                        failed.add(node_name)
                    pending.discard(node_name)

        state.current_agent = None
        return results

    async def _run_agent_task(
        self,
        agent: BaseAgent,
        context: AgentContext,
        node_name: str,
    ) -> Tuple[str, AgentResult]:
        try:
            logger.debug(f"Running agent: {node_name}")
            result = await agent.run(context)
            logger.debug(f"Agent {node_name} completed: success={result.success}")
            return (node_name, result)
        except Exception as e:
            logger.exception(f"Agent {node_name} raised unhandled exception")
            return (
                node_name,
                AgentResult(
                    success=False,
                    error=str(e),
                    reasoning=f"Unhandled exception in {node_name}",
                ),
            )

    def _build_agent_context(
        self,
        agent_name: str,
        state: WorkflowState,
        results: Dict[str, AgentResult],
    ) -> AgentContext:
        shared_state: Dict[str, Any] = {
            "meeting_data": state.meeting_data,
        }

        STATE_KEY_ALIASES = {
            "memory": "memory_context",
            "meeting": "meeting_analysis",
        }

        for name, result in results.items():
            data = result.data if hasattr(result, "data") else {}
            shared_state[f"{name}_output"] = data

            alias = STATE_KEY_ALIASES.get(name)
            if alias:
                shared_state[alias] = data

        return AgentContext(
            agent_name=agent_name,
            meeting_id=state.meeting_id,
            session_id=state.session_id,
            state=shared_state,
        )

    def get_execution_summary(self, state: WorkflowState) -> Dict[str, Any]:
        total = len(state.results)
        successful = sum(1 for r in state.results.values() if r.success)
        failed_count = total - successful

        return {
            "meeting_id": state.meeting_id,
            "session_id": state.session_id,
            "status": state.status.value,
            "duration_seconds": (
                (state.end_time - state.start_time).total_seconds()
                if state.start_time and state.end_time
                else None
            ),
            "agents_executed": total,
            "successful": successful,
            "failed": failed_count,
            "agents": list(state.results.keys()),
            "error": state.error,
        }

    def visualize(self) -> str:
        lines = ["Workflow Graph:", "=============="]
        for name in self.nodes:
            deps = self._get_dependencies(name)
            dep_str = ", ".join(deps) if deps else "none"
            lines.append(f"  {name} <- [{dep_str}]")
        return "\n".join(lines)


def get_workflow_graph(config: Optional[Dict[str, Any]] = None) -> WorkflowGraph:
    return WorkflowGraph(config=config)


def get_default_workflow_graph() -> WorkflowGraph:
    graph = WorkflowGraph()
    return graph


async def run_workflow(
    meeting_id: str,
    meeting_data: Optional[Dict[str, Any]] = None,
    config: Optional[Dict[str, Any]] = None,
) -> WorkflowState:
    graph = get_workflow_graph(config)
    return await graph.execute(
        meeting_id=meeting_id,
        meeting_data=meeting_data,
    )


def create_meeting_data(
    transcript: str,
    participants: Optional[List[Any]] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    return {
        "transcript": transcript,
        "participants": participants or [],
        "metadata": {
            "title": metadata.get("title", "Untitled Meeting"),
            "date": metadata.get("date", datetime.utcnow().isoformat()),
            "duration_minutes": metadata.get("duration_minutes", 30),
            "project": metadata.get("project", "default"),
            **(metadata or {}),
        },
    }
