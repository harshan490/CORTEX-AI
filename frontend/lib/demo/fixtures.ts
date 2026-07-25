// ============================================================
// CORTEX AI — Demo Fixture Data
// Entirely fictional data for demonstration purposes.
// ============================================================

import type {
  Meeting,
  AgentActivity,
  MemoryNode,
  MemoryEdge,
  DashboardMetrics,
  MeetingReport,
  Reminder,
} from '@/types'

// ------------------------------------------------------------
// Reminders
// ------------------------------------------------------------
const reminder1: Reminder = {
  id: 'rem-001',
  taskId: 'task-001',
  scheduledAt: '2026-07-18T09:00:00Z',
  sentAt: '2026-07-18T09:00:03Z',
  channel: 'email',
  recipient: 'sarah.chen@example.com',
  status: 'sent',
  message: 'Reminder: Platform migration architecture document due tomorrow.',
}

const reminder2: Reminder = {
  id: 'rem-002',
  taskId: 'task-001',
  scheduledAt: '2026-07-20T09:00:00Z',
  channel: 'email',
  recipient: 'sarah.chen@example.com',
  status: 'failed',
  message: 'Follow-up: Platform migration document is now overdue.',
}

// ------------------------------------------------------------
// Meetings
// ------------------------------------------------------------

