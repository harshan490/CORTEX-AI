'use client'

import { motion } from 'framer-motion'
import {
  Video,
  GitBranch,
  CheckCircle2,
  Calendar,
  Mail,
  Bell,
  Activity,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'

type TimelineEventType =
  | 'meeting_started'
  | 'decision_detected'
  | 'task_created'
  | 'calendar_updated'
  | 'email_sent'
  | 'reminder_set'
  | 'task_completed'

interface TimelineEvent {
  id: string
  type: TimelineEventType
  title: string
  description: string
  timestamp: string | Date
  actor?: string
}

const eventConfig: Record<TimelineEventType, { icon: LucideIcon; label: string; color: string; bg: string; border: string }> = {
  meeting_started: {
    icon: Video,
    label: 'Meeting',
    color: 'text-purple-400',
    bg: 'bg-purple-500/20',
    border: 'border-purple-500/30',
  },
  decision_detected: {
    icon: GitBranch,
    label: 'Decision',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500/30',
  },
  task_created: {
    icon: CheckCircle2,
    label: 'Task Created',
    color: 'text-blue-400',
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/30',
  },
  calendar_updated: {
    icon: Calendar,
    label: 'Calendar',
    color: 'text-amber-400',
    bg: 'bg-amber-500/20',
    border: 'border-amber-500/30',
  },
  email_sent: {
    icon: Mail,
    label: 'Email Sent',
    color: 'text-pink-400',
    bg: 'bg-pink-500/20',
    border: 'border-pink-500/30',
  },
  reminder_set: {
    icon: Bell,
    label: 'Reminder',
    color: 'text-orange-400',
    bg: 'bg-orange-500/20',
    border: 'border-orange-500/30',
  },
  task_completed: {
    icon: Activity,
    label: 'Task Completed',
    color: 'text-teal-400',
    bg: 'bg-teal-500/20',
    border: 'border-teal-500/30',
  },
}

const mockEvents: TimelineEvent[] = [
  { id: 'tl-001', type: 'meeting_started', title: 'Q4 Product Strategy Review', description: 'Meeting started with 4 participants', timestamp: '2026-07-24T14:00:00Z', actor: 'Alice Chen' },
  { id: 'tl-002', type: 'decision_detected', title: 'AI Analytics Module Approved', description: 'Decision to launch AI Analytics in October', timestamp: '2026-07-24T14:45:00Z', actor: 'Alice Chen' },
  { id: 'tl-003', type: 'task_created', title: 'Draft AI Analytics Spec', description: 'Task assigned to Alice, due Aug 1', timestamp: '2026-07-24T14:50:00Z', actor: 'Supervisor Agent' },
  { id: 'tl-004', type: 'task_created', title: 'Enterprise SSO Vendor Evaluation', description: 'Task assigned to Bob, due Aug 5', timestamp: '2026-07-24T14:52:00Z', actor: 'Supervisor Agent' },
  { id: 'tl-005', type: 'calendar_updated', title: 'Sprint Planning Added', description: 'Sprint planning meeting scheduled for Week 30', timestamp: '2026-07-24T15:00:00Z', actor: 'Scheduler Agent' },
  { id: 'tl-006', type: 'reminder_set', title: 'Deadline Reminder: AI Analytics Spec', description: 'Reminder set for 1 day before deadline', timestamp: '2026-07-24T15:05:00Z', actor: 'Reminder Agent' },
  { id: 'tl-007', type: 'email_sent', title: 'Meeting Summary Sent', description: 'AI-generated summary distributed to all participants', timestamp: '2026-07-24T15:30:00Z', actor: 'Summarizer Agent' },
  { id: 'tl-008', type: 'task_completed', title: 'Component Library Audit', description: 'Frank completed the UI component audit', timestamp: '2026-07-25T10:15:00Z', actor: 'Frank Johnson' },
  { id: 'tl-009', type: 'decision_detected', title: 'Postpone Mobile SDK', description: 'Decision to push mobile SDK to Q1 2027', timestamp: '2026-07-24T15:10:00Z', actor: 'Alice Chen' },
  { id: 'tl-010', type: 'meeting_started', title: 'Sprint Planning - Week 30', description: 'Sprint planning meeting in progress', timestamp: '2026-07-25T09:00:00Z', actor: 'Alice Chen' },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4 } },
}

function SkeletonRow() {
  return (
    <div className="flex gap-4 pb-8 last:pb-0 animate-pulse">
      <div className="flex flex-col items-center">
        <div className="h-10 w-10 rounded-full bg-white/5" />
        <div className="flex-1 w-px bg-white/5 mt-2" />
      </div>
      <div className="flex-1 pt-2 space-y-2">
        <div className="h-4 w-48 rounded bg-white/5" />
        <div className="h-3 w-64 rounded bg-white/5" />
        <div className="h-3 w-24 rounded bg-white/5" />
      </div>
    </div>
  )
}

interface AiTimelineProps {
  events?: TimelineEvent[]
  loading?: boolean
  maxItems?: number
  className?: string
  showSkeleton?: boolean
}

export function AiTimeline({
  events = mockEvents,
  loading = false,
  maxItems = 10,
  className,
  showSkeleton = true,
}: AiTimelineProps) {
  const displayEvents = events.slice(0, maxItems)

  if (loading && showSkeleton) {
    return (
      <div className={cn('space-y-0', className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn('space-y-0', className)}
    >
      {displayEvents.map((event, i) => {
        const config = eventConfig[event.type]
        const Icon = config.icon
        const isLast = i === displayEvents.length - 1

        return (
          <motion.div
            key={event.id}
            variants={itemVariants}
            className="relative flex gap-4 pb-8 last:pb-0 group"
          >
            {!isLast && (
              <div className="absolute left-[19px] top-10 bottom-0 w-px bg-gradient-to-b from-white/10 to-transparent" />
            )}
            {!isLast && (
              <div className="absolute left-[19px] top-10 bottom-0 w-px bg-gradient-to-b from-purple-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            )}
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300',
                config.bg,
                config.border,
                'group-hover:shadow-[0_0_12px_rgba(124,58,237,0.3)] group-hover:scale-110'
              )}
            >
              <Icon className={cn('h-4 w-4', config.color)} />
            </div>
            <div className="flex-1 min-w-0 pt-1.5">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-white group-hover:text-purple-300 transition-colors">
                  {event.title}
                </p>
                <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', config.bg, config.color)}>
                  {config.label}
                </span>
              </div>
              <p className="text-xs text-white/50 mt-0.5">{event.description}</p>
              <div className="flex items-center gap-3 mt-1">
                {event.actor && (
                  <span className="text-[10px] text-white/30 flex items-center gap-1">
                    <span className="h-1 w-1 rounded-full bg-white/20" />
                    {event.actor}
                  </span>
                )}
                <span className="text-[10px] text-white/20">
                  {formatRelativeTime(event.timestamp)}
                </span>
              </div>
            </div>
          </motion.div>
        )
      })}
    </motion.div>
  )
}

export type { TimelineEvent, TimelineEventType }
