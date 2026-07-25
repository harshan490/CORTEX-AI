'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  RefreshCw,
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Workflow,
} from 'lucide-react'
import { api, isDemoMode } from '@/lib/api'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { MetricCard } from '@/components/shared/metric-card'
import { PageEmptyState } from '@/components/shared/page-empty-state'
import { PageErrorState } from '@/components/shared/page-error-state'
import { WorkflowFilters } from '@/components/workflows/workflow-filters'
import { WorkflowCard } from '@/components/workflows/workflow-card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { WorkflowStatus } from '@/types/workflows'

function formatAvgTime(ms: number): string {
  if (ms === 0) return '—'
  if (ms < 60000) return `${(ms / 1000).toFixed(0)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { transition: { staggerChildren: 0.05 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

export default function WorkflowsPage() {
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | 'all'>('all')

  const {
    data: workflows,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['workflows', statusFilter],
    queryFn: () => api.listWorkflows(statusFilter),
  })

  const {
    data: metrics,
    isLoading: metricsLoading,
  } = useQuery({
    queryKey: ['workflow-metrics'],
    queryFn: () => api.getWorkflowMetrics(),
  })

  return (
    <DashboardLayout title="Workflows">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Workflow Pipeline</h2>
            <p className="text-white/50 mt-1 text-sm">
              Track meeting processing workflows through the 15-stage agent pipeline.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isDemoMode && (
              <Badge variant="warning" size="sm">Demo Mode</Badge>
            )}
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
            label="Active"
            value={metricsLoading ? '—' : (metrics?.active ?? 0)}
            icon={<Activity className="h-5 w-5" />}
            variant="info"
          />
          <MetricCard
            label="Awaiting Approval"
            value={metricsLoading ? '—' : (metrics?.awaitingApproval ?? 0)}
            icon={<Clock className="h-5 w-5" />}
            variant="warning"
          />
          <MetricCard
            label="Completed"
            value={metricsLoading ? '—' : (metrics?.completed ?? 0)}
            icon={<CheckCircle2 className="h-5 w-5" />}
            variant="success"
          />
          <MetricCard
            label="Failed"
            value={metricsLoading ? '—' : (metrics?.failed ?? 0)}
            icon={<XCircle className="h-5 w-5" />}
            variant="danger"
          />
          <MetricCard
            label="Avg Processing"
            value={metricsLoading ? '—' : formatAvgTime(metrics?.avgProcessingTimeMs ?? 0)}
            icon={<AlertTriangle className="h-5 w-5" />}
          />
        </motion.div>

        {/* Filters */}
        <motion.div variants={itemVariants}>
          <WorkflowFilters selected={statusFilter} onChange={setStatusFilter} />
        </motion.div>

        {/* Content */}
        <motion.div variants={itemVariants}>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <PageErrorState error={error as Error} onRetry={() => refetch()} />
          ) : !workflows || workflows.length === 0 ? (
            <PageEmptyState
              icon={<Workflow className="h-8 w-8" />}
              title="No Workflows"
              description="No workflows match the current filter. Process a meeting to create a workflow."
              actionLabel="Process a Meeting"
              actionHref="/meetings/new"
            />
          ) : (
            <div className="space-y-3">
              {workflows.map((workflow) => (
                <WorkflowCard key={workflow.id} workflow={workflow} />
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </DashboardLayout>
  )
}