export const DEMO_MEETINGS: Meeting[] = [
  {
    id: 'mtg-001',
    title: 'Q3 Platform Migration Planning',
    description: 'Strategic review of the infrastructure migration to cloud-native architecture.',
    inputMethod: 'transcript',
    processingState: 'awaiting_review',
    createdAt: '2026-07-15T14:00:00Z',
    updatedAt: '2026-07-15T14:23:00Z',
    duration: 3720,
    status: 'awaiting_review',
    participants: [
      { id: 'p1', name: 'Sarah Chen', role: 'Engineering Lead', email: 'sarah.chen@example.com', speakerLabel: 'Speaker 1', confidence: 0.97 },
      { id: 'p2', name: 'Marcus Rivera', role: 'CTO', email: 'marcus.rivera@example.com', speakerLabel: 'Speaker 2', confidence: 0.95 },
      { id: 'p3', name: 'Priya Nair', role: 'DevOps Architect', email: 'priya.nair@example.com', speakerLabel: 'Speaker 3', confidence: 0.93 },
      { id: 'p4', name: 'James Okafor', role: 'Security Lead', email: 'james.okafor@example.com', speakerLabel: 'Speaker 4', confidence: 0.88 },
    ],
    transcript: [
      { id: 'ts-001', startTime: 0, endTime: 18, speaker: 'Marcus Rivera', speakerId: 'p2', text: "Alright, let's get started. The main goal today is to finalize our migration roadmap for Q3. Sarah, can you walk us through the current architecture assessment?", confidence: 0.96 },
      { id: 'ts-002', startTime: 19, endTime: 52, speaker: 'Sarah Chen', speakerId: 'p1', text: "Sure. We've completed the dependency mapping for all twelve services. The core issue is that our auth service has a hard dependency on the legacy Oracle database. I'd recommend we tackle the stateless services first, starting with the API gateway and the notification pipeline.", confidence: 0.97 },
      { id: 'ts-003', startTime: 53, endTime: 89, speaker: 'Marcus Rivera', speakerId: 'p2', text: "That makes sense. Priya, what's the Kubernetes cluster readiness looking like? Can we meet the August fifteenth target?", confidence: 0.95 },
      { id: 'ts-004', startTime: 90, endTime: 134, speaker: 'Priya Nair', speakerId: 'p3', text: "The staging cluster is ready. Production has a blocker — we're waiting on the network team to configure the VPC peering. I'd plan for a two-week buffer.", confidence: 0.93 },
      { id: 'ts-005', startTime: 135, endTime: 178, speaker: 'James Okafor', speakerId: 'p4', text: "I need to flag a security concern. The migration plan doesn't include a security audit for the new infrastructure. We need at least three weeks for a proper assessment before anything touches production.", confidence: 0.91 },
      { id: 'ts-006', startTime: 179, endTime: 210, speaker: 'Marcus Rivera', speakerId: 'p2', text: "Agreed, James. Let's make the security audit a hard prerequisite. Sarah, does this change your sequencing?", confidence: 0.96 },
      { id: 'ts-007', startTime: 211, endTime: 254, speaker: 'Sarah Chen', speakerId: 'p1', text: "It does. If the audit needs three weeks and we need the VPC peering resolved first, the August fifteenth date is no longer realistic. I'd push the production cutover to September nineteenth.", confidence: 0.97 },
      { id: 'ts-008', startTime: 255, endTime: 290, speaker: 'Marcus Rivera', speakerId: 'p2', text: "September nineteenth it is. Let's formally decide that today. Priya, please put together the rollback procedure documentation as well.", confidence: 0.94 },
    ],
    topics: [
      { id: 'top-001', title: 'Architecture Assessment', startTime: 0, endTime: 89, summary: 'Current state review: legacy Oracle dependency identified as migration blocker.', segmentIds: ['ts-001', 'ts-002'], keyPoints: ['12 services mapped', 'Auth service blocked by Oracle DB', 'API gateway + notification pipeline first'] },
      { id: 'top-002', title: 'Infrastructure Readiness', startTime: 90, endTime: 134, summary: 'Staging cluster ready; production blocked on VPC peering.', segmentIds: ['ts-003', 'ts-004'], keyPoints: ['Staging: ready', 'Production: VPC peering blocker', '2-week buffer recommended'] },
      { id: 'top-003', title: 'Security Requirements', startTime: 135, endTime: 210, summary: 'Security audit declared mandatory prerequisite; 3-week minimum.', segmentIds: ['ts-005', 'ts-006'], keyPoints: ['3 weeks minimum', 'Hard prerequisite before production'] },
      { id: 'top-004', title: 'Revised Timeline', startTime: 211, endTime: 290, summary: 'Production cutover pushed to September 19.', segmentIds: ['ts-007', 'ts-008'], keyPoints: ['New date: September 19', 'Rollback docs: Priya'] },
    ],
    executiveSummary: 'The Q3 platform migration timeline has been revised to September 19, 2026 due to two blockers: a mandatory 3-week security audit and a VPC peering dependency. Key assignments: Sarah Chen produces architecture document, James Okafor leads security audit, Priya Nair manages rollback documentation.',
    decisions: [
      { id: 'dec-001', meetingId: 'mtg-001', title: 'Production cutover rescheduled to September 19', description: 'The original August 15 date is infeasible given the mandatory security audit and VPC peering timeline uncertainty.', decidedBy: ['Marcus Rivera', 'Sarah Chen'], evidenceSegmentIds: ['ts-007', 'ts-008'], confidence: 0.96, timestamp: '2026-07-15T14:14:00Z' },
      { id: 'dec-002', meetingId: 'mtg-001', title: 'Security audit is a hard prerequisite for production migration', description: 'All production workloads must complete a 3-week security audit before cutover.', decidedBy: ['Marcus Rivera', 'James Okafor'], evidenceSegmentIds: ['ts-005', 'ts-006'], confidence: 0.98, timestamp: '2026-07-15T14:08:00Z' },
    ],
    actionItems: [
      {
        id: 'task-001', meetingId: 'mtg-001', title: 'Update architecture document with revised migration sequence', description: 'Document the revised migration order prioritizing stateless services.', owner: 'Sarah Chen', ownerEmail: 'sarah.chen@example.com', deadline: '2026-07-25T17:00:00Z', priority: 'high', status: 'overdue', evidenceSegmentIds: ['ts-007', 'ts-002'], dependencies: [], clarificationIds: [], confidence: 0.97, createdAt: '2026-07-15T14:23:00Z', updatedAt: '2026-07-20T09:00:00Z', reminders: [reminder1, reminder2], activityLog: [{ id: 'al-001', timestamp: '2026-07-15T14:23:00Z', agent: 'Cortex Planning', action: 'Task created from meeting transcript', outcome: 'success' }], tags: ['architecture', 'documentation', 'migration'],
      },
      {
        id: 'task-002', meetingId: 'mtg-001', title: 'Conduct security audit of new cloud infrastructure', description: 'Comprehensive security assessment covering network isolation, IAM policies, and compliance.', owner: 'James Okafor', ownerEmail: 'james.okafor@example.com', deadline: '2026-08-15T17:00:00Z', priority: 'critical', status: 'pending', evidenceSegmentIds: ['ts-005', 'ts-006'], dependencies: ['task-001'], clarificationIds: [], confidence: 0.95, createdAt: '2026-07-15T14:23:00Z', updatedAt: '2026-07-15T14:23:00Z', reminders: [], activityLog: [{ id: 'al-002', timestamp: '2026-07-15T14:23:00Z', agent: 'Cortex Planning', action: 'Task created from meeting transcript', outcome: 'success' }], tags: ['security', 'compliance', 'audit'],
      },
      {
        id: 'task-003', meetingId: 'mtg-001', title: 'Prepare rollback procedure documentation', description: 'Document complete rollback procedures for each service migration phase.', owner: 'Priya Nair', ownerEmail: 'priya.nair@example.com', deadline: '2026-09-05T17:00:00Z', priority: 'high', status: 'in_progress', evidenceSegmentIds: ['ts-008'], dependencies: ['task-001'], clarificationIds: [], confidence: 0.93, createdAt: '2026-07-15T14:23:00Z', updatedAt: '2026-07-18T10:30:00Z', reminders: [], activityLog: [{ id: 'al-003', timestamp: '2026-07-18T10:30:00Z', agent: 'Priya Nair', action: 'Status updated to in_progress', outcome: 'success' }], tags: ['infrastructure', 'documentation', 'rollback'],
      },
    ],
    risks: [
      { id: 'risk-001', meetingId: 'mtg-001', title: 'VPC peering delay may compress migration timeline', description: "Network team's VPC peering resolution is uncertain. If delayed, the security audit cannot begin on schedule.", severity: 'high', likelihood: 'medium', mitigation: 'Escalate to network leadership. Consider parallel preparation tasks.', owner: 'Priya Nair', evidenceSegmentIds: ['ts-004'], confidence: 0.89 },
    ],
    dependencies: [
      { id: 'dep-001', meetingId: 'mtg-001', fromItemId: 'task-002', toItemId: 'task-001', type: 'requires', description: 'Security audit scope depends on finalized architecture document.' },
    ],
    clarifications: [
      { id: 'clr-001', meetingId: 'mtg-001', question: 'What specific compliance frameworks apply to the security audit?', context: 'James mentioned regulated financial data but did not specify which frameworks (PCI-DSS, SOC 2) apply.', evidenceSegmentIds: ['ts-005'], status: 'pending', createdAt: '2026-07-15T14:23:00Z' },
    ],
    processingConfidence: 0.94,
    agentActivities: [],
    tags: ['migration', 'infrastructure', 'q3', 'security'],
    projectContext: 'Platform Engineering',
  },
  {
    id: 'mtg-002',
    title: 'Product Roadmap Prioritization',
    description: 'Q3/Q4 feature prioritization with engineering and product leadership.',
    inputMethod: 'audio',
    processingState: 'completed',
    createdAt: '2026-07-10T10:00:00Z',
    updatedAt: '2026-07-10T11:45:00Z',
    processedAt: '2026-07-10T11:47:00Z',
    approvedAt: '2026-07-11T09:30:00Z',
    duration: 5400,
    status: 'approved',
    participants: [
      { id: 'p5', name: 'Elena Vasquez', role: 'VP Product', email: 'elena.vasquez@example.com', speakerLabel: 'Speaker 1', confidence: 0.96 },
      { id: 'p6', name: 'Tom Brightwell', role: 'Head of Engineering', email: 'tom.brightwell@example.com', speakerLabel: 'Speaker 2', confidence: 0.94 },
      { id: 'p7', name: 'Anya Singh', role: 'Product Manager', email: 'anya.singh@example.com', speakerLabel: 'Speaker 3', confidence: 0.92 },
    ],
    transcript: [
      { id: 'ts-020', startTime: 0, endTime: 45, speaker: 'Elena Vasquez', speakerId: 'p5', text: "Let's run through the Q3 backlog. We have the analytics dashboard refresh, the integration marketplace, and the notification engine overhaul.", confidence: 0.96 },
      { id: 'ts-021', startTime: 46, endTime: 98, speaker: 'Tom Brightwell', speakerId: 'p6', text: 'Analytics dashboard is the lowest-effort, highest-impact item. We can ship it in six weeks. Integration marketplace is a quarter-long effort and needs dedicated resourcing.', confidence: 0.94 },
      { id: 'ts-022', startTime: 99, endTime: 145, speaker: 'Anya Singh', speakerId: 'p7', text: "From a customer perspective, the analytics dashboard has the most active feature requests. Integration marketplace is our biggest sales enablement gap.", confidence: 0.92 },
      { id: 'ts-023', startTime: 146, endTime: 180, speaker: 'Elena Vasquez', speakerId: 'p5', text: 'Decision: analytics dashboard ships in Q3. Integration marketplace starts in Q3, targets Q4 GA.', confidence: 0.96 },
    ],
    topics: [
      { id: 'top-010', title: 'Q3 Feature Prioritization', startTime: 0, endTime: 180, summary: 'Team aligned on analytics dashboard for Q3, integration marketplace as Q3 start/Q4 GA.', segmentIds: ['ts-020', 'ts-021', 'ts-022', 'ts-023'], keyPoints: ['Analytics dashboard: 6 weeks', 'Integration marketplace: Q3 start, Q4 GA'] },
    ],
    executiveSummary: 'Product and engineering aligned on Q3 priorities: the analytics dashboard refresh ships in Q3 (6-week estimate), the integration marketplace begins in Q3 with a Q4 GA target.',
    decisions: [
      { id: 'dec-010', meetingId: 'mtg-002', title: 'Analytics dashboard refresh ships in Q3', description: 'Lowest effort, highest demand. Six-week engineering estimate approved.', decidedBy: ['Elena Vasquez', 'Tom Brightwell'], evidenceSegmentIds: ['ts-023'], confidence: 0.97, timestamp: '2026-07-10T11:20:00Z' },
    ],
    actionItems: [
      { id: 'task-010', meetingId: 'mtg-002', title: 'Kick off analytics dashboard sprint', description: 'Initialize Q3 sprint for analytics dashboard refresh including design review and technical spec.', owner: 'Anya Singh', ownerEmail: 'anya.singh@example.com', deadline: '2026-07-20T17:00:00Z', priority: 'high', status: 'completed', evidenceSegmentIds: ['ts-023'], dependencies: [], clarificationIds: [], confidence: 0.95, createdAt: '2026-07-10T11:47:00Z', updatedAt: '2026-07-15T09:00:00Z', completedAt: '2026-07-15T09:00:00Z', reminders: [], activityLog: [{ id: 'al-010', timestamp: '2026-07-15T09:00:00Z', agent: 'Anya Singh', action: 'Task marked completed', outcome: 'success' }], tags: ['analytics', 'sprint'] },
    ],
    risks: [],
    dependencies: [],
    clarifications: [],
    processingConfidence: 0.96,
    agentActivities: [],
    tags: ['product', 'roadmap', 'q3', 'q4'],
    projectContext: 'Product',
  },
]

