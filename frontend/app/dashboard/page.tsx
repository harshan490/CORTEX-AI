'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Video,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Brain,
  Zap,
  Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { GlassCard } from '@/components/ui/glass-card'
import { Badge } from '@/components/ui/badge'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { useStore as useAppStore } from '@/lib/store'
import { api, isDemoMode } from '@/lib/api'
import type { AgentActivity } from '@/types'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

const activityColors: Record<string, string> = {
  success: 'bg-emerald-500/20 text-emerald-400',
  partial: 'bg-amber-500/20 text-amber-400',
  failed: 'bg-red-500/20 text-red-400',
  pending: 'bg-blue-500/20 text-blue-400',
}

export default function DashboardPage() {
  const router = useRouter()
  const isAuthenticated = useAppStore((s) => s.isAuthenticated)

  useEffect(() => {
    if (!isAuthenticated) router.push('/auth')
  }, [isAuthenticated, router])

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: () => api.getDashboardMetrics(),
    staleTime: 60_000,
  })

  const { data: meetingsResult } = useQuery({
    queryKey: ['meetings', { page: 1, pageSize: 5 }],
    queryFn: () => api.listMeetings({ page: 1, pageSize: 5 }),
    staleTime: 30_000,
  })

  const { data: activity } = useQuery({
    queryKey: ['activity', 10],
    queryFn: () => api.listActivity(10),
    staleTime: 30_000,
  })

  const statCards = [
    {
      label: 'Total Meetings',
      value: metrics?.totalMeetings ?? 0,
      icon: Video,
      color: 'from-purple-500 to-blue-500',
      sub: `${metrics?.meetingsThisWeek ?? 0} this week`,
      trending: true,
    },
    {
      label: 'Active Tasks',
      value: metrics?.activeTasks ?? 0,
      icon: CheckCircle2,
      color: 'from-emerald-500 to-teal-500',
      sub: `${metrics?.overdueTasks ?? 0} overdue`,
      trending: (metrics?.overdueTasks ?? 0) === 0,
    },
    {
      label: 'Completed This Week',
      value: metrics?.completedTasksThisWeek ?? 0,
      icon: BarChart3,
      color: 'from-amber-500 to-orange-500',
      sub: 'tasks done',
      trending: true,
    },
    {
      label: 'Pending Clarifications',
      value: metrics?.pendingClarifications ?? 0,
      icon: AlertCircle,
      color: 'from-pink-500 to-rose-500',
      sub: 'need review',
      trending: (metrics?.pendingClarifications ?? 0) === 0,
    },
  ]

  return (
    <DashboardLayout title="Dashboard">
      {isDemoMode && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-purple-500/20 bg-purple-500/10 px-4 py-2.5 text-sm text-purple-300">
          <Zap className="h-4 w-4 shrink-0" />
          Demo Provider Active — using in-memory fixture data
        </div>
      )}

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => {
            const Icon = stat.icon
            return (
              <motion.div key={stat.label} variants={itemVariants}>
                <GlassCard hover glow>
                  {metricsLoading ? (
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 w-24 rounded bg-white/10" />
                      <div className="h-8 w-16 rounded bg-white/10" />
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <p className="text-sm text-white/50">{stat.label}</p>
                        <p className="text-3xl font-bold text-white">{stat.value.toLocaleString()}</p>
                        <div className="flex items-center gap-1">
                          {stat.trending ? (
                            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                          )}
                          <span className={cn('text-xs font-medium', stat.trending ? 'text-emerald-400' : 'text-red-400')}>
                            {stat.sub}
                          </span>
                        </div>
                      </div>
                      <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg shrink-0', stat.color)}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <GlassCard>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Recent Meetings</h3>
                <Badge variant="info" size="sm">Latest 5</Badge>
              </div>
              <div className="space-y-2">
                {meetingsResult?.meetings.length === 0 && (
                  <p className="text-sm text-white/40 py-8 text-center">No meetings yet.</p>
                )}
                {meetingsResult?.meetings.map((meeting) => (
                  <motion.div
                    key={meeting.id}
                    whileHover={{ x: 4 }}
                    onClick={() => router.push(`/meetings/${meeting.id}`)}
                    className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 cursor-pointer hover:bg-white/[0.05] hover:border-purple-500/20 transition-all"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                      <Video className="h-4 w-4 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{meeting.title}</p>
                      <p className="text-xs text-white/40 mt-0.5">
                        {new Date(meeting.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {' · '}
                        {meeting.participants.length} participants
                      </p>
                    </div>
                    <Badge
                      variant={
                        meeting.status === 'approved' ? 'success' :
                        meeting.status === 'awaiting_review' ? 'warning' :
                        meeting.status === 'rejected' ? 'danger' : 'default'
                      }
                      size="sm"
                    >
                      {meeting.status.replace('_', ' ')}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          <motion.div variants={itemVariants}>
            <GlassCard>
              <div className="flex items-center gap-2 mb-6">
                <Activity className="h-5 w-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">Agent Activity</h3>
              </div>
              <div className="space-y-3">
                {!activity && (
                  <div className="animate-pulse space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex gap-3">
                        <div className="h-8 w-8 rounded-full bg-white/10 shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 w-3/4 rounded bg-white/10" />
                          <div className="h-2 w-1/2 rounded bg-white/10" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {activity?.slice(0, 6).map((act: AgentActivity) => (
                  <div key={act.id} className="flex items-start gap-3">
                    <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', activityColors[act.outcome] ?? activityColors.pending)}>
                      <Brain className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{act.action}</p>
                      <p className="text-xs text-white/40 mt-0.5">
                        {act.agent} · {new Date(act.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                {activity?.length === 0 && (
                  <p className="text-sm text-white/40 py-4 text-center">No agent activity yet.</p>
                )}
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {metrics && (
          <motion.div variants={itemVariants}>
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Processing Overview</h3>
                <Badge variant="default" size="sm">
                  {metrics.processingQueueSize} in queue
                </Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
                  <p className="text-2xl font-bold text-purple-400">{metrics.totalMeetings}</p>
                  <p className="text-xs text-white/50 mt-1">Total Meetings</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-400">{metrics.activeTasks}</p>
                  <p className="text-xs text-white/50 mt-1">Active Tasks</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
                  <p className="text-2xl font-bold text-amber-400">{metrics.overdueTasks}</p>
                  <p className="text-xs text-white/50 mt-1">Overdue</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
                  <p className="text-2xl font-bold text-blue-400">
                    {metrics.averageConfidence > 0 ? `${Math.round(metrics.averageConfidence * 100)}%` : '—'}
                  </p>
                  <p className="text-xs text-white/50 mt-1">Avg Confidence</p>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </motion.div>
    </DashboardLayout>
  )
}
