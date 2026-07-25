// Local types for mock data (separate from the main Meeting/Task types in @/types)
export interface Meeting {
  id: string
  title: string
  date: string
  duration: number
  participants: string[]
  transcript: string
  summary: string
  decisions: string[]
  actionItems: ActionItem[]
  risks: string[]
  status: 'completed' | 'in-progress' | 'scheduled' | 'cancelled'
}

export interface ActionItem {
  id: string
  title: string
  owner: string
  deadline: string
  status: 'pending' | 'in-progress' | 'completed'
  priority: 'critical' | 'high' | 'medium' | 'low'
  meetingId: string
}

export interface Task {
  id: string
  title: string
  description: string
  assignee: string
  dueDate: string
  status: 'todo' | 'in-progress' | 'review' | 'done'
  priority: 'critical' | 'high' | 'medium' | 'low'
  tags: string[]
  createdAt: string
}

export interface Agent {
  id: string
  name: string
  type: string
  status: 'running' | 'idle' | 'completed' | 'error'
  lastRun: string
  confidence: number
}

export interface AgentStatus {
  agentId: string
  status: 'running' | 'idle' | 'completed' | 'error'
  progress: number
  message: string
  startedAt?: string
}

export interface TeamMember {
  id: string
  name: string
  role: string
  avatar: string
  email: string
  status: 'online' | 'away' | 'busy' | 'offline'
}

export interface AnalyticsData {
  productivityScore: number
  completionRate: number
  teamWorkload: number
  meetingsThisWeek: number
  tasksCompleted: number
  averageMeetingDuration: number
  previousWeek: {
    productivityScore: number
    completionRate: number
    tasksCompleted: number
  }
  productivityTrend: { date: string; score: number }[]
  weeklyDistribution: { day: string; meetings: number; tasks: number }[]
  agentEffectiveness: { agent: string; accuracy: number; tasks: number }[]
}

export interface TimelineEvent {
  id: string
  type: 'meeting' | 'task' | 'decision' | 'milestone' | 'note'
  title: string
  description: string
  timestamp: string
  userId: string
  meetingId?: string
}

export interface WorkflowNode {
  id: string
  type: 'input' | 'process' | 'decision' | 'output' | 'agent'
  position: { x: number; y: number }
  data: {
    label: string
    description?: string
    icon?: string
    status?: 'pending' | 'running' | 'completed' | 'error' | 'idle'
  }
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  label?: string
  animated?: boolean
  style?: { stroke?: string; strokeWidth?: number; strokeDasharray?: string }
}

export interface Workflow {
  id: string
  name: string
  description: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  status: 'draft' | 'active' | 'paused' | 'completed'
  createdAt: string
  updatedAt: string
}