// ------------------------------------------------------------
// Agent Activities
// ------------------------------------------------------------

export const DEMO_ACTIVITIES: AgentActivity[] = [
  { id: 'act-001', meetingId: 'mtg-001', timestamp: '2026-07-15T14:00:05Z', agent: 'Ingestion Agent', subsystem: 'Input Processing', action: 'Received transcript input', reason: 'User submitted meeting transcript via paste interface', outcome: 'success', toolUsed: 'transcript_parser', retryCount: 0, durationMs: 234, relatedEntityId: 'mtg-001', relatedEntityType: 'meeting' },
  { id: 'act-002', meetingId: 'mtg-001', timestamp: '2026-07-15T14:00:06Z', agent: 'Validation Agent', subsystem: 'Input Processing', action: 'Validated transcript format and quality', reason: 'Pre-processing quality check before speaker diarization', outcome: 'success', confidence: 0.99, toolUsed: 'quality_checker', retryCount: 0, durationMs: 89, relatedEntityId: 'mtg-001', relatedEntityType: 'meeting' },
  { id: 'act-003', meetingId: 'mtg-001', timestamp: '2026-07-15T14:00:07Z', agent: 'Speaker Intelligence', subsystem: 'Speech Intelligence', action: 'Identified 4 unique speakers with organizational context', reason: 'Speaker diarization and identity resolution', outcome: 'success', confidence: 0.93, toolUsed: 'speaker_diarizer', retryCount: 0, durationMs: 1203, relatedEntityId: 'mtg-001', relatedEntityType: 'meeting' },
  { id: 'act-004', meetingId: 'mtg-001', timestamp: '2026-07-15T14:00:09Z', agent: 'Memory Agent', subsystem: 'Organizational Memory', action: 'Retrieved 3 related meetings from organizational memory', reason: 'Context retrieval to inform decision and task extraction', outcome: 'success', confidence: 0.88, toolUsed: 'memory_retriever', retryCount: 0, durationMs: 445, relatedEntityId: 'mtg-001', relatedEntityType: 'meeting' },
  { id: 'act-005', meetingId: 'mtg-001', timestamp: '2026-07-15T14:00:11Z', agent: 'Understanding Agent', subsystem: 'Meeting Understanding', action: 'Extracted executive summary and 4 topic segments', reason: 'Structured comprehension of meeting content', outcome: 'success', confidence: 0.94, toolUsed: 'summarizer', retryCount: 0, durationMs: 2847, relatedEntityId: 'mtg-001', relatedEntityType: 'meeting' },
  { id: 'act-006', meetingId: 'mtg-001', timestamp: '2026-07-15T14:00:14Z', agent: 'Decision Agent', subsystem: 'Planning and Reasoning', action: 'Extracted 2 decisions with evidence links', reason: 'Identifying explicit and implicit decisions from transcript', outcome: 'success', confidence: 0.96, toolUsed: 'decision_extractor', retryCount: 0, durationMs: 1893, relatedEntityId: 'mtg-001', relatedEntityType: 'meeting' },
  { id: 'act-007', meetingId: 'mtg-001', timestamp: '2026-07-15T14:00:16Z', agent: 'Action Item Agent', subsystem: 'Planning and Reasoning', action: 'Extracted 3 action items with owner and deadline resolution', reason: 'Action item detection', outcome: 'success', confidence: 0.92, toolUsed: 'action_extractor', retryCount: 0, durationMs: 2341, relatedEntityId: 'mtg-001', relatedEntityType: 'meeting' },
  { id: 'act-008', meetingId: 'mtg-001', timestamp: '2026-07-15T14:00:19Z', agent: 'Risk Agent', subsystem: 'Planning and Reasoning', action: 'Identified 1 project risk', reason: 'Scanning for risk indicators: blockers, uncertainties, and unresolved dependencies', outcome: 'success', confidence: 0.91, toolUsed: 'risk_analyzer', retryCount: 0, durationMs: 987, relatedEntityId: 'mtg-001', relatedEntityType: 'meeting' },
  { id: 'act-009', meetingId: 'mtg-001', timestamp: '2026-07-15T14:00:20Z', agent: 'Verification Agent', subsystem: 'Verification', action: 'Cross-checked all items against transcript evidence', reason: 'Ensuring all extracted items are grounded in transcript content', outcome: 'success', confidence: 0.96, toolUsed: 'evidence_verifier', retryCount: 0, durationMs: 1456, relatedEntityId: 'mtg-001', relatedEntityType: 'meeting' },
  { id: 'act-010', meetingId: 'mtg-001', timestamp: '2026-07-15T14:00:22Z', agent: 'Clarification Agent', subsystem: 'Verification', action: 'Generated 1 clarification request requiring human review', reason: 'Ambiguous information detected requiring human judgment', outcome: 'success', confidence: 0.89, toolUsed: 'clarification_generator', retryCount: 0, durationMs: 678, relatedEntityId: 'mtg-001', relatedEntityType: 'meeting' },
  { id: 'act-011', timestamp: '2026-07-18T09:00:03Z', taskId: 'task-001', agent: 'Reminder Agent', subsystem: 'Reminder Intelligence', action: 'Sent email reminder to sarah.chen@example.com for overdue task', reason: 'Task deadline approaching within 48 hours', outcome: 'success', confidence: 1.0, toolUsed: 'email_sender', retryCount: 0, durationMs: 450, relatedEntityId: 'task-001', relatedEntityType: 'task' },
  { id: 'act-012', timestamp: '2026-07-20T09:00:03Z', taskId: 'task-001', agent: 'Reminder Agent', subsystem: 'Reminder Intelligence', action: 'Follow-up email failed — task now overdue', reason: 'Task past deadline with no completion signal', outcome: 'failed', confidence: 1.0, toolUsed: 'email_sender', retryCount: 2, durationMs: 5200, relatedEntityId: 'task-001', relatedEntityType: 'task' },
]

