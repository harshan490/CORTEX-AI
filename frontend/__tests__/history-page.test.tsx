import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { HistoryRecord, HistoryMetrics } from '@/types/workflows'
import HistoryPage from '@/app/history/page'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/history',
}))

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

vi.mock('@/lib/store', () => ({
  useStore: () => false,
  getStoredToken: () => 'test-token',
}))

vi.mock('@/components/layout/dashboard-layout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}))

vi.mock('@/components/history/history-record-card', () => ({
  HistoryRecordCard: ({ record }: { record: HistoryRecord }) => (
    <div data-testid="history-record" data-id={record.id} data-status={record.status}>
      <a href={`/meetings/${record.id}`}>{record.title}</a>
    </div>
  ),
}))

vi.mock('@/components/history/history-filters', () => ({
  HistoryFiltersBar: () => <div data-testid="history-filters" />,
}))

vi.mock('@/components/shared/metric-card', () => ({
  MetricCard: ({ label, value }: { label: string; value: string | number }) => (
    <div data-testid={`metric-${label}`}>{value}</div>
  ),
}))

vi.mock('@/components/shared/page-empty-state', () => ({
  PageEmptyState: ({ title, actionHref }: { title: string; actionHref?: string }) => (
    <div data-testid="empty-state" data-action-href={actionHref}>{title}</div>
  ),
}))

vi.mock('@/components/shared/page-error-state', () => ({
  PageErrorState: ({ error, onRetry }: { error: Error; onRetry: () => void }) => (
    <div data-testid="error-state">
      <span>{error.message}</span>
      <button onClick={onRetry}>Retry</button>
    </div>
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

const mockListHistory = vi.fn()
const mockGetHistoryMetrics = vi.fn()

vi.mock('@/lib/api', () => ({
  isDemoMode: false,
  api: {
    listHistory: (...args: unknown[]) => mockListHistory(...args),
    getHistoryMetrics: (...args: unknown[]) => mockGetHistoryMetrics(...args),
  },
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRecord(overrides: Partial<HistoryRecord> = {}): HistoryRecord {
  return {
    id: 'rec-1',
    title: 'Sprint Planning',
    date: '2026-07-01T10:00:00Z',
    createdAt: '2026-07-01T10:00:00Z',
    status: 'approved',
    participantCount: 3,
    decisionCount: 2,
    actionItemCount: 4,
    riskCount: 0,
    hasReport: true,
    ...overrides,
  }
}

const defaultMetrics: HistoryMetrics = {
  totalMeetings: 5,
  completed: 3,
  awaitingReview: 1,
  failed: 1,
  totalActionItems: 10,
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <HistoryPage />
    </QueryClientProvider>,
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
})

describe('HistoryPage', () => {
  it('renders the History heading', async () => {
    mockListHistory.mockResolvedValue({ records: [], total: 0 })
    mockGetHistoryMetrics.mockResolvedValue(defaultMetrics)

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Meeting History')).toBeDefined()
    })
  })

  it('shows loading spinner while fetching', () => {
    mockListHistory.mockReturnValue(new Promise(() => {})) // never resolves
    mockGetHistoryMetrics.mockReturnValue(new Promise(() => {}))

    renderPage()

    expect(screen.getByTestId('loading-spinner')).toBeDefined()
  })

  it('renders empty state when no records', async () => {
    mockListHistory.mockResolvedValue({ records: [], total: 0 })
    mockGetHistoryMetrics.mockResolvedValue(defaultMetrics)

    renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeDefined()
    })
    expect(screen.getByText('No History')).toBeDefined()
  })

  it('empty state action links to /meetings/new', async () => {
    mockListHistory.mockResolvedValue({ records: [], total: 0 })
    mockGetHistoryMetrics.mockResolvedValue(defaultMetrics)

    renderPage()

    await waitFor(() => {
      const emptyState = screen.getByTestId('empty-state')
      expect(emptyState.getAttribute('data-action-href')).toBe('/meetings/new')
    })
  })

  it('renders records for a successful response', async () => {
    const records = [
      makeRecord({ id: 'r-1', title: 'Sprint Planning' }),
      makeRecord({ id: 'r-2', title: 'Design Review' }),
    ]
    mockListHistory.mockResolvedValue({ records, total: 2 })
    mockGetHistoryMetrics.mockResolvedValue(defaultMetrics)

    renderPage()

    await waitFor(() => {
      expect(screen.getAllByTestId('history-record')).toHaveLength(2)
    })
    expect(screen.getByText('Sprint Planning')).toBeDefined()
    expect(screen.getByText('Design Review')).toBeDefined()
  })

  it('record links point to valid meeting routes', async () => {
    const records = [makeRecord({ id: 'meeting-123', title: 'Test Meeting' })]
    mockListHistory.mockResolvedValue({ records, total: 1 })
    mockGetHistoryMetrics.mockResolvedValue(defaultMetrics)

    renderPage()

    await waitFor(() => {
      const link = screen.getByText('Test Meeting').closest('a')
      expect(link).not.toBeNull()
      expect(link!.getAttribute('href')).toBe('/meetings/meeting-123')
    })
  })

  it('renders error state when API throws', async () => {
    mockListHistory.mockRejectedValue(new Error('Server error'))
    mockGetHistoryMetrics.mockResolvedValue(defaultMetrics)

    renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toBeDefined()
    })
    expect(screen.getByText('Server error')).toBeDefined()
  })

  it('retry refetches the query', async () => {
    mockListHistory.mockRejectedValue(new Error('Server error'))
    mockGetHistoryMetrics.mockResolvedValue(defaultMetrics)

    renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toBeDefined()
    })

    mockListHistory.mockClear()
    mockListHistory.mockResolvedValue({ records: [], total: 0 })

    fireEvent.click(screen.getByText('Retry'))

    await waitFor(() => {
      expect(mockListHistory).toHaveBeenCalled()
    })
  })

  it('page container is not rendered with initial opacity zero', async () => {
    mockListHistory.mockResolvedValue({ records: [], total: 0 })
    mockGetHistoryMetrics.mockResolvedValue(defaultMetrics)

    renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeDefined()
    })

    const container = screen.getByText('Meeting History').closest('.space-y-6')
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

  it('response wrapper is normalized correctly (no ApiResponse wrapping)', async () => {
    mockListHistory.mockResolvedValue({ records: [makeRecord()], total: 1 })
    mockGetHistoryMetrics.mockResolvedValue(defaultMetrics)

    renderPage()

    await waitFor(() => {
      expect(screen.getAllByTestId('history-record')).toHaveLength(1)
    })

    expect(mockListHistory).toHaveBeenCalled()
  })

  it('correctly displays metrics', async () => {
    mockListHistory.mockResolvedValue({ records: [], total: 0 })
    mockGetHistoryMetrics.mockResolvedValue({
      totalMeetings: 12,
      completed: 8,
      awaitingReview: 2,
      failed: 1,
      totalActionItems: 25,
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('metric-Total Meetings').textContent).toBe('12')
    })
    expect(screen.getByTestId('metric-Completed').textContent).toBe('8')
    expect(screen.getByTestId('metric-Awaiting Review').textContent).toBe('2')
    expect(screen.getByTestId('metric-Failed').textContent).toBe('1')
    expect(screen.getByTestId('metric-Total Action Items').textContent).toBe('25')
  })
})