export const mockMeetings: Meeting[] = [
  {
    id: 'mtg-001',
    title: 'Q4 Product Strategy Review',
    date: '2026-07-24T14:00:00Z',
    duration: 3600,
    participants: ['alice@cortex.ai', 'bob@cortex.ai', 'carol@cortex.ai', 'dave@cortex.ai'],
    transcript: 'Full transcript of the Q4 strategy review meeting...',
    summary: 'Finalized Q4 roadmap focusing on AI-powered analytics, enhanced security features, and enterprise integrations. Decided to push the mobile SDK to Q1 2027.',
    decisions: [
      'Launch AI Analytics module in October',
      'Enterprise SSO integration to be completed by Nov 15',
      'Postpone mobile SDK development to Q1 2027',
      'Increase engineering hiring by 30% in Q4',
    ],
    actionItems: [
      {
        id: 'ai-001',
        title: 'Draft detailed AI Analytics spec',
        owner: 'Alice',
        deadline: '2026-08-01T00:00:00Z',
        status: 'in-progress',
        priority: 'high',
        meetingId: 'mtg-001',
      },
      {
        id: 'ai-002',
        title: 'Enterprise SSO - evaluate vendors',
        owner: 'Bob',
        deadline: '2026-08-05T00:00:00Z',
        status: 'pending',
        priority: 'medium',
        meetingId: 'mtg-001',
      },
      {
        id: 'ai-003',
        title: 'Prepare hiring plan for engineering team',
        owner: 'Carol',
        deadline: '2026-08-10T00:00:00Z',
        status: 'pending',
        priority: 'high',
        meetingId: 'mtg-001',
      },
    ],
    risks: ['Mobile SDK delay may impact partner commitments', 'Hiring timeline is aggressive'],
    status: 'completed',
  },
  {
    id: 'mtg-002',
    title: 'Sprint Planning - Week 30',
    date: '2026-07-25T09:00:00Z',
    duration: 2700,
    participants: ['alice@cortex.ai', 'bob@cortex.ai', 'eve@cortex.ai', 'frank@cortex.ai'],
    transcript: 'Sprint planning transcript content...',
    summary: 'Planned sprint 30 with focus on bug fixes, performance improvements, and UI polish for the dashboard redesign.',
    decisions: [
      'Dedicate 40% of sprint to tech debt reduction',
      'Dashboard redesign to be completed in 2 sprints',
      'Adopt new testing framework for all new features',
    ],
    actionItems: [
      {
        id: 'ai-004',
        title: 'Refactor authentication middleware',
        owner: 'Eve',
        deadline: '2026-07-30T00:00:00Z',
        status: 'in-progress',
        priority: 'high',
        meetingId: 'mtg-002',
      },
      {
        id: 'ai-005',
        title: 'Dashboard redesign - component library audit',
        owner: 'Frank',
        deadline: '2026-07-28T00:00:00Z',
        status: 'pending',
        priority: 'medium',
        meetingId: 'mtg-002',
      },
    ],
    risks: [],
    status: 'in-progress',
  },
  {
    id: 'mtg-003',
    title: 'Client Success Review - Acme Corp',
    date: '2026-07-23T15:00:00Z',
    duration: 1800,
    participants: ['carol@cortex.ai', 'dave@cortex.ai', 'grace@cortex.ai'],
    transcript: 'Client success review transcript...',
    summary: 'Acme Corp is satisfied with the platform but requesting better reporting capabilities. Account at risk due to competitor offering lower price.',
    decisions: [
      'Offer 15% discount for annual commitment',
      'Fast-track custom report builder feature',
      'Schedule technical deep-dive for their engineering team',
    ],
    actionItems: [
      {
        id: 'ai-006',
        title: 'Prepare custom proposal for Acme Corp',
        owner: 'Carol',
        deadline: '2026-07-28T00:00:00Z',
        status: 'in-progress',
        priority: 'critical',
        meetingId: 'mtg-003',
      },
      {
        id: 'ai-007',
        title: 'Schedule demo of upcoming reporting features',
        owner: 'Grace',
        deadline: '2026-07-26T00:00:00Z',
        status: 'completed',
        priority: 'high',
        meetingId: 'mtg-003',
      },
    ],
    risks: ['Account churn risk if discount not approved', 'Competitor actively targeting'],
    status: 'completed',
  },
  {
    id: 'mtg-004',
    title: 'Architecture Review - AI Pipeline',
    date: '2026-07-26T11:00:00Z',
    duration: 5400,
    participants: ['alice@cortex.ai', 'bob@cortex.ai', 'eve@cortex.ai', 'hank@cortex.ai'],
    transcript: 'Architecture review of the new AI pipeline...',
    summary: 'Reviewed the proposed architecture for the real-time AI processing pipeline. Approved the event-driven approach with Kafka. Need to address scalability concerns.',
    decisions: [
      'Adopt event-driven architecture with Kafka',
      'Use Kubernetes for orchestration',
      'Implement circuit breaker pattern for resilience',
      'Redis for caching layer',
    ],
    actionItems: [
      {
        id: 'ai-008',
        title: 'Create detailed design document for Kafka integration',
        owner: 'Hank',
        deadline: '2026-08-02T00:00:00Z',
        status: 'pending',
        priority: 'high',
        meetingId: 'mtg-004',
      },
      {
        id: 'ai-009',
        title: 'Proof of concept for circuit breaker implementation',
        owner: 'Eve',
        deadline: '2026-08-05T00:00:00Z',
        status: 'pending',
        priority: 'medium',
        meetingId: 'mtg-004',
      },
    ],
    risks: ['Kafka operational complexity', 'Team lacks Kafka expertise'],
    status: 'scheduled',
  },
  {
    id: 'mtg-005',
    title: 'Weekly Team Standup',
    date: '2026-07-25T08:30:00Z',
    duration: 900,
    participants: ['alice@cortex.ai', 'bob@cortex.ai', 'carol@cortex.ai', 'dave@cortex.ai', 'eve@cortex.ai', 'frank@cortex.ai'],
    transcript: 'Standup meeting transcript...',
    summary: 'Quick standup. All team members are on track. Bob needs help with SSO integration. Frank completed the component library audit.',
    decisions: [],
    actionItems: [
      {
        id: 'ai-010',
        title: 'Pair programming session on SSO',
        owner: 'Alice',
        deadline: '2026-07-25T17:00:00Z',
        status: 'completed',
        priority: 'medium',
        meetingId: 'mtg-005',
      },
    ],
    risks: [],
    status: 'completed',
  },
]