// ------------------------------------------------------------
// Memory Graph
// ------------------------------------------------------------

export const DEMO_MEMORY_NODES: MemoryNode[] = [
  { id: 'mn-001', type: 'meeting', label: 'Q3 Platform Migration Planning', description: 'July 15, 2026 · 4 participants', timestamp: '2026-07-15T14:00:00Z', x: 0, y: 0, weight: 0.9 },
  { id: 'mn-002', type: 'meeting', label: 'Product Roadmap Prioritization', description: 'July 10, 2026 · 3 participants', timestamp: '2026-07-10T10:00:00Z', x: 280, y: -120, weight: 0.7 },
  { id: 'mn-003', type: 'person', label: 'Sarah Chen', description: 'Engineering Lead', x: -200, y: -160, weight: 0.85 },
  { id: 'mn-004', type: 'person', label: 'Marcus Rivera', description: 'CTO', x: -80, y: -240, weight: 0.9 },
  { id: 'mn-005', type: 'person', label: 'Priya Nair', description: 'DevOps Architect', x: 160, y: -200, weight: 0.75 },
  { id: 'mn-006', type: 'person', label: 'James Okafor', description: 'Security Lead', x: -240, y: 80, weight: 0.7 },
  { id: 'mn-007', type: 'project', label: 'Platform Engineering', description: 'Cloud migration initiative', x: 80, y: 200, weight: 0.8 },
  { id: 'mn-008', type: 'decision', label: 'Cutover: September 19', description: 'Production migration date decision', x: -160, y: 160, weight: 0.85 },
  { id: 'mn-009', type: 'task', label: 'Architecture Document', description: 'Sarah Chen · Overdue', x: -80, y: 280, weight: 0.75 },
  { id: 'mn-010', type: 'task', label: 'Security Audit', description: 'James Okafor · Pending', x: -280, y: 240, weight: 0.7 },
]

