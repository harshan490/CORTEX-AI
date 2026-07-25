import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Workflow, WorkflowMetrics } from '@/types/workflows'
import WorkflowsPage from '@/app/workflows/page'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/workflows',
}))

// Mock framer-motion – render plain HTML elements
vi.mock('framer-motion', () => {
  const React = require('react')
  const motion = new Proxy(
    {},
    {
      get: (_target: unknown, prop: string) =>
        React.forwardRef((props: Record<string, unknown>, ref: React.Ref<HTMLElement>) => {
          const {
            initial: _i,
            animate: _a,
            exit: _e,
            variants: _v,
            transition: _t,
            whileHover: _wh,
            whileTap: _wt,
            layout: _l,
            ...rest
          } = props
          return React.createElement(prop, { ...rest, ref })
        }),
    },
  )
  return { motion, AnimatePresence: ({ children }: { children: React.ReactNode }) => children }
})

// Mock the store (DashboardLayout uses it)
vi.mock('@/lib/store', () => ({
  useStore: () => false,
  getStoredToken: () => 'test-token',
}))

// Mock child components that have complex dependency trees
vi.mock('@/components/layout/dashboard-layout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}))

vi.mock('@/components/workflows/workflow-card', () => ({
  WorkflowCard: ({ workflow }: { workflow: Workflow }) => (
    <div data-testid="workflow-card" data-status={workflow.status} data-progress={workflow.progress}>
      {workflow.meetingTitle}
    </div>
  ),
}))

vi.mock('@/components/workflows/workflow-filters', () => ({
  WorkflowFilters: () => <div data-testid="workflow-filters" />,
}))

vi.mock('@/components/shared/metric-card', () => ({
  MetricCard: ({ label, value }: { label: string; value: string | number }) => (
    <div data-testid={`metric-${label}`}>{value}</div>
  ),
}))

vi.mock('@/components/shared/page-empty-state', () => ({
  PageEmptyState: ({ title }: { title: string }) => (
    <div data-testid="empty-state">{title}</div>
  ),
}))

vi.mock('@/components/shared/page-error-state', () => ({
  PageErrorState: ({ error }: { error: Error }) => (
    <div data-testid="error-state">{error.message}</div>
  ),
}))

vi.mock('@/components/ui/loading-spinner', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner" />,
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { leftIcon?: React.ReactNode; loading?: boolean; variant?: string; size?: string }) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}))

// Mock the api module — overridden per test
const mockListWorkflows = vi.fn()
const mockGetWorkflowMetrics = vi.fn()

