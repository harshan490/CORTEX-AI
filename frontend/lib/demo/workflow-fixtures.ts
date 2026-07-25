// ============================================================
// CORTEX AI — Demo Workflow Fixture Data
// ============================================================

import type { Workflow, WorkflowStage } from '@/types/workflows'

function makeStages(completedCount: number, failedAt?: number): WorkflowStage[] {
  const stageNames = [
    { name: 'Input Received', desc: 'Meeting input accepted and validated' },
    { name: 'Audio/Transcript Processing', desc: 'Raw input processed into structured transcript segments' },
    { name: 'Speech Intelligence', desc: 'Speaker identification and diarization applied' },
    { name: 'Meeting Understanding', desc: 'Topics, summary, and structure extracted from content' },
    { name: 'Memory Retrieval', desc: 'Relevant context retrieved from organizational memory' },
    { name: 'Planning and Reasoning', desc: 'Strategic analysis and outcome planning performed' },
    { name: 'Decision Extraction', desc: 'Explicit and implicit decisions identified with evidence' },
    { name: 'Action Item Extraction', desc: 'Tasks, owners, and deadlines resolved from discussion' },
    { name: 'Deadline Analysis', desc: 'Deadline feasibility and conflict detection applied' },
    { name: 'Owner Resolution', desc: 'Task ownership confirmed against organizational directory' },
    { name: 'Verification', desc: 'All extracted items cross-checked against transcript evidence' },
    { name: 'Human Approval', desc: 'Results presented for human review and approval' },
    { name: 'Execution', desc: 'Approved items dispatched to integrations and tracking systems' },
    { name: 'Reminder Intelligence', desc: 'Deadline monitoring and reminder schedules configured' },
    { name: 'Final Report', desc: 'Comprehensive meeting report generated and stored' },
  ]

  const baseTime = new Date('2026-07-15T14:00:00Z')
  return stageNames.map((s, i) => {
    const stageStart = new Date(baseTime.getTime() + i * 2000)
    const stageEnd = new Date(stageStart.getTime() + 1500 + Math.random() * 3000)

    if (failedAt !== undefined && i === failedAt) {
      return {
        id: `stage-${i}`,
        name: s.name,
        status: 'failed' as const,
        startedAt: stageStart.toISOString(),
        durationMs: 4200,
        description: s.desc,
        confidence: undefined,
        retryCount: 2,
        error: 'Processing timeout: upstream service did not respond within 30s.',
      }
    }

    if (i < completedCount) {
      return {
        id: `stage-${i}`,
        name: s.name,
        status: 'completed' as const,
        startedAt: stageStart.toISOString(),
        completedAt: stageEnd.toISOString(),
        durationMs: stageEnd.getTime() - stageStart.getTime(),
        description: s.desc,
        confidence: 0.85 + Math.random() * 0.12,
        retryCount: 0,
      }
    }

    if (i === completedCount && failedAt === undefined) {
      return {
        id: `stage-${i}`,
        name: s.name,
        status: 'running' as const,
        startedAt: stageStart.toISOString(),
        description: s.desc,
        retryCount: 0,
      }
    }

    return {
      id: `stage-${i}`,
      name: s.name,
      status: 'pending' as const,
      description: s.desc,
      retryCount: 0,
    }
  })
}

export const DEMO_WORKFLOWS: Workflow[] = [
  {
    id: 'wf-001',
    meetingId: 'mtg-001',
    meetingTitle: 'Q3 Platform Migration Planning',
    status: 'awaiting_review',
    currentStage: 'Human Approval',
    progress: 73,
    startedAt: '2026-07-15T14:00:00Z',
    updatedAt: '2026-07-15T14:00:22Z',
    durationMs: 22000,
    retryCount: 0,
    approvalStatus: 'pending',
    completedStages: 11,
    totalStages: 15,
    stages: makeStages(11),
  },
  {
    id: 'wf-002',
    meetingId: 'mtg-002',
    meetingTitle: 'Product Roadmap Prioritization',
    status: 'completed',
    currentStage: 'Final Report',
    progress: 100,
    startedAt: '2026-07-10T10:00:00Z',
    updatedAt: '2026-07-10T11:47:00Z',
    durationMs: 6420000,
    retryCount: 0,
    approvalStatus: 'approved',
    completedStages: 15,
    totalStages: 15,
    stages: makeStages(15),
  },
  {
    id: 'wf-003',
    meetingId: 'mtg-demo-active',
    meetingTitle: 'Engineering Standup — Sprint 42',
    status: 'processing',
    currentStage: 'Meeting Understanding',
    progress: 20,
    startedAt: '2026-07-25T09:00:00Z',
    updatedAt: '2026-07-25T09:00:08Z',
    durationMs: 8000,
    retryCount: 0,
    completedStages: 3,
    totalStages: 15,
    stages: makeStages(3),
  },
  {
    id: 'wf-004',
    meetingId: 'mtg-demo-failed',
    meetingTitle: 'Vendor Integration Review',
    status: 'failed',
    currentStage: 'Memory Retrieval',
    progress: 27,
    startedAt: '2026-07-20T15:30:00Z',
    updatedAt: '2026-07-20T15:30:12Z',
    durationMs: 12000,
    retryCount: 2,
    completedStages: 4,
    totalStages: 15,
    stages: makeStages(4, 4),
  },
  {
    id: 'wf-005',
    meetingId: 'mtg-demo-cancelled',
    meetingTitle: 'Budget Review — Cancelled',
    status: 'cancelled',
    currentStage: 'Audio/Transcript Processing',
    progress: 7,
    startedAt: '2026-07-22T11:00:00Z',
    updatedAt: '2026-07-22T11:00:04Z',
    durationMs: 4000,
    retryCount: 0,
    completedStages: 1,
    totalStages: 15,
    stages: makeStages(1),
  },
]