export const DEMO_MEMORY_EDGES: MemoryEdge[] = [
  { id: 'me-001', source: 'mn-001', target: 'mn-003', type: 'participated', label: 'led', weight: 0.9 },
  { id: 'me-002', source: 'mn-001', target: 'mn-004', type: 'participated', label: 'attended', weight: 0.85 },
  { id: 'me-003', source: 'mn-001', target: 'mn-005', type: 'participated', label: 'attended', weight: 0.75 },
  { id: 'me-004', source: 'mn-001', target: 'mn-006', type: 'participated', label: 'attended', weight: 0.7 },
  { id: 'me-005', source: 'mn-001', target: 'mn-007', type: 'relates_to', label: 'project context', weight: 0.8 },
  { id: 'me-006', source: 'mn-001', target: 'mn-008', type: 'decided', label: 'produced decision', weight: 0.9 },
  { id: 'me-007', source: 'mn-003', target: 'mn-009', type: 'assigned', label: 'owns', weight: 0.95 },
  { id: 'me-008', source: 'mn-006', target: 'mn-010', type: 'assigned', label: 'owns', weight: 0.9 },
  { id: 'me-009', source: 'mn-009', target: 'mn-007', type: 'relates_to', label: 'part of', weight: 0.8 },
  { id: 'me-010', source: 'mn-002', target: 'mn-007', type: 'relates_to', label: 'adjacent project', weight: 0.5 },
]