export const mockActionItems: ActionItem[] = [
  ...mockMeetings.flatMap((m) => m.actionItems),
  {
    id: 'ai-011',
    title: 'Update deployment pipeline documentation',
    owner: 'Dave',
    deadline: '2026-08-15T00:00:00Z',
    status: 'pending',
    priority: 'low',
    meetingId: 'mtg-001',
  },
  {
    id: 'ai-012',
    title: 'Security audit for API endpoints',
    owner: 'Eve',
    deadline: '2026-08-10T00:00:00Z',
    status: 'in-progress',
    priority: 'critical',
    meetingId: 'mtg-004',
  },
]

export const mockTeamMembers: TeamMember[] = [
  { id: 'usr-001', name: 'Alice Chen', role: 'Product Manager', avatar: 'AC', email: 'alice@cortex.ai', status: 'online' },
  { id: 'usr-002', name: 'Bob Martinez', role: 'Senior Engineer', avatar: 'BM', email: 'bob@cortex.ai', status: 'busy' },
  { id: 'usr-003', name: 'Carol Williams', role: 'Account Executive', avatar: 'CW', email: 'carol@cortex.ai', status: 'online' },
  { id: 'usr-004', name: 'Dave Thompson', role: 'DevOps Engineer', avatar: 'DT', email: 'dave@cortex.ai', status: 'away' },
  { id: 'usr-005', name: 'Eve Park', role: 'Security Engineer', avatar: 'EP', email: 'eve@cortex.ai', status: 'online' },
  { id: 'usr-006', name: 'Frank Johnson', role: 'Frontend Engineer', avatar: 'FJ', email: 'frank@cortex.ai', status: 'offline' },
  { id: 'usr-007', name: 'Grace Lee', role: 'Customer Success', avatar: 'GL', email: 'grace@cortex.ai', status: 'online' },
  { id: 'usr-008', name: 'Hank Davis', role: 'Data Engineer', avatar: 'HD', email: 'hank@cortex.ai', status: 'busy' },
]

