'use client'

import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  RefreshCw,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  ListChecks,
  LayoutList,
  LayoutGrid,
} from 'lucide-react'
import { api, isDemoMode } from '@/lib/api'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { MetricCard } from '@/components/shared/metric-card'
import { PageEmptyState } from '@/components/shared/page-empty-state'
import { PageErrorState } from '@/components/shared/page-error-state'
import { HistoryFiltersBar } from '@/components/history/history-filters'
import { HistoryRecordCard } from '@/components/history/history-record-card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { HistoryFilters, HistoryViewMode, HistorySortOrder } from '@/types/workflows'

function getInitialViewMode(): HistoryViewMode {
  if (typeof window === 'undefined') return 'timeline'
  try {
    return (localStorage.getItem('cortex-history-view') as HistoryViewMode) ?? 'timeline'
  } catch {
    return 'timeline'
  }
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

export default function HistoryPage() {
  const [viewMode, setViewMode] = useState<HistoryViewMode>(getInitialViewMode)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<HistoryFilters>({
    sortOrder: 'desc',
  })

  const handleViewChange = useCallback((mode: HistoryViewMode) => {
    setViewMode(mode)
    if (typeof window !== 'undefined') {
      localStorage.setItem('cortex-history-view', mode)
    }
  }, [])

  const {
    data: historyData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['history', filters],
    queryFn: () => api.listHistory(filters),
  })

  const {
    data: metrics,
    isLoading: metricsLoading,
  } = useQuery({
    queryKey: ['history-metrics'],
    queryFn: () => api.getHistoryMetrics(),
  })

  const records = historyData?.records ?? []

  return (
    <DashboardLayout title="History">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Meeting History</h2>
            <p className="text-white/50 mt-1 text-sm">
              {historyData ? `${historyData.total} meetings processed` : 'Loading...'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isDemoMode && (
              <Badge variant="warning" size="sm">Demo Mode</Badge>
            )}
            <div className="flex items-center rounded-lg border border-white/10 overflow-hidden">
              <button
                onClick={() => handleViewChange('timeline')}
                className={`p-2 transition-colors ${viewMode === 'timeline' ? 'bg-purple-500/20 text-purple-300' : 'text-white/40 hover:text-white/70'}`}
                aria-label="Timeline view"
                aria-pressed={viewMode === 'timeline'}
              >
                <LayoutList className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleViewChange('table')}
                className={`p-2 transition-colors ${viewMode === 'table' ? 'bg-purple-500/20 text-purple-300' : 'text-white/40 hover:text-white/70'}`}
                aria-label="Table view"
                aria-pressed={viewMode === 'table'}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCw className="h-4 w-4" />}
              onClick={() => refetch()}
              loading={isLoading}
            >
              Refresh
            </Button>
          </div>
        </motion.div>

        {/* Metrics */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <MetricCard
            label="Total Meetings"
            value={metricsLoading ? '—' : (metrics?.totalMeetings ?? 0)}
            icon={<Calendar className="h-5 w-5" />}
          />
          <MetricCard
            label="Completed"
            value={metricsLoading ? '—' : (metrics?.completed ?? 0)}
            icon={<CheckCircle2 className="h-5 w-5" />}
            variant="success"
          />
          <MetricCard
            label="Awaiting Review"
            value={metricsLoading ? '—' : (metrics?.awaitingReview ?? 0)}
            icon={<Clock className="h-5 w-5" />}
            variant="warning"
          />
          <MetricCard
            label="Failed"
            value={metricsLoading ? '—' : (metrics?.failed ?? 0)}
            icon={<XCircle className="h-5 w-5" />}
            variant="danger"
          />
          <MetricCard
            label="Total Action Items"
            value={metricsLoading ? '—' : (metrics?.totalActionItems ?? 0)}
            icon={<ListChecks className="h-5 w-5" />}
            variant="info"
          />
        </motion.div>

        {/* Filters */}
        <motion.div variants={itemVariants}>
          <HistoryFiltersBar
            filters={filters}
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters(!showFilters)}
            onSearchChange={(search) => setFilters((f) => ({ ...f, search: search || undefined }))}
            onStatusChange={(status) => {
              setFilters((f) => {
                if (status === 'all') return { ...f, status: undefined }
                const current = f.status ?? []
                const isActive = current.includes(status)
                return {
                  ...f,
                  status: isActive
                    ? current.filter((s) => s !== status)
                    : [...current, status],
                }
              })
            }}
            onSortChange={(order: HistorySortOrder) => setFilters((f) => ({ ...f, sortOrder: order }))}
            onHighRiskChange={(highRisk) => setFilters((f) => ({ ...f, highRiskOnly: highRisk }))}
            onDateFromChange={(date) => setFilters((f) => ({ ...f, dateFrom: date || undefined }))}
            onDateToChange={(date) => setFilters((f) => ({ ...f, dateTo: date || undefined }))}
          />
        </motion.div>

        {/* Content */}
        <motion.div variants={itemVariants}>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <PageErrorState error={error as Error} onRetry={() => refetch()} />
          ) : records.length === 0 ? (
            <PageEmptyState
              icon={<Calendar className="h-8 w-8" />}
              title="No History"
              description="No meeting records match the current filters. Process a meeting to get started."
              actionLabel="Process a Meeting"
              actionHref="/meetings/new"
            />
          ) : (
            <div className="space-y-2">
              {records.map((record) => (
                <HistoryRecordCard key={record.id} record={record} view={viewMode} />
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </DashboardLayout>
  )
}