// ------------------------------------------------------------
// Dashboard Metrics
// ------------------------------------------------------------

export const DEMO_DASHBOARD_METRICS: DashboardMetrics = {
  totalMeetings: 47,
  meetingsThisWeek: 3,
  activeTasks: 14,
  overdueTasks: 3,
  pendingClarifications: 4,
  completedTasksThisWeek: 8,
  averageConfidence: 0.93,
  processingQueueSize: 1,
}

// ------------------------------------------------------------
// Reports
// ------------------------------------------------------------

export const DEMO_REPORTS: MeetingReport[] = [
  {
    id: 'rpt-001',
    meetingId: 'mtg-001',
    generatedAt: '2026-07-15T14:25:00Z',
    meeting: DEMO_MEETINGS[0],
    summary: DEMO_MEETINGS[0].executiveSummary ?? '',
    keyTakeaways: [
      'Production cutover rescheduled to September 19 — all stakeholders aligned.',
      'Security audit is a hard prerequisite; James Okafor leads.',
      'VPC peering blocker may compress timeline if not resolved.',
    ],
    completionPercentage: 12,
    agentActionSummary:
      'Cortex processed 3,720 seconds of transcript content, identified 4 speakers with 93% average confidence, extracted 2 decisions, 3 action items, 1 risk, and 1 clarification request.',
    totalDecisions: 2,
    totalTasks: 3,
    totalRisks: 1,
    pendingClarifications: 1,
  },
  {
    id: 'rpt-002',
    meetingId: 'mtg-002',
    generatedAt: '2026-07-10T11:50:00Z',
    meeting: DEMO_MEETINGS[1],
    summary: DEMO_MEETINGS[1].executiveSummary ?? '',
    keyTakeaways: [
      'Analytics dashboard ships Q3 — sprint kickoff immediately.',
      'Integration marketplace begins Q3 with Q4 GA target.',
    ],
    completionPercentage: 100,
    agentActionSummary:
      'Cortex processed 5,400 seconds of audio content. 3 speakers identified with 94% average confidence. 1 decision, 1 action item extracted.',
    totalDecisions: 1,
    totalTasks: 1,
    totalRisks: 0,
    pendingClarifications: 0,
  },
]

export const DEMO_ALL_TASKS = DEMO_MEETINGS.flatMap((m) => m.actionItems)
