'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  Calendar,
  Users,
  GitBranch,
  ListChecks,
  AlertTriangle,
  ExternalLink,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react'
import { cn, formatDate, formatRelativeTime } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { HistoryRecord } from '@/types/workflows'

const statusConfig: Record<string, { variant: 'default' | 'success' | 'warning' | 'danger' | 'info'; label: string }> = {
  approved: { variant: 'success', label: 'Approved' },
  completed: { variant: 'success', label: 'Completed' },
  awaiting_review: { variant: 'warning', label: 'Awaiting Review' },
  processing: { variant: 'info', label: 'Processing' },
  rejected: { variant: 'danger', label: 'Rejected' },
  failed: { variant: 'danger', label: 'Failed' },
}

function ApprovalIcon({ outcome }: { outcome?: 'approved' | 'rejected' | 'pending' }) {
  if (outcome === 'approved') return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
  if (outcome === 'rejected') return <XCircle className="h-3.5 w-3.5 text-red-400" />
  if (outcome === 'pending') return <Clock className="h-3.5 w-3.5 text-amber-400" />
  return null
}

interface HistoryRecordCardProps {
  record: HistoryRecord
  view: 'timeline' | 'table'
}

export function HistoryRecordCard({ record, view }: HistoryRecordCardProps) {
  const [expanded, setExpanded] = useState(false)
  const router = useRouter()

  const config = statusConfig[record.status] ?? { variant: 'default' as const, label: record.status }

  if (view === 'table') {
    return (
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded-lg"
        aria-expanded={expanded}
      >
        <div className={cn(
          'rounded-xl border border-white/5 bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.04]',
          expanded && 'border-purple-500/20'
        )}>
          {/* Table row */}
          <div className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-12 sm:col-span-4 min-w-0">
              <p className="text-sm font-medium text-white truncate">{record.title}</p>
              <p className="text-[10px] text-white/30 mt-0.5">{formatDate(record.date, 'MMM d, yyyy · h:mm a')}</p>
            </div>
            <div className="col-span-3 sm:col-span-2">
              <Badge variant={config.variant} size="sm">{config.label}</Badge>
            </div>
            <div className="col-span-3 sm:col-span-2 text-[10px] text-white/40 flex items-center gap-3">
              <span className="flex items-center gap-1"><Users className="h-3 w-3" />{record.participantCount}</span>
              <span className="flex items-center gap-1"><GitBranch className="h-3 w-3" />{record.decisionCount}</span>
              <span className="flex items-center gap-1"><ListChecks className="h-3 w-3" />{record.actionItemCount}</span>
            </div>
            <div className="col-span-3 sm:col-span-2 flex items-center gap-2 text-[10px] text-white/30">
              <ApprovalIcon outcome={record.approvalOutcome} />
              {record.processingConfidence !== undefined && (
                <span>{Math.round(record.processingConfidence * 100)}%</span>
              )}
              {record.riskCount > 0 && (
                <span className="flex items-center gap-0.5 text-amber-400">
                  <AlertTriangle className="h-3 w-3" />{record.riskCount}
                </span>
              )}
            </div>
            <div className="col-span-3 sm:col-span-2 flex justify-end">
              <ChevronDown className={cn('h-4 w-4 text-white/20 transition-transform', expanded && 'rotate-180')} />
            </div>
          </div>

          {/* Expandable detail */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <ExpandedDetail record={record} router={router} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </button>
    )
  }

  // Timeline view
  return (
    <div className="relative flex gap-4 group">
      {/* Timeline dot */}
      <div className="flex flex-col items-center shrink-0">
        <div className={cn(
          'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all',
          record.status === 'approved' || record.status === 'completed'
            ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-400'
            : record.status === 'awaiting_review'
              ? 'border-amber-500/30 bg-amber-500/20 text-amber-400'
              : record.status === 'failed' || record.status === 'rejected'
                ? 'border-red-500/30 bg-red-500/20 text-red-400'
                : 'border-blue-500/30 bg-blue-500/20 text-blue-400'
        )}>
          <Calendar className="h-4 w-4" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-6">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded-lg"
          aria-expanded={expanded}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors">
              {record.title}
            </p>
            <Badge variant={config.variant} size="sm">{config.label}</Badge>
            <ApprovalIcon outcome={record.approvalOutcome} />
          </div>
          <div className="flex items-center gap-4 mt-1.5 text-[10px] text-white/30 flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />{formatDate(record.date, 'MMM d, yyyy · h:mm a')}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />{record.participantCount} participants
            </span>
            <span className="flex items-center gap-1">
              <GitBranch className="h-3 w-3" />{record.decisionCount} decisions
            </span>
            <span className="flex items-center gap-1">
              <ListChecks className="h-3 w-3" />{record.actionItemCount} actions
            </span>
            {record.riskCount > 0 && (
              <span className="flex items-center gap-1 text-amber-400">
                <AlertTriangle className="h-3 w-3" />{record.riskCount} risks
              </span>
            )}
          </div>
          {record.executiveSummary && (
            <p className="text-xs text-white/25 mt-1.5 line-clamp-2">{record.executiveSummary}</p>
          )}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <ExpandedDetail record={record} router={router} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function ExpandedDetail({ record, router }: { record: HistoryRecord; router: ReturnType<typeof useRouter> }) {
  return (
    <div className="mt-3 pt-3 border-t border-white/5 space-y-3">
      {record.executiveSummary && (
        <div>
          <h4 className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1">Summary</h4>
          <p className="text-xs text-white/50">{record.executiveSummary}</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatItem label="Decisions" value={record.decisionCount} />
        <StatItem label="Action Items" value={record.actionItemCount} />
        <StatItem label="Risks" value={record.riskCount} />
        <StatItem label="Confidence" value={record.processingConfidence ? `${Math.round(record.processingConfidence * 100)}%` : '—'} />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
          onClick={(e) => {
            e.stopPropagation()
            router.push(`/meetings/${record.id}`)
          }}
        >
          View Meeting
        </Button>
        {record.hasReport && (
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<FileText className="h-3.5 w-3.5" />}
            onClick={(e) => {
              e.stopPropagation()
              router.push(`/meetings/${record.id}`)
            }}
          >
            View Report
          </Button>
        )}
        <span className="text-[10px] text-white/20 ml-auto">
          Created {formatRelativeTime(record.createdAt)}
        </span>
      </div>
    </div>
  )
}

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-white/[0.03] p-2">
      <p className="text-[10px] text-white/30">{label}</p>
      <p className="text-sm font-semibold text-white">{value}</p>
    </div>
  )
}