export const mockTasks: Task[] = [
  { id: 'task-001', title: 'Implement dark mode toggle', description: 'Add theme switcher with persistent storage', assignee: 'Frank Johnson', dueDate: '2026-07-30T00:00:00Z', status: 'in-progress', priority: 'medium', tags: ['ui', 'frontend'], createdAt: '2026-07-20T00:00:00Z' },
  { id: 'task-002', title: 'Add real-time transcription WebSocket', description: 'Connect to WebSocket endpoint for live transcription streaming', assignee: 'Bob Martinez', dueDate: '2026-08-01T00:00:00Z', status: 'todo', priority: 'high', tags: ['backend', 'realtime'], createdAt: '2026-07-21T00:00:00Z' },
  { id: 'task-003', title: 'Agent dashboard UI', description: 'Build agent status dashboard with progress indicators', assignee: 'Frank Johnson', dueDate: '2026-08-05T00:00:00Z', status: 'todo', priority: 'high', tags: ['ui', 'dashboard'], createdAt: '2026-07-22T00:00:00Z' },
  { id: 'task-004', title: 'OAuth integration with Google', description: 'Implement sign-in with Google using NextAuth', assignee: 'Bob Martinez', dueDate: '2026-07-28T00:00:00Z', status: 'in-progress', priority: 'critical', tags: ['auth', 'security'], createdAt: '2026-07-19T00:00:00Z' },
  { id: 'task-005', title: 'Performance optimization - bundle size', description: 'Reduce initial JS bundle by 30% using code splitting', assignee: 'Frank Johnson', dueDate: '2026-08-10T00:00:00Z', status: 'todo', priority: 'medium', tags: ['performance', 'frontend'], createdAt: '2026-07-23T00:00:00Z' },
  { id: 'task-006', title: 'API rate limiting middleware', description: 'Implement rate limiting for public API endpoints', assignee: 'Dave Thompson', dueDate: '2026-07-29T00:00:00Z', status: 'review', priority: 'high', tags: ['backend', 'security'], createdAt: '2026-07-18T00:00:00Z' },
  { id: 'task-007', title: 'Data export feature', description: 'Allow users to export meeting data as PDF and CSV', assignee: 'Frank Johnson', dueDate: '2026-08-15T00:00:00Z', status: 'todo', priority: 'low', tags: ['feature', 'frontend', 'backend'], createdAt: '2026-07-24T00:00:00Z' },
  { id: 'task-008', title: 'CI/CD pipeline migration', description: 'Migrate from Jenkins to GitHub Actions', assignee: 'Dave Thompson', dueDate: '2026-07-31T00:00:00Z', status: 'done', priority: 'high', tags: ['devops', 'infrastructure'], createdAt: '2026-07-15T00:00:00Z' },
]

export const mockAnalytics: AnalyticsData = {
  productivityScore: 84,
  completionRate: 72,
  teamWorkload: 68,
  meetingsThisWeek: 12,
  tasksCompleted: 48,
  averageMeetingDuration: 42,
  previousWeek: {
    productivityScore: 78,
    completionRate: 65,
    tasksCompleted: 41,
  },
  productivityTrend: [
    { date: '2026-07-19', score: 72 },
    { date: '2026-07-20', score: 75 },
    { date: '2026-07-21', score: 79 },
    { date: '2026-07-22', score: 82 },
    { date: '2026-07-23', score: 81 },
    { date: '2026-07-24', score: 84 },
    { date: '2026-07-25', score: 84 },
  ],
  weeklyDistribution: [
    { day: 'Mon', meetings: 3, tasks: 12 },
    { day: 'Tue', meetings: 2, tasks: 8 },
    { day: 'Wed', meetings: 4, tasks: 15 },
    { day: 'Thu', meetings: 1, tasks: 10 },
    { day: 'Fri', meetings: 2, tasks: 6 },
  ],
  agentEffectiveness: [
    { agent: 'Transcriber', accuracy: 96, tasks: 142 },
    { agent: 'Summarizer', accuracy: 88, tasks: 98 },
    { agent: 'Analyzer', accuracy: 91, tasks: 76 },
    { agent: 'Scheduler', accuracy: 99, tasks: 203 },
    { agent: 'Researcher', accuracy: 79, tasks: 54 },
  ],
}

export const mockAgents: Agent[] = [
  { id: 'agent-001', name: 'Transcriptor', type: 'transcriber', status: 'running', lastRun: '2026-07-25T08:00:00Z', confidence: 96 },
  { id: 'agent-002', name: 'Summarizer', type: 'summarizer', status: 'idle', lastRun: '2026-07-25T07:30:00Z', confidence: 88 },
  { id: 'agent-003', name: 'Insight Analyzer', type: 'analyzer', status: 'completed', lastRun: '2026-07-25T06:00:00Z', confidence: 91 },
  { id: 'agent-004', name: 'Smart Scheduler', type: 'scheduler', status: 'running', lastRun: '2026-07-25T09:00:00Z', confidence: 99 },
  { id: 'agent-005', name: 'Deep Researcher', type: 'researcher', status: 'error', lastRun: '2026-07-24T22:00:00Z', confidence: 79 },
]

