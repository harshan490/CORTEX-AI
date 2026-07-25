// ============================================================
// CORTEX AI — Workflow & History Types
// ============================================================

// ------------------------------------------------------------
// Workflow Types
// ------------------------------------------------------------

export type WorkflowStatus =
  | 'queued'
  | 'processing'
  | 'awaiting_review'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type WorkflowStageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

export interface WorkflowStage {
  id: string
  name: string
  status: WorkflowStageStatus
  startedAt?: string
  completedAt?: string
  durationMs?: number
  description: string
  confidence?: number
  retryCount: number
  error?: string
}

export interface Workflow {
  id: string
  meetingId: string
  meetingTitle: string
  status: WorkflowStatus
  currentStage: string
  progress: number
  startedAt: string
  updatedAt: string
  durationMs?: number
  retryCount: number
  approvalStatus?: 'pending' | 'approved' | 'rejected'
  completedStages: number
  totalStages: number
  stages: WorkflowStage[]
}

export interface WorkflowMetrics {
  active: number
  awaitingApproval: number
  completed: number
  failed: number
  avgProcessingTimeMs: number
}

// ------------------------------------------------------------
// History Types
// ------------------------------------------------------------

export type HistorySortField = 'date' | 'title' | 'status'
export type HistorySortOrder = 'asc' | 'desc'
export type HistoryViewMode = 'timeline' | 'table'

export interface HistoryFilters {
  search?: string
  status?: string[]
  dateFrom?: string
  dateTo?: string
  approvalState?: 'approved' | 'rejected' | 'pending'
  highRiskOnly?: boolean
  sortField?: HistorySortField
  sortOrder?: HistorySortOrder
  page?: number
  pageSize?: number
}

export interface HistoryRecord {
  id: string
  title: string
  date: string
  createdAt: string
  status: string
  participantCount: number
  decisionCount: number
  actionItemCount: number
  riskCount: number
  processingConfidence?: number
  processingDurationMs?: number
  approvalOutcome?: 'approved' | 'rejected' | 'pending'
  owner?: string
  executiveSummary?: string
  hasReport: boolean
}

export interface HistoryMetrics {
  totalMeetings: number
  completed: number
  awaitingReview: number
  failed: number
  totalActionItems: number
}
