'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  ExternalLink,
  RotateCcw,
  XCircle,
  CheckCircle2,
  ScrollText,
  Clock,
} from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { ProgressBar } from '@/components/ui/progress-bar'
import { Tooltip } from '@/components/ui/tooltip'
import { WorkflowStatusBadge } from './workflow-status-badge'
import { WorkflowStageTimeline } from './workflow-stage-timeline'
import type { Workflow } from '@/types/workflows'

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const mins = Math.floor(ms / 60000)
  const secs = Math.round((ms % 60000) / 1000)
  return `${mins}m ${secs}s`
}

interface WorkflowCardProps {
  workflow: Workflow
}

export function WorkflowCard({ workflow }: WorkflowCardProps) {
  const [expanded, setExpanded] = useState(false)
  const router = useRouter()

  const progressVariant =
    workflow.status === 'failed' ? 'danger' :
    workflow.status === 'completed' || workflow.status === 'approved' ? 'success' :
    workflow.status === 'processing' ? 'default' :
    'warning'

  return (
    <GlassCard className="overflow-hidden">
      {/* Header — clickable expand */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-xl"
        aria-expanded={expanded}
        aria-controls={`workflow-detail-${workflow.id}`}
      >
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-white/30 font-mono">{workflow.id.slice(0, 8)}</span>
              <WorkflowStatusBadge status={workflow.status} />
              {workflow.approvalStatus === 'pending' && workflow.status === 'awaiting_review' && (
                <span className="text-[10px] text-amber-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Needs Review
                </span>
              )}
            </div>
            <h3 className="text-sm font-semibold text-white mt-1 truncate">
              {workflow.meetingTitle}
            </h3>
            <div className="flex items-center gap-4 mt-1.5 text-[10px] text-white/30 flex-wrap">
              <span>Started {formatRelativeTime(workflow.startedAt)}</span>
              <span>Updated {formatRelativeTime(workflow.updatedAt)}</span>
              {workflow.durationMs !== undefined && (
                <span>Duration: {formatDuration(workflow.durationMs)}</span>
              )}
              {workflow.retryCount > 0 && (
                <span className="text-amber-400">{workflow.retryCount} retries</span>
              )}
              <span>{workflow.completedStages}/{workflow.totalStages} stages</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 pt-1">
            <div className="w-20 hidden sm:block">
              <ProgressBar value={workflow.progress} size="sm" variant={progressVariant} />
              <span className="text-[10px] text-white/30 mt-0.5 block text-right">{workflow.progress}%</span>
            </div>
            <ChevronDown className={cn(
              'h-4 w-4 text-white/30 transition-transform duration-200',
              expanded && 'rotate-180'
            )} />
          </div>
        </div>
      </button>

      {/* Mobile progress bar */}
      <div className="sm:hidden mt-2">
        <ProgressBar value={workflow.progress} size="sm" variant={progressVariant} showPercentage />
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            id={`workflow-detail-${workflow.id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-white/5">
              {/* Stage Timeline */}
              <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
                Processing Stages
              </h4>
              <WorkflowStageTimeline stages={workflow.stages} />

              {/* Controls */}
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2 flex-wrap">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/meetings/${workflow.meetingId}`)
                  }}
                >
                  View Meeting
                </Button>

                {workflow.status === 'failed' ? (
                  <Tooltip content="Retry is not available — no retry endpoint in current API">
                    <Button variant="outline" size="sm" disabled leftIcon={<RotateCcw className="h-3.5 w-3.5" />}>
                      Retry
                    </Button>
                  </Tooltip>
                ) : null}

                {workflow.status === 'processing' ? (
                  <Tooltip content="Cancel is not available — no cancel endpoint in current API">
                    <Button variant="outline" size="sm" disabled leftIcon={<XCircle className="h-3.5 w-3.5" />}>
                      Cancel
                    </Button>
                  </Tooltip>
                ) : null}

                {workflow.status === 'awaiting_review' ? (
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/meetings/${workflow.meetingId}`)
                    }}
                  >
                    Open Review
                  </Button>
                ) : null}

                <Tooltip content="Activity logs are visible in the stage timeline above">
                  <Button variant="ghost" size="sm" disabled leftIcon={<ScrollText className="h-3.5 w-3.5" />}>
                    Activity Log
                  </Button>
                </Tooltip>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  )
}