export const mockAgentStatuses: Record<string, AgentStatus> = {
  'agent-001': { agentId: 'agent-001', status: 'running', progress: 67, message: 'Transcribing meeting mtg-002', startedAt: '2026-07-25T08:00:00Z' },
  'agent-002': { agentId: 'agent-002', status: 'idle', progress: 0, message: 'Waiting for new meeting' },
  'agent-003': { agentId: 'agent-003', status: 'completed', progress: 100, message: 'Analysis complete for mtg-001', startedAt: '2026-07-25T05:30:00Z' },
  'agent-004': { agentId: 'agent-004', status: 'running', progress: 33, message: 'Optimizing team calendar', startedAt: '2026-07-25T09:00:00Z' },
  'agent-005': { agentId: 'agent-005', status: 'error', progress: 0, message: 'API rate limit exceeded', startedAt: '2026-07-24T21:55:00Z' },
}

export const mockTimelineEvents: TimelineEvent[] = [
  { id: 'evt-001', type: 'meeting', title: 'Q4 Product Strategy Review', description: 'Completed strategy review meeting', timestamp: '2026-07-24T15:00:00Z', userId: 'usr-001', meetingId: 'mtg-001' },
  { id: 'evt-002', type: 'decision', title: 'AI Analytics Module Approved', description: 'Decided to launch AI Analytics in October', timestamp: '2026-07-24T15:30:00Z', userId: 'usr-001', meetingId: 'mtg-001' },
  { id: 'evt-003', type: 'task', title: 'Draft AI Analytics Spec', description: 'Assigned to Alice', timestamp: '2026-07-24T15:35:00Z', userId: 'usr-002', meetingId: 'mtg-001' },
  { id: 'evt-004', type: 'meeting', title: 'Sprint Planning - Week 30', description: 'Sprint planning in progress', timestamp: '2026-07-25T09:00:00Z', userId: 'usr-001', meetingId: 'mtg-002' },
  { id: 'evt-005', type: 'milestone', title: 'Component Library Audit Complete', description: 'Frank completed the UI component audit', timestamp: '2026-07-25T10:15:00Z', userId: 'usr-006' },
  { id: 'evt-006', type: 'task', title: 'OAuth Integration In Progress', description: 'Bob started working on Google OAuth', timestamp: '2026-07-25T09:30:00Z', userId: 'usr-002' },
  { id: 'evt-007', type: 'note', title: 'Acme Corp - Risk Flagged', description: 'Account at risk, preparing proposal', timestamp: '2026-07-23T16:00:00Z', userId: 'usr-003', meetingId: 'mtg-003' },
  { id: 'evt-008', type: 'milestone', title: 'CI/CD Migration Complete', description: 'Successfully migrated to GitHub Actions', timestamp: '2026-07-24T18:00:00Z', userId: 'usr-004' },
]

