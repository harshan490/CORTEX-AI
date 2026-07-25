import type { TaskStatus } from '@/types'

export const TASK_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  pending: ['in_progress'],
  in_progress: ['completed', 'blocked', 'escalated'],
  blocked: ['in_progress', 'escalated'],
  overdue: ['in_progress', 'escalated', 'completed'],
  escalated: ['in_progress', 'completed'],
  completed: [],
}

export const TRANSITION_LABELS: Record<TaskStatus, string> = {
  pending: 'Pending',
  in_progress: 'Start Work',
  blocked: 'Mark Blocked',
  overdue: 'Overdue',
  escalated: 'Escalate',
  completed: 'Complete',
}

export function getAvailableTransitions(current: TaskStatus): TaskStatus[] {
  return TASK_TRANSITIONS[current] ?? []
}

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  return (TASK_TRANSITIONS[from] ?? []).includes(to)
}
