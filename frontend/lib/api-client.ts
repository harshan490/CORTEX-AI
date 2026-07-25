// ============================================================
// CORTEX AI — Production API Client
// Maps actual backend endpoints to frontend types
// Backend runs on port 8000 (FastAPI / uvicorn)
// All endpoints require: Authorization: Bearer <token>
// ============================================================

import type {
  Meeting,
  ActionItem,
  AgentActivity,
  TaskFilters,
  MeetingFilters,
  ApiResponse,
  PaginatedResponse,
  DashboardMetrics,
  MemoryNode,
  MemoryEdge,
  Clarification,
  Priority,
  TaskStatus,
  AuthUser,
  TokenResponse,
  LoginRequest,
  RegisterRequest,
} from '@/types'
import { getStoredToken } from '@/lib/store'

// Backend base URL — reads from env, defaults to port 8000
// NEXT_PUBLIC_API_BASE_URL must be set in .env.local for production
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

const DEFAULT_TIMEOUT = 30_000

// ------------------------------------------------------------
// Fetch wrapper
// ------------------------------------------------------------

interface FetchOptions extends RequestInit {
  timeoutMs?: number
  signal?: AbortSignal
  skipAuth?: boolean
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT, signal: externalSignal, skipAuth, ...init } = options

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  const mergedSignal = externalSignal
    ? anySignal([controller.signal, externalSignal])
    : controller.signal

  const token = skipAuth ? null : getStoredToken()
  const authHeaders: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {}

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...init.headers,
      },
      signal: mergedSignal,
    })

    if (!res.ok) {
      if (res.status === 401 && typeof window !== 'undefined') {
        // Token expired — clear stored auth
        localStorage.removeItem('cortex-store')
        window.location.href = '/auth'
      }
      let errorMessage = `HTTP ${res.status}`
      try {
        const body = await res.json()
        errorMessage = body.detail ?? body.message ?? errorMessage
      } catch {
        // ignore
      }
      throw new ApiClientError(errorMessage, res.status)
    }

    if (res.status === 204) return undefined as T
    return (await res.json()) as T
  } finally {
    clearTimeout(timeout)
  }
}

function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController()
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort()
      break
    }
    signal.addEventListener('abort', () => controller.abort(), { once: true })
  }
  return controller.signal
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

// Wrap result in our standard ApiResponse envelope
function ok<T>(data: T): ApiResponse<T> {
  return { data, success: true, timestamp: new Date().toISOString() }
}

function paginate<T>(items: T[], page = 1, pageSize = 20, total?: number): PaginatedResponse<T> {
  return {
    data: items,
    total: total ?? items.length,
    page,
    pageSize,
    hasMore: (total ?? items.length) > page * pageSize,
  }
}

// ------------------------------------------------------------
// Type mappers: backend → frontend
// ------------------------------------------------------------

interface BackendMeeting {
  id: string
  title: string
  date: string
  duration_seconds?: number | null
  status: string
  summary?: string | null
  transcript?: { segments: BackendTranscriptSegment[] } | null
  created_at: string
  updated_at: string
  created_by: string
  gcal_event_id?: string | null
  recording_url?: string | null
  participants?: BackendParticipant[]
  action_item_count?: number
  decision_count?: number
}

interface BackendParticipant {
  id: string
  name: string
  role?: string | null
  speaking_time_seconds?: number
}

interface BackendTranscriptSegment {
  speaker?: string
  text?: string
  start?: number
  end?: number
}

