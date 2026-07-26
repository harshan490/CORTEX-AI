'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Video,
  Clock,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Loader2,
  BarChart3,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { cn } from '@/lib/utils'
import { GlassCard } from '@/components/ui/glass-card'
import { Badge } from '@/components/ui/badge'
import { ProgressBar } from '@/components/ui/progress-bar'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { api } from '@/lib/api'

export type AnalyticsPeriod = 'week' | 'month' | 'quarter'

const PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  week: 'Past 7 Days',
  month: 'Past 30 Days',
  quarter: 'Past 90 Days',
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

interface CounterProps {
  value: number
  suffix?: string
  duration?: number
}

function AnimatedCounter({ value, suffix = '', duration = 1.5 }: CounterProps) {
  const [display, setDisplay] = useState(0)
  const ref = useRef(true)

  useEffect(() => {
    if (!ref.current) return
    ref.current = false
    const start = 0
    const startTime = performance.now()

    function animate(currentTime: number) {
      const elapsed = (currentTime - startTime) / 1000
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.floor(start + (value - start) * eased))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [value, duration])

  return <span>{display.toLocaleString()}{suffix}</span>
}

interface TooltipEntry {
  name: string
  value: number
  color?: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-white/10 bg-cortex-darker px-4 py-3 shadow-2xl">
      <p className="text-xs text-white/50 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-medium" style={{ color: entry.color || '#fff' }}>
          {entry.name}: {entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('quarter')

  const overviewQuery = useQuery({
    queryKey: ['analytics', 'overview', period],
    queryFn: () => api.getAnalyticsOverview(period),
  })

  const trendsQuery = useQuery({
    queryKey: ['analytics', 'trends', period],
    queryFn: () => api.getMeetingTrends(period),
  })

  const overview = overviewQuery.data
  const trends = trendsQuery.data ?? []

  const metricCards = overview
    ? [
        {
          label: 'Total Meetings',
          value: overview.totalMeetings,
          icon: Video,
          color: 'from-purple-500 to-blue-500',
        },
        {
          label: 'Avg Duration',
          value: Math.round(overview.averageDurationMinutes),
          icon: Clock,
          color: 'from-emerald-500 to-teal-500',
          suffix: 'min',
        },
        {
          label: 'Action Items Completed',
          value: overview.completedActionItems,
          icon: CheckCircle2,
          color: 'from-amber-500 to-orange-500',
        },
        {
          label: 'Completion Rate',
          value: Math.round(overview.completionRate),
          icon: TrendingUp,
          color: 'from-pink-500 to-rose-500',
          suffix: '%',
        },
      ]
    : []

  const isLoading = overviewQuery.isLoading || trendsQuery.isLoading
  const error = overviewQuery.error || trendsQuery.error

  return (
    <DashboardLayout title="Analytics">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Analytics Dashboard</h2>
            <p className="text-white/50 mt-1 text-sm">Track your meeting productivity and performance metrics</p>
          </div>
          <div className="flex items-center gap-2" role="group" aria-label="Time period">
            {(['week', 'month', 'quarter'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setPeriod(range)}
                data-testid={`period-${range}`}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                  period === range
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'text-white/40 hover:text-white/70 border border-transparent'
                )}
                aria-pressed={period === range}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Error state */}
        {error && (
          <motion.div variants={itemVariants}>
            <GlassCard className="!border-red-500/20">
              <div className="flex items-center gap-3 text-red-400">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Failed to load analytics</p>
                  <p className="text-xs text-red-400/70 mt-1">
                    {error instanceof Error ? error.message : 'An unexpected error occurred'}
                  </p>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Loading state */}
        {isLoading && (
          <motion.div variants={itemVariants} className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
            <span className="ml-3 text-white/50 text-sm">Loading analytics...</span>
          </motion.div>
        )}

        {/* Metric cards */}
        {!isLoading && !error && overview && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {metricCards.map((stat) => {
                const Icon = stat.icon
                return (
                  <motion.div key={stat.label} variants={itemVariants}>
                    <GlassCard hover glow>
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <p className="text-sm text-white/50">{stat.label}</p>
                          <p className="text-3xl font-bold text-white flex items-baseline gap-1">
                            <AnimatedCounter value={stat.value} />
                            {stat.suffix && <span className="text-lg text-white/40">{stat.suffix}</span>}
                          </p>
                          <span className="text-xs text-white/30">{PERIOD_LABELS[period]}</span>
                        </div>
                        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg shrink-0', stat.color)}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                )
              })}
            </div>

            {/* Meeting Trends chart */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <motion.div variants={itemVariants} className="xl:col-span-2">
                <GlassCard>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-white">Meeting Trends</h3>
                    <Badge variant="info" size="sm">{PERIOD_LABELS[period]}</Badge>
                  </div>
                  <div className="h-72">
                    {trends.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trends} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                          <defs>
                            <linearGradient id="meetingGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.4} />
                              <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} />
                          <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} allowDecimals={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Area type="monotone" dataKey="count" stroke="#7C3AED" strokeWidth={2} fill="url(#meetingGradient)" name="Meetings" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full" data-testid="empty-chart">
                        <BarChart3 className="h-10 w-10 text-white/10 mb-3" />
                        <p className="text-sm text-white/30">No meeting data for this period</p>
                      </div>
                    )}
                  </div>
                </GlassCard>
              </motion.div>

              <motion.div variants={itemVariants}>
                <GlassCard>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-white">Completion Rate</h3>
                    <Badge variant="success" size="sm">{Math.round(overview.completionRate)}%</Badge>
                  </div>
                  <div className="flex flex-col items-center justify-center h-44">
                    <div className="relative">
                      <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                        <circle
                          cx="60" cy="60" r="52" fill="none" stroke="#7C3AED" strokeWidth="8"
                          strokeDasharray={`${2 * Math.PI * 52 * overview.completionRate / 100} ${2 * Math.PI * 52 * (100 - overview.completionRate) / 100}`}
                          strokeLinecap="round"
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center flex-col">
                        <span className="text-3xl font-bold text-white">{Math.round(overview.completionRate)}%</span>
                        <span className="text-xs text-white/40 mt-1">{PERIOD_LABELS[period].toLowerCase()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 mt-4">
                    <ProgressBar
                      value={overview.completionRate}
                      variant="default"
                      size="sm"
                      showLabel
                      label="Task Completion"
                    />
                    <ProgressBar
                      value={overview.totalActionItems > 0 ? (overview.completedActionItems / overview.totalActionItems * 100) : 0}
                      variant="success"
                      size="sm"
                      showLabel
                      label="Action Item Completion"
                    />
                  </div>
                </GlassCard>
              </motion.div>
            </div>

            {/* Summary stats */}
            <motion.div variants={itemVariants}>
              <GlassCard>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white">Period Summary</h3>
                  <Badge variant="info" size="sm">{PERIOD_LABELS[period]}</Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Tasks', value: overview.totalTasks },
                    { label: 'Completed Tasks', value: overview.completedTasks },
                    { label: 'Decisions Made', value: overview.totalDecisions },
                    { label: 'Overdue Items', value: overview.overdueItems },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
                      <p className="text-xs text-white/40">{item.label}</p>
                      <p className="text-2xl font-bold text-white mt-1">{item.value}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          </>
        )}
      </motion.div>
    </DashboardLayout>
  )
}
