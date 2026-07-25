'use client'

import type { WorkflowStatus } from '@/types/workflows'
import { Badge } from '@/components/ui/badge'

const statusConfig: Record<WorkflowStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info'; dot?: boolean; pulse?: boolean }> = {
  queued: { label: 'Queued', variant: 'default' },
  processing: { label: 'Processing', variant: 'info', dot: true, pulse: true },
  awaiting_review: { label: 'Awaiting Review', variant: 'warning', dot: true },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
  completed: { label: 'Completed', variant: 'success' },
  failed: { label: 'Failed', variant: 'danger' },
  cancelled: { label: 'Cancelled', variant: 'default' },
}

interface WorkflowStatusBadgeProps {
  status: WorkflowStatus
  size?: 'sm' | 'md'
  className?: string
}

export function WorkflowStatusBadge({ status, size = 'sm', className }: WorkflowStatusBadgeProps) {
  const config = statusConfig[status]
  return (
    <Badge variant={config.variant} size={size} dot={config.dot} pulse={config.pulse} className={className}>
      {config.label}
    </Badge>
  )
}
