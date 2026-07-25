// ============================================================
// CORTEX AI — Demo Provider
// In-memory implementation of the API client interface.
// Uses fixture data with localStorage persistence for mutations.
// Active when NEXT_PUBLIC_DEMO_MODE=true
// ============================================================

import type {
  Meeting,
  ActionItem,
  AgentActivity,
  MemoryNode,
  MemoryEdge,
  DashboardMetrics,
  MeetingReport,
  AuthUser,
  TaskStatus,
  MeetingStatus,
  TaskFilters,
  MeetingFilters,
  Clarification,
} from '@/types'
import {
  DEMO_MEETINGS,
  DEMO_ACTIVITIES,
  DEMO_MEMORY_NODES,
  DEMO_MEMORY_EDGES,
  DEMO_DASHBOARD_METRICS,
  DEMO_REPORTS,
  DEMO_ALL_TASKS,
} from '@/lib/demo/fixtures'

// ------------------------------------------------------------
// Local state (persisted across page reloads in demo mode)
// ------------------------------------------------------------

const STORAGE_KEY = 'cortex-demo-state'

interface DemoState {
  meetings: Meeting[]
  activities: AgentActivity[]
}

function loadState(): DemoState {
  if (typeof window === 'undefined') {
    return { meetings: DEMO_MEETINGS, activities: DEMO_ACTIVITIES }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { meetings: DEMO_MEETINGS, activities: DEMO_ACTIVITIES }
    const parsed = JSON.parse(raw) as DemoState
    return {
      meetings: parsed.meetings ?? DEMO_MEETINGS,
      activities: parsed.activities ?? DEMO_ACTIVITIES,
    }
  } catch {
    return { meetings: DEMO_MEETINGS, activities: DEMO_ACTIVITIES }
  }
}

function saveState(state: DemoState): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore quota errors
  }
}

function getState(): DemoState {
  return loadState()
}

function setState(updater: (prev: DemoState) => DemoState): void {
  const prev = loadState()
  saveState(updater(prev))
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms))

