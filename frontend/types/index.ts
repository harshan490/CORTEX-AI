// ============================================================
// CORTEX AI — Shared Type Definitions
// ============================================================

// ------------------------------------------------------------
// Processing & Task State Machines
// ------------------------------------------------------------

export type MeetingProcessingState =
  | 'idle'
  | 'validating'
  | 'uploading'
  | 'transcribing'
  | 'understanding'
  | 'planning'
  | 'verifying'
  | 'awaiting_review'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'blocked'
  | 'overdue'
  | 'escalated'
  | 'completed'

export type Priority = 'critical' | 'high' | 'medium' | 'low'

export type MeetingInputMethod = 'transcript' | 'audio' | 'video' | 'live'

// Backend meeting status values
export type BackendMeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'processing' | 'awaiting_review' | 'failed'

// Frontend meeting status values
export type MeetingStatus = 'processing' | 'awaiting_review' | 'approved' | 'rejected' | 'archived' | 'failed'

// ------------------------------------------------------------
// Auth
// ------------------------------------------------------------

export interface AuthUser {
  id: string
  email: string
  name: string
  role?: string | null
  timezone?: string | null
  avatar_url?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  user: AuthUser
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  name: string
  password: string
}

// ------------------------------------------------------------
// Meeting Domain
// ------------------------------------------------------------

export interface Participant {
  id: string
  name: string
  role?: string
  email?: string
  speakerLabel?: string
  confidence?: number
  speaking_time_seconds?: number
}

export interface TranscriptSegment {
  id: string
  startTime: number
  endTime: number
  speaker: string
  speakerId?: string
  text: string
  confidence?: number
  highlighted?: boolean
}

export interface TopicSegment {
  id: string
  title: string
  startTime: number
  endTime: number
  summary: string
  segmentIds: string[]
  keyPoints: string[]
}

export interface Decision {
  id: string
  meetingId: string
  title: string
  description: string
  decidedBy: string[]
  evidenceSegmentIds: string[]
  confidence: number
  timestamp: string
  is_confirmed?: boolean
}

export interface ActionItem {
  id: string
  meetingId: string
  title: string
  description: string
  owner?: string
  ownerEmail?: string
  deadline?: string
  priority: Priority
  status: TaskStatus
  evidenceSegmentIds: string[]
  dependencies: string[]
  clarificationIds: string[]
  confidence: number
  createdAt: string
  updatedAt: string
  completedAt?: string
  reminders: Reminder[]
  activityLog: ActivityEntry[]
  tags: string[]
  notes?: string
}

export interface Risk {
  id: string
  meetingId: string
  title: string
  description: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  likelihood: 'high' | 'medium' | 'low'
  mitigation?: string
  owner?: string
  evidenceSegmentIds: string[]
  confidence: number
}

export interface Dependency {
  id: string
  meetingId: string
  fromItemId: string
  toItemId: string
  type: 'blocks' | 'requires' | 'informs' | 'follows'
  description: string
}

export interface Clarification {
  id: string
  meetingId: string
  question: string
  context: string
  evidenceSegmentIds: string[]
  status: 'pending' | 'resolved' | 'dismissed'
  resolution?: string
  resolvedBy?: string
  resolvedAt?: string
  createdAt: string
}

export interface Reminder {
  id: string
  taskId: string
  scheduledAt: string
  sentAt?: string
  channel: 'email' | 'slack' | 'in_app'
  recipient: string
  status: 'pending' | 'sent' | 'failed' | 'cancelled'
  message: string
}

// ------------------------------------------------------------
// Meeting
// ------------------------------------------------------------

export interface Meeting {
  id: string
  title: string
  description?: string
  inputMethod: MeetingInputMethod
  processingState: MeetingProcessingState
  createdAt: string
  updatedAt: string
  processedAt?: string
  approvedAt?: string
  duration?: number
  participants: Participant[]
  transcript: TranscriptSegment[]
  topics: TopicSegment[]
  executiveSummary?: string
  decisions: Decision[]
  actionItems: ActionItem[]
  risks: Risk[]
  dependencies: Dependency[]
  clarifications: Clarification[]
  processingConfidence?: number
  agentActivities: AgentActivity[]
  tags: string[]
  projectContext?: string
  status: MeetingStatus
  rejectionReason?: string
}

// ------------------------------------------------------------
// Agent Activity
// ------------------------------------------------------------

export interface AgentActivity {
  id: string
  meetingId?: string
  taskId?: string
  timestamp: string
  agent: string
  subsystem: string
  action: string
  reason: string
  outcome: 'success' | 'partial' | 'failed' | 'pending'
  confidence?: number
  toolUsed?: string
  retryCount: number
  durationMs?: number
  relatedEntityId?: string
  relatedEntityType?: 'meeting' | 'task' | 'decision' | 'reminder' | 'report'
  metadata?: Record<string, string | number | boolean>
}

export type ActivityEntry = Pick<AgentActivity, 'id' | 'timestamp' | 'agent' | 'action' | 'outcome'>

// ------------------------------------------------------------
// Reports
// ------------------------------------------------------------

export interface MeetingReport {
  id: string
  meetingId: string
  generatedAt: string
  meeting: Meeting
  summary: string
  keyTakeaways: string[]
  completionPercentage: number
  agentActionSummary: string
  totalDecisions: number
  totalTasks: number
  totalRisks: number
  pendingClarifications: number
}

// ------------------------------------------------------------
// Memory Graph
// ------------------------------------------------------------

export type MemoryNodeType = 'meeting' | 'person' | 'project' | 'decision' | 'task'

export interface MemoryNode {
  id: string
  type: MemoryNodeType
  label: string
  description?: string
  timestamp?: string
  x?: number
  y?: number
  z?: number
  weight?: number
  metadata?: Record<string, string | number | boolean>
}

export interface MemoryEdge {
  id: string
  source: string
  target: string
  type: 'participated' | 'decided' | 'assigned' | 'relates_to' | 'depends_on' | 'followed_up'
  label?: string
  weight?: number
}

// ------------------------------------------------------------
// Dashboard
// ------------------------------------------------------------

export interface DashboardMetrics {
  totalMeetings: number
  meetingsThisWeek: number
  activeTasks: number
  overdueTasks: number
  pendingClarifications: number
  completedTasksThisWeek: number
  averageConfidence: number
  processingQueueSize: number
}

// ------------------------------------------------------------
// Processing Pipeline
// ------------------------------------------------------------

export interface ProcessingStage {
  id: string
  key: MeetingProcessingState
  label: string
  description: string
  icon: string
  estimatedSeconds?: number
}

// ------------------------------------------------------------
// API Contract
// ------------------------------------------------------------

export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
  timestamp: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, string>
  timestamp: string
}

export interface TaskFilters {
  status?: TaskStatus[]
  priority?: Priority[]
  owner?: string
  search?: string
  deadline?: 'overdue' | 'today' | 'this_week' | 'all'
  meetingId?: string
  page?: number
  pageSize?: number
  sortBy?: 'deadline' | 'priority' | 'createdAt' | 'updatedAt' | 'owner'
  sortOrder?: 'asc' | 'desc'
}

export interface MeetingFilters {
  status?: MeetingStatus[]
  search?: string
  page?: number
  pageSize?: number
}

// Valid task state transitions
export const TASK_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  pending: ['in_progress'],
  in_progress: ['completed', 'blocked', 'escalated'],
  blocked: ['in_progress', 'escalated'],
  overdue: ['in_progress', 'escalated', 'completed'],
  escalated: ['in_progress', 'completed'],
  completed: [],
}