export const mockWorkflows: Workflow[] = [
  {
    id: 'wf-001',
    name: 'Meeting Intelligence Pipeline',
    description: 'Automated meeting transcription, summarization, and action item extraction',
    status: 'active',
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-25T00:00:00Z',
    nodes: [
      { id: 'wf-001-start', type: 'input', position: { x: 250, y: 0 }, data: { label: 'Meeting Start', description: 'Triggers when meeting begins' } },
      { id: 'wf-001-transcribe', type: 'process', position: { x: 250, y: 150 }, data: { label: 'Real-time Transcription', description: 'Transcribe audio to text', status: 'running' } },
      { id: 'wf-001-analyze', type: 'process', position: { x: 100, y: 300 }, data: { label: 'Sentiment Analysis', description: 'Analyze tone and sentiment', status: 'completed' } },
      { id: 'wf-001-extract', type: 'process', position: { x: 400, y: 300 }, data: { label: 'Entity Extraction', description: 'Extract names, dates, and key terms', status: 'idle' } },
      { id: 'wf-001-decide', type: 'decision', position: { x: 250, y: 450 }, data: { label: 'Quality Check', description: 'Verify transcription accuracy' } },
      { id: 'wf-001-summarize', type: 'agent', position: { x: 100, y: 600 }, data: { label: 'Summarizer Agent', description: 'Generate meeting summary' } },
      { id: 'wf-001-actions', type: 'output', position: { x: 400, y: 600 }, data: { label: 'Action Items', description: 'Extract and assign action items' } },
    ],
    edges: [
      { id: 'edge-001', source: 'wf-001-start', target: 'wf-001-transcribe', animated: true, style: { stroke: '#7C3AED', strokeWidth: 2 } },
      { id: 'edge-002', source: 'wf-001-transcribe', target: 'wf-001-analyze', style: { stroke: '#3B82F6', strokeWidth: 1.5 } },
      { id: 'edge-003', source: 'wf-001-transcribe', target: 'wf-001-extract', style: { stroke: '#3B82F6', strokeWidth: 1.5 } },
      { id: 'edge-004', source: 'wf-001-analyze', target: 'wf-001-decide', animated: true, style: { stroke: '#8B5CF6', strokeWidth: 1.5 } },
      { id: 'edge-005', source: 'wf-001-extract', target: 'wf-001-decide', animated: true, style: { stroke: '#8B5CF6', strokeWidth: 1.5 } },
      { id: 'edge-006', source: 'wf-001-decide', target: 'wf-001-summarize', label: 'Pass', style: { stroke: '#10B981', strokeWidth: 2 } },
      { id: 'edge-007', source: 'wf-001-decide', target: 'wf-001-actions', label: 'Pass', style: { stroke: '#10B981', strokeWidth: 2 } },
    ],
  },
  {
    id: 'wf-002',
    name: 'Customer Sentiment Monitor',
    description: 'Monitor customer feedback across channels and alert on sentiment shifts',
    status: 'draft',
    createdAt: '2026-07-20T00:00:00Z',
    updatedAt: '2026-07-22T00:00:00Z',
    nodes: [
      { id: 'wf-002-in', type: 'input', position: { x: 250, y: 0 }, data: { label: 'Feedback Sources', description: 'Email, chat, survey' } },
      { id: 'wf-002-process', type: 'process', position: { x: 250, y: 150 }, data: { label: 'NLP Processing', description: 'Analyze feedback text' } },
      { id: 'wf-002-classify', type: 'decision', position: { x: 250, y: 300 }, data: { label: 'Sentiment Classification', description: 'Positive / Neutral / Negative' } },
      { id: 'wf-002-alert', type: 'output', position: { x: 100, y: 450 }, data: { label: 'Alert Team', description: 'Notify on negative trends' } },
      { id: 'wf-002-report', type: 'output', position: { x: 400, y: 450 }, data: { label: 'Weekly Report', description: 'Aggregate sentiment report' } },
    ],
    edges: [
      { id: 'edge-008', source: 'wf-002-in', target: 'wf-002-process' },
      { id: 'edge-009', source: 'wf-002-process', target: 'wf-002-classify' },
      { id: 'edge-010', source: 'wf-002-classify', target: 'wf-002-alert', label: 'Negative', style: { stroke: '#EF4444', strokeWidth: 2 } },
      { id: 'edge-011', source: 'wf-002-classify', target: 'wf-002-report', label: 'Positive/Neutral', style: { stroke: '#10B981', strokeWidth: 2 } },
    ],
  },
]

export const mockStats = {
  totalMeetings: 156,
  totalActionItems: 423,
  completedActions: 312,
  averageMeetingScore: 87,
  activeAgents: 5,
  teamEfficiency: 84,
  storageUsed: '2.4 GB',
  apiCallsToday: 12893,
}