interface BackendActionItem {
  id: string
  meeting_id: string
  title: string
  description?: string | null
  owner_id?: string | null
  assignee_name?: string | null
  deadline?: string | null
  priority: string
  status: string
  risk_level?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

interface BackendDecision {
  id: string
  meeting_id: string
  title: string
  description?: string | null
  made_by?: string | null
  timestamp: string
  confidence?: number | null
  is_confirmed: boolean
}

interface BackendTask {
  id: string
  title: string
  description?: string | null
  meeting_id?: string | null
  owner_id?: string | null
  status: string
  priority: string
  deadline?: string | null
  source: string
  external_id?: string | null
  external_type?: string | null
  created_at: string
  updated_at: string
}

interface BackendAgentLog {
  id: string
  agent_name: string
  meeting_id?: string | null
  action: string
  status: string
  started_at: string
  completed_at?: string | null
  result?: unknown
  error?: string | null
}

interface BackendAnalyticsOverview {
  total_meetings: number
  total_tasks: number
  completed_tasks: number
  completion_rate: number
  total_action_items: number
  completed_action_items: number
  total_decisions: number
  overdue_items: number
  critical_risks: number
}

// Map backend task status → frontend TaskStatus
function mapTaskStatus(backendStatus: string): TaskStatus {
  const map: Record<string, TaskStatus> = {
    pending: 'pending',
    in_progress: 'in_progress',
    completed: 'completed',
    overdue: 'overdue',
  }
  return map[backendStatus] ?? 'pending'
}

// Map backend priority → frontend Priority
function mapPriority(p: string): Priority {
  const map: Record<string, Priority> = {
    low: 'low',
    medium: 'medium',
    high: 'high',
    critical: 'critical',
  }
  return map[p] ?? 'medium'
}

// Map backend meeting status → frontend MeetingStatus
function mapMeetingStatus(s: string): Meeting['status'] {
  const map: Record<string, Meeting['status']> = {
    scheduled: 'processing',
    in_progress: 'processing',
    completed: 'approved',
  }
  return map[s] ?? 'processing'
}

function mapBackendActionItem(item: BackendActionItem): ActionItem {
  return {
    id: item.id,
    meetingId: item.meeting_id,
    title: item.title,
    description: item.description ?? '',
    owner: item.assignee_name ?? undefined,
    deadline: item.deadline ?? undefined,
    priority: mapPriority(item.priority),
    status: mapTaskStatus(item.status),
    evidenceSegmentIds: [],
    dependencies: [],
    clarificationIds: [],
    confidence: 0.8,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    reminders: [],
    activityLog: [],
    tags: item.risk_level ? [item.risk_level] : [],
    notes: item.notes ?? undefined,
  }
}

function mapBackendDecision(d: BackendDecision): import('@/types').Decision {
  return {
    id: d.id,
    meetingId: d.meeting_id,
    title: d.title,
    description: d.description ?? '',
    decidedBy: d.made_by ? [d.made_by] : ['Unknown'],
    evidenceSegmentIds: [],
    confidence: d.confidence ?? 0.8,
    timestamp: d.timestamp,
    is_confirmed: d.is_confirmed,
  }
}

function mapBackendMeeting(
  m: BackendMeeting,
  actionItems: ActionItem[],
  decisions: import('@/types').Decision[]
): Meeting {
  // Map transcript segments
  const segments = m.transcript?.segments ?? []
  const transcript = segments.map((seg, idx) => ({
    id: `seg-${idx}`,
    startTime: seg.start ?? 0,
    endTime: seg.end ?? 0,
    speaker: seg.speaker ?? 'Unknown',
    text: seg.text ?? '',
    confidence: 0.95,
  }))

  const participants = (m.participants ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    role: p.role ?? undefined,
    speaking_time_seconds: p.speaking_time_seconds,
  }))

  return {
    id: m.id,
    title: m.title,
    inputMethod: 'transcript',
    processingState: m.status === 'completed' ? 'completed' : 'awaiting_review',
    createdAt: m.created_at,
    updatedAt: m.updated_at,
    duration: m.duration_seconds ?? undefined,
    participants,
    transcript,
    topics: [],
    executiveSummary: m.summary ?? undefined,
    decisions,
    actionItems,
    risks: [],
    dependencies: [],
    clarifications: [],
    agentActivities: [],
    tags: [],
    status: mapMeetingStatus(m.status),
  }
}

function mapBackendTask(t: BackendTask): ActionItem {
  return {
    id: t.id,
    meetingId: t.meeting_id ?? '',
    title: t.title,
    description: t.description ?? '',
    owner: undefined, // owner_id is a UUID, not a name — no name available from this endpoint
    deadline: t.deadline ?? undefined,
    priority: mapPriority(t.priority),
    status: mapTaskStatus(t.status),
    evidenceSegmentIds: [],
    dependencies: [],
    clarificationIds: [],
    confidence: 0.8,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    reminders: [],
    activityLog: [],
    tags: [],
  }
}