const DEMO_USER: AuthUser = {
  id: 'demo-user-001',
  email: 'demo@cortex.ai',
  name: 'Demo User',
  avatar_url: null,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

// ------------------------------------------------------------
// Demo Provider
// ------------------------------------------------------------

export const demoProvider = {
  // Auth
  async login(_email: string, _password: string): Promise<{ user: AuthUser; token: string }> {
    await delay(400)
    return { user: DEMO_USER, token: 'demo-token-not-real' }
  },

  async register(
    _email: string,
    _name: string,
    _password: string,
  ): Promise<{ user: AuthUser; token: string }> {
    await delay(400)
    return { user: DEMO_USER, token: 'demo-token-not-real' }
  },

  async getMe(): Promise<AuthUser> {
    await delay(200)
    return DEMO_USER
  },

  async healthCheck(): Promise<{ status: string; demo: boolean }> {
    await delay(100)
    return { status: 'Demo Provider Active', demo: true }
  },

  // Dashboard
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    await delay(200)
    return DEMO_DASHBOARD_METRICS
  },

  // Meetings
  async listMeetings(
    filters: MeetingFilters = {},
  ): Promise<{ meetings: Meeting[]; total: number; hasMore: boolean }> {
    await delay(300)
    const { meetings } = getState()
    let results = [...meetings]

    if (filters.status && filters.status.length > 0) {
      results = results.filter((m) => filters.status!.includes(m.status))
    }

    if (filters.search) {
      const q = filters.search.toLowerCase()
      results = results.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          (m.description ?? '').toLowerCase().includes(q) ||
          (m.executiveSummary ?? '').toLowerCase().includes(q),
      )
    }

    const page = filters.page ?? 1
    const pageSize = filters.pageSize ?? 20
    const start = (page - 1) * pageSize
    const paged = results.slice(start, start + pageSize)

    return {
      meetings: paged,
      total: results.length,
      hasMore: start + pageSize < results.length,
    }
  },

  async getMeeting(id: string): Promise<Meeting> {
    await delay(250)
    const { meetings } = getState()
    const m = meetings.find((m) => m.id === id)
    if (!m) throw new Error(`Meeting ${id} not found`)
    return m
  },

  async processMeeting(data: {
    title: string
    description?: string
    transcript?: string
    inputMethod?: string
  }): Promise<Meeting> {
    await delay(600)
    const newMeeting: Meeting = {
      id: `mtg-${Date.now()}`,
      title: data.title,
      description: data.description,
      inputMethod: (data.inputMethod ?? 'transcript') as Meeting['inputMethod'],
      processingState: 'awaiting_review',
      status: 'awaiting_review',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      participants: [],
      transcript: [],
      topics: [],
      decisions: [],
      actionItems: [],
      risks: [],
      dependencies: [],
      clarifications: [],
      agentActivities: [],
      tags: [],
      processingConfidence: 0.88,
      executiveSummary: `AI-generated summary for "${data.title}". This meeting was processed in demo mode.`,
    }
    setState((prev) => ({ ...prev, meetings: [newMeeting, ...prev.meetings] }))
    return newMeeting
  },

  async approveMeeting(id: string): Promise<Meeting> {
    await delay(300)
    let updated: Meeting | undefined
    setState((prev) => {
      const meetings = prev.meetings.map((m) => {
        if (m.id !== id) return m
        updated = { ...m, status: 'approved' as MeetingStatus, approvedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        return updated
      })
      return { ...prev, meetings }
    })
    if (!updated) throw new Error(`Meeting ${id} not found`)
    return updated
  },

  async rejectMeeting(id: string, reason: string): Promise<Meeting> {
    await delay(300)
    let updated: Meeting | undefined
    setState((prev) => {
      const meetings = prev.meetings.map((m) => {
        if (m.id !== id) return m
        updated = { ...m, status: 'rejected' as MeetingStatus, rejectionReason: reason, updatedAt: new Date().toISOString() }
        return updated
      })
      return { ...prev, meetings }
    })
    if (!updated) throw new Error(`Meeting ${id} not found`)
    return updated
  },

  // Tasks
  async listTasks(
    filters: TaskFilters = {},
  ): Promise<{ tasks: ActionItem[]; total: number; hasMore: boolean }> {
    await delay(300)
    const { meetings } = getState()
    let tasks = meetings.flatMap((m) => m.actionItems)

    if (filters.status && filters.status.length > 0) {
      tasks = tasks.filter((t) => filters.status!.includes(t.status))
    }
    if (filters.priority && filters.priority.length > 0) {
      tasks = tasks.filter((t) => filters.priority!.includes(t.priority))
    }
    if (filters.owner) {
      const ownerQ = filters.owner.toLowerCase()
      tasks = tasks.filter(
        (t) =>
          (t.owner ?? '').toLowerCase().includes(ownerQ) ||
          (t.ownerEmail ?? '').toLowerCase().includes(ownerQ),
      )
    }
    if (filters.search) {
      const q = filters.search.toLowerCase()
      tasks = tasks.filter(
        (t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q),
      )
    }
    if (filters.meetingId) {
      tasks = tasks.filter((t) => t.meetingId === filters.meetingId)
    }
    if (filters.deadline === 'overdue') {
      const now = new Date()
      tasks = tasks.filter((t) => t.deadline && new Date(t.deadline) < now && t.status !== 'completed')
    } else if (filters.deadline === 'today') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tasks = tasks.filter((t) => {
        if (!t.deadline) return false
        const d = new Date(t.deadline)
        return d >= today && d < tomorrow
      })
    } else if (filters.deadline === 'this_week') {
      const now = new Date()
      const weekEnd = new Date(now)
      weekEnd.setDate(weekEnd.getDate() + 7)
      tasks = tasks.filter((t) => {
        if (!t.deadline) return false
        const d = new Date(t.deadline)
        return d >= now && d <= weekEnd
      })
    }

    const sortBy = filters.sortBy ?? 'createdAt'
    const sortOrder = filters.sortOrder ?? 'desc'
    tasks.sort((a, b) => {
      let av: string | number = a[sortBy as keyof ActionItem] as string ?? ''
      let bv: string | number = b[sortBy as keyof ActionItem] as string ?? ''
      if (sortBy === 'priority') {
        const order = { critical: 0, high: 1, medium: 2, low: 3 }
        av = order[a.priority]
        bv = order[b.priority]
      }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortOrder === 'asc' ? cmp : -cmp
    })

    const page = filters.page ?? 1
    const pageSize = filters.pageSize ?? 50
    const start = (page - 1) * pageSize
    const paged = tasks.slice(start, start + pageSize)

    return { tasks: paged, total: tasks.length, hasMore: start + pageSize < tasks.length }
  },

  async getTask(id: string): Promise<ActionItem> {
    await delay(200)
    const { meetings } = getState()
    const tasks = meetings.flatMap((m) => m.actionItems)
    const t = tasks.find((t) => t.id === id)
    if (!t) {
      // Fall back to initial fixtures
      const fixture = DEMO_ALL_TASKS.find((t) => t.id === id)
      if (fixture) return fixture
      throw new Error(`Task ${id} not found`)
    }
    return t
  },

  async updateTask(
    id: string,
    updates: Partial<Pick<ActionItem, 'status' | 'priority' | 'owner' | 'deadline' | 'notes' | 'tags'>>,
  ): Promise<ActionItem> {
    await delay(300)
    let updated: ActionItem | undefined
    setState((prev) => {
      const meetings = prev.meetings.map((m) => ({
        ...m,
        actionItems: m.actionItems.map((t) => {
          if (t.id !== id) return t
          updated = { ...t, ...updates, updatedAt: new Date().toISOString() }
          return updated
        }),
      }))
      return { ...prev, meetings }
    })
    if (!updated) throw new Error(`Task ${id} not found`)
    return updated
  },

  async completeTask(id: string): Promise<ActionItem> {
    await delay(300)
    return demoProvider.updateTask(id, {
      status: 'completed' as TaskStatus,
    }).then((t) => ({ ...t, completedAt: new Date().toISOString() }))
  },

  async resolveClarification(
    meetingId: string,
    clarificationId: string,
    resolution: string,
  ): Promise<Clarification> {
    await delay(300)
    let resolved: Clarification | undefined
    setState((prev) => {
      const meetings = prev.meetings.map((m) => {
        if (m.id !== meetingId) return m
        return {
          ...m,
          clarifications: m.clarifications.map((c) => {
            if (c.id !== clarificationId) return c
            resolved = {
              ...c,
              status: 'resolved',
              resolution,
              resolvedAt: new Date().toISOString(),
              resolvedBy: 'Demo User',
            }
            return resolved
          }),
        }
      })
      return { ...prev, meetings }
    })
    if (!resolved) throw new Error(`Clarification ${clarificationId} not found`)
    return resolved
  },

  // Activity
  async listActivity(limit = 50): Promise<AgentActivity[]> {
    await delay(200)
    const { activities } = getState()
    return activities.slice(0, limit)
  },

  // Memory Graph
  async getMemory(): Promise<{ nodes: MemoryNode[]; edges: MemoryEdge[] }> {
    await delay(300)
    return { nodes: DEMO_MEMORY_NODES, edges: DEMO_MEMORY_EDGES }
  },

  // Reports
  async getReport(meetingId: string): Promise<MeetingReport> {
    await delay(250)
    const report = DEMO_REPORTS.find((r) => r.meetingId === meetingId)
    if (!report) {
      // Build a minimal report from meeting data
      const { meetings } = getState()
      const meeting = meetings.find((m) => m.id === meetingId)
      if (!meeting) throw new Error(`Report for meeting ${meetingId} not found`)
      return {
        id: `report-${meetingId}`,
        meetingId,
        generatedAt: new Date().toISOString(),
        meeting,
        summary: meeting.executiveSummary ?? 'No summary available.',
        keyTakeaways: meeting.decisions.map((d) => d.title),
        completionPercentage: Math.round(
          (meeting.actionItems.filter((t) => t.status === 'completed').length /
            Math.max(meeting.actionItems.length, 1)) *
            100,
        ),
        agentActionSummary: `${meeting.agentActivities.length} agent actions recorded.`,
        totalDecisions: meeting.decisions.length,
        totalTasks: meeting.actionItems.length,
        totalRisks: meeting.risks.length,
        pendingClarifications: meeting.clarifications.filter((c) => c.status === 'pending').length,
      }
    }
    return report
  },

  async triggerReminders(_taskId: string): Promise<number> {
    await delay(200)
    return 1
  },
}
