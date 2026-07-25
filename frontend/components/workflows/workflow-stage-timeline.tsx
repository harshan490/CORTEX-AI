'use client'

import { motion } from 'framer-motion'
import { CheckCircle2, Clock, XCircle, Loader2, SkipForward, AlertTriangle } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import type { WorkflowStage, WorkflowStageStatus } from '@/types/workflows'

const statusIcons: Record<WorkflowStageStatus, React.ReactNode> = {
  completed: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
  running: <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />,
  failed: <XCircle className="h-4 w-4 text-red-400" />,
  pending: <Clock className="h-4 w-4 text-white/20" />,
  skipped: <SkipForward className="h-4 w-4 text-white/30" />,
}

const statusLineColors: Record<WorkflowStageStatus, string> = {
  completed: 'bg-emerald-500/40',
  running: 'bg-blue-500/40',
  failed: 'bg-red-500/40',
  pending: 'bg-white/10',
  skipped: 'bg-white/10',
}

const statusDotColors: Record<WorkflowStageStatus, string> = {
  completed: 'border-emerald-500/50 bg-emerald-500/20',
  running: 'border-blue-500/50 bg-blue-500/20',
  failed: 'border-red-500/50 bg-red-500/20',
  pending: 'border-white/10 bg-white/5',
  skipped: 'border-white/10 bg-white/5',
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`
}

interface WorkflowStageTimelineProps {
  stages: WorkflowStage[]
}

export function WorkflowStageTimeline({ stages }: WorkflowStageTimelineProps) {
  return (
    <div className="space-y-0" role="list" aria-label="Workflow processing stages">
      {stages.map((stage, i) => {
        const isLast = i === stages.length - 1
        return (
          <motion.div
            key={stage.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className="relative flex gap-3 group"
            role="listitem"
            aria-label={`${stage.name}: ${stage.status}`}
          >
            {/* Vertical connector line */}
            {!isLast && (
              <div
                className={cn(
                  'absolute left-[15px] top-9 bottom-0 w-px',
                  statusLineColors[stage.status]
                )}
              />
            )}

            {/* Status dot */}
            <div className="flex flex-col items-center pt-1 shrink-0">
              <div className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all',
                statusDotColors[stage.status]
              )}>
                {statusIcons[stage.status]}
              </div>
            </div>

            {/* Stage content */}
            <div className="flex-1 min-w-0 pb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn(
                  'text-sm font-medium',
                  stage.status === 'pending' || stage.status === 'skipped' ? 'text-white/40' : 'text-white'
                )}>
                  {stage.name}
                </span>
                {stage.retryCount > 0 && (
                  <span className="flex items-center gap-0.5 text-[10px] text-amber-400">
                    <AlertTriangle className="h-3 w-3" />
                    {stage.retryCount} {stage.retryCount === 1 ? 'retry' : 'retries'}
                  </span>
                )}
                {stage.confidence !== undefined && stage.status === 'completed' && (
                  <span className="text-[10px] text-white/30">
                    {Math.round(stage.confidence * 100)}% confidence
                  </span>
                )}
              </div>
              <p className={cn(
                'text-xs mt-0.5',
                stage.status === 'pending' || stage.status === 'skipped' ? 'text-white/20' : 'text-white/40'
              )}>
                {stage.description}
              </p>
              <div className="flex items-center gap-3 mt-1 text-[10px] text-white/25 flex-wrap">
                {stage.startedAt && (
                  <span>{formatDate(stage.startedAt, 'h:mm:ss a')}</span>
                )}
                {stage.durationMs !== undefined && (
                  <span>{formatDuration(stage.durationMs)}</span>
                )}
              </div>
              {stage.error && (
                <div className="mt-1 rounded-md bg-red-500/10 border border-red-500/20 px-2 py-1">
                  <p className="text-[10px] text-red-300">{stage.error}</p>
                </div>
              )}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