function mapBackendAgentLog(log: BackendAgentLog): AgentActivity {
  const outcomeMap: Record<string, AgentActivity['outcome']> = {
    started: 'pending',
    completed: 'success',
    failed: 'failed',
    error: 'failed',
  }
  return {
    id: log.id,
    meetingId: log.meeting_id ?? undefined,
    timestamp: log.started_at,
    agent: log.agent_name,
    subsystem: log.agent_name,
    action: log.action,
    reason: log.error ?? '',
    outcome: outcomeMap[log.status] ?? 'pending',
    retryCount: 0,
    durationMs: log.completed_at
      ? new Date(log.completed_at).getTime() - new Date(log.started_at).getTime()
      : undefined,
  }
}

// ------------------------------------------------------------
// Production API Client
// ------------------------------------------------------------

export const apiClient = {
  // --- Health ---

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/health`, {
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) return false
      const data = await res.json()
      return data.status === 'healthy'
    } catch {
      return false
    }
  },

  // --- Auth ---

  async login(request: LoginRequest): Promise<ApiResponse<{ user: AuthUser; token: string }>> {
    const data = await apiFetch<TokenResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(request),
      skipAuth: true,
    })
    return ok({ user: data.user, token: data.access_token })
  },

  async register(request: RegisterRequest): Promise<ApiResponse<{ user: AuthUser; token: string }>> {
    const data = await apiFetch<TokenResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: request.email, name: request.name, password: request.password }),
      skipAuth: true,
    })
    return ok({ user: data.user, token: data.access_token })
  },

  async getMe(): Promise<ApiResponse<AuthUser>> {
    const data = await apiFetch<AuthUser>('/api/auth/me')
    return ok(data)
  },

  // --- Dashboard ---

  async getDashboardMetrics(signal?: AbortSignal): Promise<ApiResponse<DashboardMetrics>> {
    const overview = await apiFetch<BackendAnalyticsOverview>('/api/analytics/overview', { signal })
    return ok({
      totalMeetings: overview.total_meetings,
      meetingsThisWeek: 0, // not available from backend
      activeTasks: overview.total_action_items - overview.completed_action_items,
      overdueTasks: overview.overdue_items,
      pendingClarifications: 0, // not available from backend
      completedTasksThisWeek: overview.completed_tasks,
      averageConfidence: 0.82, // not available — use placeholder
      processingQueueSize: 0,
    })
  },

  // --- Meetings ---

  async listMeetings(
    filters?: MeetingFilters,
    signal?: AbortSignal
  ): Promise<ApiResponse<PaginatedResponse<Meeting>>> {
    const params = new URLSearchParams()
    const skip = ((filters?.page ?? 1) - 1) * (filters?.pageSize ?? 20)
    params.set('skip', String(skip))
    params.set('limit', String(filters?.pageSize ?? 20))

    const meetings = await apiFetch<BackendMeeting[]>(`/api/meetings/?${params}`, { signal })

    // Map to frontend type — action items/decisions loaded lazily per meeting
    const mapped = meetings.map((m) =>
      mapBackendMeeting(m, [], [])
    )

    return ok(paginate(mapped, filters?.page, filters?.pageSize, meetings.length))
  },

  async getMeeting(meetingId: string, signal?: AbortSignal): Promise<ApiResponse<Meeting>> {
    const [meeting, actionItems, decisions] = await Promise.all([
      apiFetch<BackendMeeting>(`/api/meetings/${meetingId}`, { signal }),
      apiFetch<BackendActionItem[]>(`/api/meetings/${meetingId}/action-items`, { signal }),
      apiFetch<BackendDecision[]>(`/api/meetings/${meetingId}/decisions`, { signal }),
    ])
    return ok(
      mapBackendMeeting(
        meeting,
        actionItems.map(mapBackendActionItem),
        decisions.map(mapBackendDecision)
      )
    )
  },

  async processMeeting(payload: {
    title: string
    content: string
    inputMethod: Meeting['inputMethod']
  }): Promise<ApiResponse<Meeting>> {
    // Step 1: Create the meeting
    const now = new Date().toISOString()
    const meeting = await apiFetch<BackendMeeting>('/api/meetings/', {
      method: 'POST',
      body: JSON.stringify({
        title: payload.title,
        date: now,
      }),
    })

    // Step 2: Upload transcript if provided
    if (payload.content && payload.inputMethod === 'transcript') {
      const segments = payload.content
        .split('\n')
        .filter((line) => line.trim())
        .map((line, idx) => ({
          speaker: 'Speaker',
          text: line.trim(),
          start: idx * 5,
          end: (idx + 1) * 5,
        }))

      await apiFetch(`/api/meetings/${meeting.id}/transcript`, {
        method: 'POST',
        body: JSON.stringify({ segments }),
      })
    }

    // Step 3: Trigger processing
    await apiFetch(`/api/meetings/${meeting.id}/process`, { method: 'POST' })

    return ok(mapBackendMeeting(meeting, [], []))
  },

  // approve/reject not available in backend — return error so UI can handle gracefully
  async approveMeeting(meetingId: string): Promise<ApiResponse<Meeting>> {
    // Backend does not have approve endpoint — update status via PUT
    const updated = await apiFetch<BackendMeeting>(`/api/meetings/${meetingId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'completed' }),
    })
    return ok(mapBackendMeeting(updated, [], []))
  },

  async rejectMeeting(meetingId: string, _reason: string): Promise<ApiResponse<Meeting>> {
    // Backend does not have reject endpoint — mark as scheduled (closest available)
    const updated = await apiFetch<BackendMeeting>(`/api/meetings/${meetingId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'scheduled' }),
    })
    return ok(mapBackendMeeting(updated, [], []))
  },

  // --- Tasks ---

  async listTasks(
    filters?: TaskFilters,
    signal?: AbortSignal
  ): Promise<ApiResponse<PaginatedResponse<ActionItem>>> {
    const params = new URLSearchParams()
    const skip = ((filters?.page ?? 1) - 1) * (filters?.pageSize ?? 50)
    params.set('skip', String(skip))
    params.set('limit', String(filters?.pageSize ?? 100))
    if (filters?.status?.length === 1) {
      // Map frontend status to backend status for single-status filters
      const backendStatusMap: Record<string, string> = {
        pending: 'pending',
        in_progress: 'in_progress',
        completed: 'completed',
        overdue: 'overdue',
      }
      const mapped = backendStatusMap[filters.status[0]]
      if (mapped) params.set('status', mapped)
    }
    if (filters?.meetingId) params.set('meeting_id', filters.meetingId)

    const tasks = await apiFetch<BackendTask[]>(`/api/tasks/?${params}`, { signal })
    let mapped = tasks.map(mapBackendTask)

    // Apply client-side filters for what the backend doesn't support
    if (filters?.search) {
      const q = filters.search.toLowerCase()
      mapped = mapped.filter(
        (t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
      )
    }
    if (filters?.priority?.length) {
      mapped = mapped.filter((t) => filters.priority!.includes(t.priority))
    }
    if (filters?.status && filters.status.length > 1) {
      mapped = mapped.filter((t) => filters.status!.includes(t.status))
    }
    if (filters?.deadline === 'overdue') {
      const now = new Date()
      mapped = mapped.filter(
        (t) => t.deadline && new Date(t.deadline) < now && t.status !== 'completed'
      )
    }

    return ok(paginate(mapped, filters?.page, filters?.pageSize ?? 50, mapped.length))
  },

  async getTask(taskId: string, signal?: AbortSignal): Promise<ApiResponse<ActionItem>> {
    // Backend has no GET /api/tasks/{id} — fall back to list + filter
    const tasks = await apiFetch<BackendTask[]>(`/api/tasks/?limit=500`, { signal })
    const found = tasks.find((t) => t.id === taskId)
    if (!found) throw new ApiClientError(`Task ${taskId} not found`, 404)
    return ok(mapBackendTask(found))
  },

  async updateTask(
    taskId: string,
    updates: Partial<ActionItem>
  ): Promise<ApiResponse<ActionItem>> {
    const backendUpdates: Record<string, unknown> = {}
    if (updates.title) backendUpdates.title = updates.title
    if (updates.description !== undefined) backendUpdates.description = updates.description
    if (updates.priority) backendUpdates.priority = updates.priority
    if (updates.status) {
      // Map frontend status back to backend
      const statusMap: Record<string, string> = {
        pending: 'pending',
        in_progress: 'in_progress',
        completed: 'completed',
        overdue: 'overdue',
        blocked: 'pending', // backend has no blocked
        escalated: 'in_progress', // backend has no escalated
      }
      backendUpdates.status = statusMap[updates.status] ?? updates.status
    }
    if (updates.deadline !== undefined) backendUpdates.deadline = updates.deadline

    const data = await apiFetch<BackendTask>(`/api/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(backendUpdates),
    })
    return ok(mapBackendTask(data))
  },

  async completeTask(taskId: string): Promise<ApiResponse<ActionItem>> {
    const data = await apiFetch<BackendTask>(`/api/tasks/${taskId}/complete`, { method: 'POST' })
    return ok(mapBackendTask(data))
  },

  // --- Clarifications --- (not supported by backend)
  async resolveClarification(
    _meetingId: string,
    _clarificationId: string,
    _resolution: string
  ): Promise<ApiResponse<Clarification>> {
    throw new ApiClientError(
      'Clarification resolution is not available in the current backend version.',
      501
    )
  },

  // --- Activity ---

  async listActivity(
    filters?: Record<string, string | number>,
    signal?: AbortSignal
  ): Promise<ApiResponse<PaginatedResponse<AgentActivity>>> {
    const params = new URLSearchParams()
    const limit = Number(filters?.pageSize ?? 50)
    const skip = ((Number(filters?.page ?? 1) - 1)) * limit
    params.set('skip', String(skip))
    params.set('limit', String(limit))
    if (filters?.agent) params.set('agent_name', String(filters.agent))
    if (filters?.meetingId) params.set('meeting_id', String(filters.meetingId))

    const logs = await apiFetch<BackendAgentLog[]>(`/api/agents/logs?${params}`, { signal })
    let mapped = logs.map(mapBackendAgentLog)

    if (filters?.search) {
      const q = String(filters.search).toLowerCase()
      mapped = mapped.filter(
        (a) => a.action.toLowerCase().includes(q) || a.agent.toLowerCase().includes(q)
      )
    }
    if (filters?.outcome) {
      mapped = mapped.filter((a) => a.outcome === filters.outcome)
    }

    return ok(paginate(mapped, Number(filters?.page ?? 1), limit, mapped.length))
  },

  // --- Memory --- (not available in backend — demo only)
  async getMemory(
    _signal?: AbortSignal
  ): Promise<ApiResponse<{ nodes: MemoryNode[]; edges: MemoryEdge[] }>> {
    throw new ApiClientError(
      'Memory graph is not available in the current backend version.',
      501
    )
  },

  // --- Reports --- (not available as a dedicated endpoint — built from meeting data)
  async getReport(
    meetingId: string,
    signal?: AbortSignal
  ): Promise<ApiResponse<import('@/types').MeetingReport>> {
    const meetingRes = await this.getMeeting(meetingId, signal)
    const meeting = meetingRes.data
    return ok({
      id: `report-${meetingId}`,
      meetingId,
      generatedAt: new Date().toISOString(),
      meeting,
      summary: meeting.executiveSummary ?? 'No summary available.',
      keyTakeaways: meeting.decisions.map((d) => d.title),
      completionPercentage:
        meeting.actionItems.length > 0
          ? Math.round(
              (meeting.actionItems.filter((a) => a.status === 'completed').length /
                meeting.actionItems.length) *
                100
            )
          : 0,
      agentActionSummary: `${meeting.decisions.length} decisions captured, ${meeting.actionItems.length} action items extracted.`,
      totalDecisions: meeting.decisions.length,
      totalTasks: meeting.actionItems.length,
      totalRisks: meeting.risks.length,
      pendingClarifications: meeting.clarifications.filter((c) => c.status === 'pending').length,
    })
  },

  // --- Reminders --- (triggers exist via /api/tasks/{id}/remind but no bulk trigger)
  async triggerReminders(): Promise<ApiResponse<{ triggered: number }>> {
    return ok({ triggered: 0 })
  },
}

export type ApiClient = typeof apiClient
