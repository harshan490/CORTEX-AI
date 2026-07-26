import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AnalyticsPage from '@/app/analytics/page'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/analytics',
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
  useStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      toggleSidebar: vi.fn(),
      sidebarOpen: true,
      user: { name: 'Alice Johnson', email: 'alice@cortex.ai' },
      logout: vi.fn(),
    }),
  getStoredToken: () => 'test-token',
}))

vi.mock('@/components/layout/dashboard-layout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}))

// Mock recharts to avoid SVG rendering issues in jsdom
vi.mock('recharts', () => {
  const React = require('react')
  return {
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    AreaChart: ({ children }: { children: React.ReactNode }) => <div data-testid="area-chart">{children}</div>,
    Area: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
  }
})

const mockOverviewData = (period: string) => ({
  period,
  totalMeetings: period === 'week' ? 3 : period === 'month' ? 12 : 45,
  totalTasks: period === 'week' ? 5 : period === 'month' ? 20 : 60,
  completedTasks: period === 'week' ? 2 : period === 'month' ? 10 : 35,
  completionRate: period === 'week' ? 40 : period === 'month' ? 50 : 58.33,
  totalActionItems: 10,
  completedActionItems: 4,
  totalDecisions: 3,
  overdueItems: 0,
  criticalRisks: 0,
  averageDurationMinutes: 42,
})

const mockTrendsData = (period: string) =>
  period === 'week'
    ? [{ date: '2026-07-20', count: 2, totalDurationSeconds: 3600 }]
    : period === 'month'
    ? [
        { date: '2026-07-01', count: 3, totalDurationSeconds: 5400 },
        { date: '2026-07-10', count: 4, totalDurationSeconds: 7200 },
      ]
    : [
        { date: '2026-05-15', count: 5, totalDurationSeconds: 9000 },
        { date: '2026-06-20', count: 8, totalDurationSeconds: 14400 },
        { date: '2026-07-10', count: 4, totalDurationSeconds: 7200 },
      ]

const getAnalyticsOverviewMock = vi.fn()
const getMeetingTrendsMock = vi.fn()

vi.mock('@/lib/api', () => ({
  api: {
    getAnalyticsOverview: (...args: unknown[]) => getAnalyticsOverviewMock(...args),
    getMeetingTrends: (...args: unknown[]) => getMeetingTrendsMock(...args),
  },
  isDemoMode: false,
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AnalyticsPage />
    </QueryClientProvider>
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Analytics Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAnalyticsOverviewMock.mockImplementation((period: string) =>
      Promise.resolve(mockOverviewData(period))
    )
    getMeetingTrendsMock.mockImplementation((period: string) =>
      Promise.resolve(mockTrendsData(period))
    )
  })

  // 1. Quarter is selected initially (default)
  it('selects quarter by default', () => {
    renderPage()
    const quarterBtn = screen.getByTestId('period-quarter')
    expect(quarterBtn).toHaveAttribute('aria-pressed', 'true')
  })

  // 2. Clicking Week changes the selected state
  it('clicking Week changes the selected state', async () => {
    renderPage()
    fireEvent.click(screen.getByTestId('period-week'))
    expect(screen.getByTestId('period-week')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('period-quarter')).toHaveAttribute('aria-pressed', 'false')
  })

  // 3. Clicking Month changes the selected state
  it('clicking Month changes the selected state', async () => {
    renderPage()
    fireEvent.click(screen.getByTestId('period-month'))
    expect(screen.getByTestId('period-month')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('period-quarter')).toHaveAttribute('aria-pressed', 'false')
  })

  // 4. Clicking Quarter changes the selected state
  it('clicking Quarter keeps it selected', async () => {
    renderPage()
    // Change to week first
    fireEvent.click(screen.getByTestId('period-week'))
    expect(screen.getByTestId('period-week')).toHaveAttribute('aria-pressed', 'true')
    // Back to quarter
    fireEvent.click(screen.getByTestId('period-quarter'))
    expect(screen.getByTestId('period-quarter')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('period-week')).toHaveAttribute('aria-pressed', 'false')
  })

  // 5. Each period produces a different query key/request parameter
  it('calls API with the correct period parameter', async () => {
    renderPage()
    // Default: quarter
    await waitFor(() => {
      expect(getAnalyticsOverviewMock).toHaveBeenCalledWith('quarter')
      expect(getMeetingTrendsMock).toHaveBeenCalledWith('quarter')
    })

    fireEvent.click(screen.getByTestId('period-week'))
    await waitFor(() => {
      expect(getAnalyticsOverviewMock).toHaveBeenCalledWith('week')
      expect(getMeetingTrendsMock).toHaveBeenCalledWith('week')
    })

    fireEvent.click(screen.getByTestId('period-month'))
    await waitFor(() => {
      expect(getAnalyticsOverviewMock).toHaveBeenCalledWith('month')
      expect(getMeetingTrendsMock).toHaveBeenCalledWith('month')
    })
  })

  // 6. Analytics refetches when the period changes
  it('refetches data when the period changes', async () => {
    renderPage()
    await waitFor(() => expect(getAnalyticsOverviewMock).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByTestId('period-week'))
    await waitFor(() => expect(getAnalyticsOverviewMock).toHaveBeenCalledTimes(2))

    fireEvent.click(screen.getByTestId('period-month'))
    await waitFor(() => expect(getAnalyticsOverviewMock).toHaveBeenCalledTimes(3))
  })

  // 7. Empty-period response renders safely
  it('shows empty chart state when no trends data', async () => {
    getMeetingTrendsMock.mockResolvedValue([])
    renderPage()
    await waitFor(() => {
      expect(screen.getByTestId('empty-chart')).toBeInTheDocument()
    })
    expect(screen.getByText('No meeting data for this period')).toBeInTheDocument()
  })

  // 8. Data renders after loading
  it('renders metric cards from API data', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Total Meetings')).toBeInTheDocument()
    })
    expect(screen.getByText('Avg Duration')).toBeInTheDocument()
    expect(screen.getByText('Action Items Completed')).toBeInTheDocument()
    expect(screen.getAllByText('Completion Rate').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Past 90 Days').length).toBeGreaterThanOrEqual(1)
  })

  // 9. Error state renders
  it('shows error state on API failure', async () => {
    getAnalyticsOverviewMock.mockRejectedValue(new Error('Network error'))
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Failed to load analytics')).toBeInTheDocument()
    })
    expect(screen.getByText('Network error')).toBeInTheDocument()
  })
})
