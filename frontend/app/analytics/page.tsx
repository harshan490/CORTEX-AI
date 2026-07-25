'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Video,
  Clock,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  BarChart3,
  AlertTriangle,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { cn } from '@/lib/utils'
import { GlassCard } from '@/components/ui/glass-card'
import { Badge } from '@/components/ui/badge'
import { ProgressBar } from '@/components/ui/progress-bar'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { mockMeetings, mockAnalytics } from '@/lib/mock-data'

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

const PIE_COLORS = ['#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EF4444']

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

const mockMeetingTrends = Array.from({ length: 8 }, (_, i) => {
  const d = new Date('2026-06-01')
  d.setDate(d.getDate() + i * 7)
  return {
    week: `W${Math.ceil((d.getDate() + new Date(d.getFullYear(), d.getMonth(), 0).getDate()) / 7)}`,
    meetings: Math.floor(Math.random() * 8) + 3,
    participants: Math.floor(Math.random() * 20) + 10,
  }
})

const mockTeamPerformance = [
  { name: 'Alice', completed: 12, pending: 3 },
  { name: 'Bob', completed: 9, pending: 5 },
  { name: 'Carol', completed: 15, pending: 2 },
  { name: 'Dave', completed: 7, pending: 4 },
  { name: 'Eve', completed: 11, pending: 1 },
  { name: 'Frank', completed: 5, pending: 6 },
]

const actionItemsBreakdown = [
  { name: 'Completed', value: 312, color: '#10B981' },
  { name: 'Pending', value: 68, color: '#3B82F6' },
  { name: 'In Progress', value: 35, color: '#F59E0B' },
  { name: 'Overdue', value: 8, color: '#EF4444' },
]

const mockRisks = [
  { id: 'risk-1', title: 'Mobile SDK delay may impact partner commitments', severity: 'high' as const, owner: 'Alice', status: 'mitigating' as const },
  { id: 'risk-2', title: 'Hiring timeline is aggressive for Q4', severity: 'medium' as const, owner: 'Carol', status: 'monitoring' as const },
  { id: 'risk-3', title: 'Kafka operational complexity - team lacks expertise', severity: 'high' as const, owner: 'Hank', status: 'open' as const },
  { id: 'risk-4', title: 'Account churn risk if discount not approved', severity: 'critical' as const, owner: 'Carol', status: 'open' as const },
  { id: 'risk-5', title: 'Competitor actively targeting enterprise clients', severity: 'medium' as const, owner: 'Grace', status: 'monitoring' as const },
]

const severityConfig = {
  critical: { variant: 'danger' as const, label: 'Critical' },
  high: { variant: 'warning' as const, label: 'High' },
  medium: { variant: 'default' as const, label: 'Medium' },
  low: { variant: 'info' as const, label: 'Low' },
}