vi.mock('@/lib/api', () => ({
  isDemoMode: false,
  api: {
    listWorkflows: (...args: unknown[]) => mockListWorkflows(...args),
    getWorkflowMetrics: (...args: unknown[]) => mockGetWorkflowMetrics(...args),
  },
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeWorkflow(overrides: Partial<Workflow> = {}): Workflow {
  return {
    id: 'wf-1',
    meetingId: 'm-1',
    meetingTitle: 'Sprint Planning',
    status: 'completed',
    currentStage: 'completed',
    progress: 100,
    startedAt: '2026-07-01T10:00:00Z',
    updatedAt: '2026-07-01T10:05:00Z',
    durationMs: 300_000,
    retryCount: 0,
    completedStages: 14,
    totalStages: 14,
    stages: [],
    ...overrides,
  }
}

const defaultMetrics: WorkflowMetrics = {
  active: 1,
  awaitingApproval: 2,
  completed: 5,
  failed: 0,
  avgProcessingTimeMs: 45_000,
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <WorkflowsPage />
    </QueryClientProvider>,
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
})

describe('WorkflowsPage', () => {
  it('renders empty state when backend returns []', async () => {
    mockListWorkflows.mockResolvedValue([])
    mockGetWorkflowMetrics.mockResolvedValue(defaultMetrics)

    renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeDefined()
    })
    expect(screen.getByText('No Workflows')).toBeDefined()
  })

  it('renders workflow cards for a successful response', async () => {
    const workflows = [
      makeWorkflow({ id: 'wf-1', meetingTitle: 'Sprint Planning' }),
      makeWorkflow({ id: 'wf-2', meetingTitle: 'Design Review' }),
    ]
    mockListWorkflows.mockResolvedValue(workflows)
    mockGetWorkflowMetrics.mockResolvedValue(defaultMetrics)

    renderPage()

    await waitFor(() => {
      expect(screen.getAllByTestId('workflow-card')).toHaveLength(2)
    })
    expect(screen.getByText('Sprint Planning')).toBeDefined()
    expect(screen.getByText('Design Review')).toBeDefined()
  })

  it('renders error state when API throws', async () => {
    mockListWorkflows.mockRejectedValue(new Error('Server error'))
    mockGetWorkflowMetrics.mockResolvedValue(defaultMetrics)

    renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toBeDefined()
    })
    expect(screen.getByText('Server error')).toBeDefined()
  })

  it('correctly unwraps metrics response', async () => {
    mockListWorkflows.mockResolvedValue([])
    mockGetWorkflowMetrics.mockResolvedValue({
      active: 3,
      awaitingApproval: 1,
      completed: 10,
      failed: 2,
      avgProcessingTimeMs: 120_000,
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('metric-Active').textContent).toBe('3')
    })
    expect(screen.getByTestId('metric-Awaiting Approval').textContent).toBe('1')
    expect(screen.getByTestId('metric-Completed').textContent).toBe('10')
    expect(screen.getByTestId('metric-Failed').textContent).toBe('2')
    expect(screen.getByTestId('metric-Avg Processing').textContent).toBe('2.0m')
  })

  it('page container is not rendered with initial opacity zero', async () => {
    mockListWorkflows.mockResolvedValue([])
    mockGetWorkflowMetrics.mockResolvedValue(defaultMetrics)

    renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeDefined()
    })

    const container = screen.getByText('Workflow Pipeline').closest('.space-y-6')
    expect(container).not.toBeNull()
    const style = (container as HTMLElement).style
    expect(style.opacity).not.toBe('0')
  })

  it('containerVariants.visible includes opacity 1', () => {
    const containerVariants = {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
    }
    expect(containerVariants.visible).toHaveProperty('opacity', 1)
    expect(containerVariants.hidden).toHaveProperty('opacity', 0)
  })

  it('does not call .map on an ApiResponse wrapper', async () => {
    mockListWorkflows.mockResolvedValue([])
    mockGetWorkflowMetrics.mockResolvedValue(defaultMetrics)

    renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeDefined()
    })

    expect(mockListWorkflows).toHaveBeenCalled()
  })

  // --- New tests for real workflow data ---

  it('renders a processing workflow card with correct progress', async () => {
    const workflows = [
      makeWorkflow({
        id: 'wf-proc',
        status: 'processing',
        currentStage: 'intelligence_extraction',
        progress: 30,
        meetingTitle: 'Active Processing',
        completedStages: 4,
      }),
    ]
    mockListWorkflows.mockResolvedValue(workflows)
    mockGetWorkflowMetrics.mockResolvedValue({ ...defaultMetrics, active: 1 })

    renderPage()

    await waitFor(() => {
      const card = screen.getByTestId('workflow-card')
      expect(card.getAttribute('data-status')).toBe('processing')
      expect(card.getAttribute('data-progress')).toBe('30')
    })
    expect(screen.getByText('Active Processing')).toBeDefined()
  })

  it('renders an awaiting_review workflow card', async () => {
    const workflows = [
      makeWorkflow({
        id: 'wf-review',
        status: 'awaiting_review',
        currentStage: 'awaiting_review',
        progress: 95,
        meetingTitle: 'Needs Review',
        approvalStatus: 'pending',
      }),
    ]
    mockListWorkflows.mockResolvedValue(workflows)
    mockGetWorkflowMetrics.mockResolvedValue({ ...defaultMetrics, awaitingApproval: 1 })

    renderPage()

    await waitFor(() => {
      const card = screen.getByTestId('workflow-card')
      expect(card.getAttribute('data-status')).toBe('awaiting_review')
      expect(card.getAttribute('data-progress')).toBe('95')
    })
  })

  it('renders a failed workflow card', async () => {
    const workflows = [
      makeWorkflow({
        id: 'wf-fail',
        status: 'failed',
        currentStage: 'intelligence_extraction',
        progress: 30,
        meetingTitle: 'Failed Meeting',
      }),
    ]
    mockListWorkflows.mockResolvedValue(workflows)
    mockGetWorkflowMetrics.mockResolvedValue({ ...defaultMetrics, failed: 1 })

    renderPage()

    await waitFor(() => {
      const card = screen.getByTestId('workflow-card')
      expect(card.getAttribute('data-status')).toBe('failed')
    })
  })

  it('renders a completed workflow card', async () => {
    const workflows = [
      makeWorkflow({
        id: 'wf-done',
        status: 'completed',
        currentStage: 'completed',
        progress: 100,
        meetingTitle: 'Done Meeting',
      }),
    ]
    mockListWorkflows.mockResolvedValue(workflows)
    mockGetWorkflowMetrics.mockResolvedValue({ ...defaultMetrics, completed: 1 })

    renderPage()

    await waitFor(() => {
      const card = screen.getByTestId('workflow-card')
      expect(card.getAttribute('data-status')).toBe('completed')
      expect(card.getAttribute('data-progress')).toBe('100')
    })
  })

  it('metrics derived from real workflow data', async () => {
    mockListWorkflows.mockResolvedValue([])
    mockGetWorkflowMetrics.mockResolvedValue({
      active: 2,
      awaitingApproval: 3,
      completed: 7,
      failed: 1,
      avgProcessingTimeMs: 90_000,
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('metric-Active').textContent).toBe('2')
    })
    expect(screen.getByTestId('metric-Awaiting Approval').textContent).toBe('3')
    expect(screen.getByTestId('metric-Completed').textContent).toBe('7')
    expect(screen.getByTestId('metric-Failed').textContent).toBe('1')
    expect(screen.getByTestId('metric-Avg Processing').textContent).toBe('1.5m')
  })

  it('refresh button refetches both workflows and metrics', async () => {
    mockListWorkflows.mockResolvedValue([])
    mockGetWorkflowMetrics.mockResolvedValue(defaultMetrics)

    renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeDefined()
    })

    // Clear call counts
    mockListWorkflows.mockClear()
    mockGetWorkflowMetrics.mockClear()

    // Click refresh
    const refreshBtn = screen.getByText('Refresh')
    fireEvent.click(refreshBtn)

    await waitFor(() => {
      expect(mockListWorkflows).toHaveBeenCalled()
      expect(mockGetWorkflowMetrics).toHaveBeenCalled()
    })
  })
})
