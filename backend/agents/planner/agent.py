import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from uuid import uuid4

from agents.base_agent import BaseAgent, AgentContext, AgentResult


logger = logging.getLogger("agent.planner")


class Task:
    def __init__(
        self,
        description: str,
        task_type: str = "general",
        owner: Optional[str] = None,
        deadline: Optional[str] = None,
        priority: str = "medium",
        estimated_hours: float = 2.0,
        dependencies: Optional[List[str]] = None,
        notes: Optional[str] = None,
    ):
        self.id = str(uuid4())
        self.description = description
        self.task_type = task_type
        self.owner = owner
        self.deadline = deadline
        self.priority = priority
        self.estimated_hours = estimated_hours
        self.dependencies = dependencies or []
        self.notes = notes or ""
        self.created_at = datetime.utcnow().isoformat()


class PlannerAgent(BaseAgent):
    def __init__(self, config: Optional[Dict] = None):
        super().__init__(name="planner", config=config)

    async def process(self, context: AgentContext) -> AgentResult:
        meeting_data = context.state.get("meeting_data", {})
        transcript = meeting_data.get("transcript", "")
        meeting_analysis = context.state.get("meeting_analysis", {})
        memory_context = context.state.get("memory_context", {})

        self.log("Creating execution plan from meeting analysis")

        meeting_type = meeting_analysis.get("meeting_type", "general")
        key_points = meeting_analysis.get("key_points", [])
        segments = meeting_analysis.get("segments", [])
        pending_items = memory_context.get("pending_items", [])
        team_context = memory_context.get("team_context", {})

        tasks = self._create_tasks(key_points, segments, pending_items,
                                   meeting_type, team_context)
        execution_graph = self._build_execution_graph(tasks)
        estimated_timeline = self._estimate_timeline(tasks, execution_graph)
        critical_path = self._find_critical_path(tasks, execution_graph)
        resource_allocation = self._allocate_resources(tasks, team_context)

        return AgentResult(
            success=True,
            data={
                "tasks": [self._task_to_dict(t) for t in tasks],
                "execution_graph": execution_graph,
                "estimated_timeline": estimated_timeline,
                "critical_path": critical_path,
                "resource_allocation": resource_allocation,
                "task_count": len(tasks),
                "estimated_total_hours": sum(t.estimated_hours for t in tasks),
                "plan_created_at": datetime.utcnow().isoformat(),
            },
            reasoning=f"Created plan with {len(tasks)} tasks, "
                      f"{len(critical_path)} on critical path",
            confidence=self._calculate_confidence(tasks, meeting_type),
            next_steps=["Extract action items from plan", "Verify task completeness"],
        )

    def _create_tasks(
        self,
        key_points: List[str],
        segments: List[Dict],
        pending_items: List[Dict],
        meeting_type: str,
        team_context: Dict[str, Any],
    ) -> List[Task]:
        tasks: List[Task] = []
        seen_descriptions: set = set()

        if meeting_type == "standup":
            for point in key_points:
                if "[BLOCKER]" in point:
                    tasks.append(Task(
                        description=point.replace("[BLOCKER]", "").strip(),
                        task_type="blocker",
                        priority="high",
                        estimated_hours=4.0,
                    ))

        if meeting_type == "planning":
            planning_tasks = self._extract_planning_tasks(key_points)
            tasks.extend(planning_tasks)

        if meeting_type == "retrospective":
            for point in key_points:
                if "action item" in point.lower() or "improve" in point.lower():
                    task_desc = point[:100]
                    if task_desc not in seen_descriptions:
                        seen_descriptions.add(task_desc)
                        tasks.append(Task(
                            description=task_desc,
                            task_type="improvement",
                            priority="medium",
                            estimated_hours=3.0,
                        ))

        for seg in segments:
            topic = seg.get("topic", "")
            text = seg.get("text", "")

            if topic == "decision" and text:
                decision_tasks = self._extract_tasks_from_decision(text)
                for dt in decision_tasks:
                    if dt.description not in seen_descriptions:
                        seen_descriptions.add(dt.description)
                        tasks.append(dt)

            if topic == "action_items" and text:
                ai_tasks = self._extract_tasks_from_action_segment(text)
                for at in ai_tasks:
                    if at.description not in seen_descriptions:
                        seen_descriptions.add(at.description)
                        tasks.append(at)

        for item in pending_items:
            if item.get("status") != "done":
                tasks.append(Task(
                    description=item.get("description", "Carry-over task"),
                    task_type="carryover",
                    owner=item.get("owner"),
                    deadline=item.get("deadline"),
                    priority="medium",
                    estimated_hours=2.0,
                    notes=f"Carry-over from meeting {item.get('source_meeting', 'unknown')}",
                ))

        if not tasks:
            if key_points:
                for kp in key_points[:5]:
                    desc = kp[:120]
                    if desc not in seen_descriptions:
                        seen_descriptions.add(desc)
                        tasks.append(Task(
                            description=desc,
                            task_type="general",
                            estimated_hours=2.0,
                        ))
            else:
                tasks.append(Task(
                    description="Review meeting notes and identify action items",
                    task_type="review",
                    priority="low",
                    estimated_hours=1.0,
                ))

        return tasks

    def _extract_planning_tasks(self, key_points: List[str]) -> List[Task]:
        tasks = []
        for point in key_points:
            tasks.append(Task(
                description=point[:120],
                task_type="planning_item",
                priority="medium",
                estimated_hours=4.0,
            ))
        return tasks

    def _extract_tasks_from_decision(self, text: str) -> List[Task]:
        tasks = []
        lower = text.lower()
        for prefix in ["implement", "create", "build", "set up", "configure",
                        "migrate", "update", "refactor", "write"]:
            if prefix in lower:
                start = lower.find(prefix)
                snippet = text[start:start + 150]
                tasks.append(Task(
                    description=snippet,
                    task_type="implementation",
                    priority="high",
                    estimated_hours=8.0,
                ))
        return tasks

    def _extract_tasks_from_action_segment(self, text: str) -> List[Task]:
        tasks = []
        lines = text.strip().split("\n")
        for line in lines:
            lower = line.lower()
            if any(phrase in lower for phrase in [
                "will", "todo", "to-do", "action", "assign",
                "follow up", "follow-up", "need to"
            ]):
                tasks.append(Task(
                    description=line.strip()[:150],
                    task_type="action_item",
                    priority="medium",
                    estimated_hours=2.0,
                ))
        return tasks

    def _build_execution_graph(self, tasks: List[Task]) -> Dict[str, Any]:
        edges = []
        adjacency: Dict[str, List[str]] = {t.id: [] for t in tasks}

        for i, task in enumerate(tasks):
            if task.dependencies:
                for dep_id in task.dependencies:
                    if dep_id in adjacency:
                        edges.append({"from": dep_id, "to": task.id})
                        adjacency[dep_id].append(task.id)
            elif i > 0:
                deps = tasks[:i]
                complexity = sum(t.estimated_hours for t in deps)
                if complexity > 10:
                    adjacency[tasks[i - 1].id].append(task.id)
                    edges.append({"from": tasks[i - 1].id, "to": task.id})

        return {
            "edges": edges,
            "adjacency": {k: v for k, v in adjacency.items() if v},
            "node_count": len(tasks),
            "edge_count": len(edges),
        }

    def _estimate_timeline(self, tasks: List[Task],
                            graph: Dict) -> List[Dict]:
        timeline = []
        today = datetime.utcnow().replace(hour=9, minute=0, second=0, microsecond=0)

        level_order = self._topological_sort(tasks, graph)
        current_time = today

        for task_id in level_order:
            task = next(t for t in tasks if t.id == task_id)
            if task.deadline:
                try:
                    deadline_dt = datetime.fromisoformat(task.deadline)
                except (ValueError, TypeError):
                    deadline_dt = current_time + timedelta(days=3)
            else:
                deadline_dt = current_time + timedelta(
                    hours=task.estimated_hours * 1.5
                )

            timeline.append({
                "task_id": task.id,
                "description": task.description[:80],
                "start": current_time.isoformat(),
                "deadline": deadline_dt.isoformat(),
                "estimated_hours": task.estimated_hours,
                "priority": task.priority,
            })

            current_time += timedelta(hours=task.estimated_hours * 1.5)

        return timeline

    def _find_critical_path(self, tasks: List[Task],
                             graph: Dict) -> List[Dict]:
        if not tasks:
            return []

        level_order = self._topological_sort(tasks, graph)
        task_map = {t.id: t for t in tasks}
        longest_path = []

        for task_id in level_order:
            path = [task_id]
            visited = {task_id}
            stack = [(task_id, path, visited)]

            while stack:
                current, current_path, current_visited = stack.pop()
                adj = graph["adjacency"].get(current, [])
                if not adj:
                    if len(current_path) > len(longest_path):
                        longest_path = list(current_path)
                for neighbor in adj:
                    if neighbor not in current_visited:
                        new_visited = set(current_visited)
                        new_visited.add(neighbor)
                        stack.append((neighbor, current_path + [neighbor], new_visited))

        return [
            {"task_id": tid, "description": task_map[tid].description[:80],
             "estimated_hours": task_map[tid].estimated_hours}
            for tid in longest_path if tid in task_map
        ]

    def _allocate_resources(self, tasks: List[Task],
                             team_context: Dict[str, Any]) -> Dict[str, Any]:
        allocation = {}
        assigned_hours: Dict[str, float] = {}

        for member_name in team_context:
            assigned_hours[member_name] = 0.0

        for task in tasks:
            if task.owner and task.owner in assigned_hours:
                assigned_hours[task.owner] += task.estimated_hours
                allocation[task.id] = {
                    "owner": task.owner,
                    "estimated_hours": task.estimated_hours,
                }
            else:
                best_owner = self._find_best_owner(task, assigned_hours, team_context)
                allocation[task.id] = {
                    "owner": best_owner,
                    "estimated_hours": task.estimated_hours,
                }
                assigned_hours.setdefault(best_owner, 0)
                assigned_hours[best_owner] += task.estimated_hours

        return {
            "allocation": allocation,
            "total_hours_per_person": assigned_hours,
            "average_load": (sum(assigned_hours.values()) /
                             max(len(assigned_hours), 1)),
        }

    def _find_best_owner(self, task: Task, assigned_hours: Dict[str, float],
                          team_context: Dict[str, Any]) -> str:
        if not assigned_hours:
            return "unassigned"

        candidate = min(assigned_hours, key=assigned_hours.get)
        return candidate if candidate else "unassigned"

    def _topological_sort(self, tasks: List[Task],
                           graph: Dict) -> List[str]:
        adj = graph.get("adjacency", {})
        in_degree: Dict[str, int] = {t.id: 0 for t in tasks}

        for node, neighbors in adj.items():
            for neighbor in neighbors:
                if neighbor in in_degree:
                    in_degree[neighbor] += 1

        queue = [n for n, d in in_degree.items() if d == 0]
        result = []

        while queue:
            node = queue.pop(0)
            result.append(node)
            for neighbor in adj.get(node, []):
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        remaining = [t.id for t in tasks if t.id not in result]
        result.extend(remaining)
        return result

    def _calculate_confidence(self, tasks: List[Task],
                               meeting_type: str) -> float:
        base = 0.7
        if tasks:
            base += min(0.15, len(tasks) * 0.02)
        if meeting_type in ("planning", "standup"):
            base += 0.1
        return min(0.98, base)

    def _task_to_dict(self, task: Task) -> Dict:
        return {
            "id": task.id,
            "description": task.description,
            "task_type": task.task_type,
            "owner": task.owner,
            "deadline": task.deadline,
            "priority": task.priority,
            "estimated_hours": task.estimated_hours,
            "dependencies": task.dependencies,
            "notes": task.notes,
            "created_at": task.created_at,
        }