const statusConfig = {
  open: { variant: 'danger' as const, label: 'Open' },
  monitoring: { variant: 'warning' as const, label: 'Monitoring' },
  mitigating: { variant: 'info' as const, label: 'Mitigating' },
  resolved: { variant: 'success' as const, label: 'Resolved' },
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-white/10 bg-cortex-dark/95 px-4 py-3 shadow-2xl backdrop-blur-xl">
      <p className="text-xs text-white/50 mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm font-medium" style={{ color: entry.color || '#fff' }}>
          {entry.name}: {entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('month')

  const metricCards = useMemo(() => [
    {
      label: 'Total Meetings',
      value: mockMeetings.length + 142,
      icon: Video,
      color: 'from-purple-500 to-blue-500',
      trend: '+12.5%',
      up: true,
    },
    {
      label: 'Avg Duration',
      value: mockAnalytics.averageMeetingDuration,
      icon: Clock,
      color: 'from-emerald-500 to-teal-500',
      suffix: 'min',
      trend: '-3.2%',
      up: false,
    },
    {
      label: 'Action Items Completed',
      value: mockAnalytics.previousWeek.tasksCompleted + 23,
      icon: CheckCircle2,
      color: 'from-amber-500 to-orange-500',
      trend: '+17.1%',
      up: true,
    },
    {
      label: 'Productivity Score',
      value: mockAnalytics.productivityScore,
      icon: TrendingUp,
      color: 'from-pink-500 to-rose-500',
      suffix: '%',
      trend: '+7.7%',
      up: true,
    },
  ], [])

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
            <p className="text-white/50 mt-1 text-sm">Track your team&apos;s meeting productivity and performance metrics</p>
          </div>
          <div className="flex items-center gap-2">
            {['week', 'month', 'quarter'].map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                  dateRange === range
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'text-white/40 hover:text-white/70 border border-transparent'
                )}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </motion.div>

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
                      <div className="flex items-center gap-1">
                        {stat.up ? (
                          <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                        )}
                        <span className={cn('text-xs font-medium', stat.up ? 'text-emerald-400' : 'text-red-400')}>
                          {stat.trend}
                        </span>
                        <span className="text-xs text-white/30">vs last period</span>
                      </div>
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

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <motion.div variants={itemVariants} className="xl:col-span-2">
            <GlassCard>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Meeting Trends</h3>
                <Badge variant="info" size="sm">Past 2 Months</Badge>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockMeetingTrends} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="meetingGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="week" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="meetings" stroke="#7C3AED" strokeWidth={2} fill="url(#meetingGradient)" name="Meetings" />
                    <Area type="monotone" dataKey="participants" stroke="#3B82F6" strokeWidth={2} fill="none" strokeDasharray="4 4" name="Participants" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </motion.div>

          <motion.div variants={itemVariants}>
            <GlassCard>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Action Items</h3>
                <Badge variant="success" size="sm">{actionItemsBreakdown[0].value} done</Badge>
              </div>
              <div className="h-72 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={actionItemsBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {actionItemsBreakdown.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {actionItemsBreakdown.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className="text-xs text-white/50">{entry.name} ({entry.value})</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <motion.div variants={itemVariants} className="xl:col-span-2">
            <GlassCard>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Team Performance</h3>
                <Badge variant="info" size="sm">Tasks Completed</Badge>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mockTeamPerformance} margin={{ top: 5, right: 5, left: -20, bottom: 5 }} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="completed" fill="#7C3AED" radius={[4, 4, 0, 0]} name="Completed" />
                    <Bar dataKey="pending" fill="rgba(255,255,255,0.1)" radius={[4, 4, 0, 0]} name="Pending" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </motion.div>

          <motion.div variants={itemVariants}>
            <GlassCard>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Completion Rate</h3>
                <Badge variant="success" size="sm">{mockAnalytics.completionRate}%</Badge>
              </div>
              <div className="flex flex-col items-center justify-center h-44">
                <div className="relative">
                  <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                    <circle
                      cx="60" cy="60" r="52" fill="none" stroke="#7C3AED" strokeWidth="8"
                      strokeDasharray={`${2 * Math.PI * 52 * mockAnalytics.completionRate / 100} ${2 * Math.PI * 52 * (100 - mockAnalytics.completionRate) / 100}`}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-3xl font-bold text-white">{mockAnalytics.completionRate}%</span>
                    <span className="text-xs text-white/40 mt-1">overall</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3 mt-4">
                <ProgressBar
                  value={mockAnalytics.completionRate}
                  variant="default"
                  size="sm"
                  showLabel
                  label="Task Completion"
                />
                <ProgressBar
                  value={mockAnalytics.productivityScore}
                  variant="success"
                  size="sm"
                  showLabel
                  label="Productivity Score"
                />
              </div>
            </GlassCard>
          </motion.div>
        </div>

        <motion.div variants={itemVariants}>
          <GlassCard>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                <h3 className="text-lg font-semibold text-white">Risk Overview</h3>
              </div>
              <Badge variant="warning" size="sm">{mockRisks.length} Active</Badge>
            </div>
            <div className="space-y-3">
              {mockRisks.map((risk) => {
                const severityConf = severityConfig[risk.severity]
                const statusConf = statusConfig[risk.status]
                return (
                  <div
                    key={risk.id}
                    className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors"
                  >
                    <AlertTriangle className={cn(
                      'h-5 w-5 shrink-0',
                      risk.severity === 'critical' ? 'text-red-400' : risk.severity === 'high' ? 'text-amber-400' : 'text-yellow-400'
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium">{risk.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-white/40">Owner: {risk.owner}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={severityConf.variant} size="sm">{severityConf.label}</Badge>
                      <Badge variant={statusConf.variant} size="sm" dot={risk.status === 'open'}>{statusConf.label}</Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </GlassCard>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  )
}
