// ============================================================
// CORTEX AI — Unified API Surface
// Normalizes both demo and production providers to the same
// interface: all methods return direct values (no ApiResponse).
// Set NEXT_PUBLIC_DEMO_MODE=true to use demo fixtures.
// ============================================================

export const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

import { demoProvider } from '@/lib/demo/provider'
import { apiClient } from '@/lib/api-client'
import type {
  Meeting,
  ActionItem,
  AgentActivity,
  MeetingReport,
  DashboardMetrics,
  MemoryNode,
  MemoryEdge,
  AuthUser,
  Clarification,
  TaskFilters,
  MeetingFilters,
  MeetingInputMethod,
} from '@/types'

// Shared return shapes for listMeetings / listTasks
export interface MeetingListResult {
  meetings: Meeting[]
  total: number
  hasMore: boolean
}

export interface TaskListResult {
  tasks: ActionItem[]
  total: number
  hasMore: boolean
}

// ----------------------------------------------------------------
// Normalized API — same signatures for all callers
// ----------------------------------------------------------------

export const api = {
  // --- Auth ---

  async login(email: string, password: string): Promise<{ user: AuthUser; token: string }> {
    if (isDemoMode) return demoProvider.login(email, password)
    const res = await apiClient.login({ email, password })
    return res.data
  },

  async register(
    email: string,
    name: string,
    password: string,
  ): Promise<{ user: AuthUser; token: string }> {
    if (isDemoMode) return demoProvider.register(email, name, password)
    const res = await apiClient.register({ email, name, password })
    return res.data
  },

  async getMe(): Promise<AuthUser> {
    if (isDemoMode) return demoProvider.getMe()
    const res = await apiClient.getMe()
    return res.data
  },

  async healthCheck(): Promise<{ status: string; demo: boolean }> {
    if (isDemoMode) return demoProvider.healthCheck()
    const ok = await apiClient.healthCheck()
    return { status: ok ? 'OK' : 'unavailable', demo: false }
  },

  // --- Dashboard ---

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    if (isDemoMode) return demoProvider.getDashboardMetrics()
    const res = await apiClient.getDashboardMetrics()
    return res.data
  },

  // --- Meetings ---

  async listMeetings(filters?: MeetingFilters): Promise<MeetingListResult> {
    if (isDemoMode) return demoProvider.listMeetings(filters)
    const res = await apiClient.listMeetings(filters)
    return {
      meetings: res.data.data,
      total: res.data.total,
      hasMore: res.data.hasMore,
    }
  },

  async getMeeting(id: string): Promise<Meeting> {
    if (isDemoMode) return demoProvider.getMeeting(id)
    const res = await apiClient.getMeeting(id)
    return res.data
  },

  async processMeeting(data: {
    title: string
    description?: string
    transcript?: string
    inputMethod?: string
  }): Promise<Meeting> {
    if (isDemoMode) return demoProvider.processMeeting(data)
    const res = await apiClient.processMeeting({
      title: data.title,
      content: data.transcript ?? '',
      inputMethod: (data.inputMethod ?? 'transcript') as MeetingInputMethod,
    })
    return res.data
  },

  async approveMeeting(id: string): Promise<Meeting> {
    if (isDemoMode) return demoProvider.approveMeeting(id)
    const res = await apiClient.approveMeeting(id)
    return res.data
  },

  async rejectMeeting(id: string, reason: string): Promise<Meeting> {
    if (isDemoMode) return demoProvider.rejectMeeting(id, reason)
    const res = await apiClient.rejectMeeting(id, reason)
    return res.data
  },

  // --- Tasks ---

  async listTasks(filters?: TaskFilters): Promise<TaskListResult> {
    if (isDemoMode) return demoProvider.listTasks(filters)
    const res = await apiClient.listTasks(filters)
    return {
      tasks: res.data.data,
      total: res.data.total,
      hasMore: res.data.hasMore,
    }
  },

  async getTask(id: string): Promise<ActionItem> {
    if (isDemoMode) return demoProvider.getTask(id)
    const res = await apiClient.getTask(id)
    return res.data
  },

  async updateTask(
    id: string,
    updates: Partial<Pick<ActionItem, 'status' | 'priority' | 'owner' | 'deadline' | 'notes' | 'tags'>>,
  ): Promise<ActionItem> {
    if (isDemoMode) return demoProvider.updateTask(id, updates)
    const res = await apiClient.updateTask(id, updates)
    return res.data
  },

  async completeTask(id: string): Promise<ActionItem> {
    if (isDemoMode) return demoProvider.completeTask(id)
    const res = await apiClient.completeTask(id)
    return res.data
  },

  async resolveClarification(
    meetingId: string,
    clarificationId: string,
    resolution: string,
  ): Promise<Clarification> {
    if (isDemoMode) return demoProvider.resolveClarification(meetingId, clarificationId, resolution)
    const res = await apiClient.resolveClarification(meetingId, clarificationId, resolution)
    return res.data
  },

  // --- Activity ---

  async listActivity(limit = 50): Promise<AgentActivity[]> {
    if (isDemoMode) return demoProvider.listActivity(limit)
    const res = await apiClient.listActivity({ pageSize: limit })
    return res.data.data
  },

  // --- Memory ---

  async getMemory(): Promise<{ nodes: MemoryNode[]; edges: MemoryEdge[] }> {
    if (isDemoMode) return demoProvider.getMemory()
    const res = await apiClient.getMemory()
    return res.data
  },

  // --- Reports ---

  async getReport(meetingId: string): Promise<MeetingReport> {
    if (isDemoMode) return demoProvider.getReport(meetingId)
    const res = await apiClient.getReport(meetingId)
    return res.data
  },

  // --- Reminders ---

  async triggerReminders(taskId: string): Promise<number> {
    if (isDemoMode) return demoProvider.triggerReminders(taskId)
    await apiClient.triggerReminders()
    return 0
  },
}

export type { ApiClientError } from '@/lib/api-client'
