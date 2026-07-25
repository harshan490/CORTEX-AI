'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Video,
  CheckCircle2,
  Users,
  BarChart3,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import {
  AreaChart,
  Area,
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
import { StatusDot } from '@/components/ui/status-dot'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { mockAnalytics, mockTimelineEvents, mockTeamMembers, mockStats } from '@/lib/mock-data'

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

const statCards = [
  {
    label: 'Total Meetings',
    value: mockStats.totalMeetings,
    icon: Video,
    color: 'from-purple-500 to-blue-500',
    trend: '+12%',
    trending: true,
  },
  {
    label: 'Active Tasks',
    value: mockStats.totalActionItems - mockStats.completedActions,
    icon: CheckCircle2,
    color: 'from-emerald-500 to-teal-500',
    trend: '-5%',
    trending: false,
  },
  {
    label: 'Completed',
    value: mockStats.completedActions,
    icon: BarChart3,
    color: 'from-amber-500 to-orange-500',
    trend: '+18%',
    trending: true,
  },
  {
    label: 'Team Members',
    value: mockTeamMembers.length,
    icon: Users,
    color: 'from-pink-500 to-rose-500',
    trend: '0%',
    trending: true,
  },
]

const timelineIconMap = {
  meeting: 'bg-purple-500/20 text-purple-400',
  task: 'bg-blue-500/20 text-blue-400',
  decision: 'bg-emerald-500/20 text-emerald-400',
  milestone: 'bg-amber-500/20 text-amber-400',
  note: 'bg-red-500/20 text-red-400',
} as const

const PIE_COLORS = ['#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EF4444']

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-white/10 bg-cortex-dark/95 px-4 py-3 shadow-2xl backdrop-blur-xl">
      <p className="text-xs text-white/50">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm font-medium text-white" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const productivityData = useMemo(() => mockAnalytics.productivityTrend, [])
  const weeklyData = useMemo(() => mockAnalytics.weeklyDistribution, [])
  const teamWorkload = useMemo(() => {
    const statuses = mockTeamMembers.map((m) => ({
      name: m.name.split(' ')[0],
      status: m.status,
    }))
    const online = statuses.filter((s) => s.status === 'online').length
    const busy = statuses.filter((s) => s.status === 'busy').length
    const away = statuses.filter((s) => s.status === 'away').length
    const offline = statuses.filter((s) => s.status === 'offline').length
    return [
      { name: 'Online', value: online, color: '#10B981' },
      { name: 'Busy', value: busy, color: '#EF4444' },
      { name: 'Away', value: away, color: '#F59E0B' },
      { name: 'Offline', value: offline, color: '#6B7280' },
    ]
  }, [])

  return (
    <DashboardLayout title="Dashboard">
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
                          {stat.trend}
                        </span>
                        <span className="text-xs text-white/30">vs last week</span>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <GlassCard>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Meeting Activity</h3>
                <Badge variant="info" size="sm">This Week</Badge>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={productivityData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { weekday: 'short' })} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} domain={[0, 100]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="score" stroke="#7C3AED" strokeWidth={2} fill="url(#scoreGradient)" name="Productivity Score" />
                  </AreaChart>
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
              <div className="h-72 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Completed', value: mockAnalytics.completionRate },
                        { name: 'Pending', value: 100 - mockAnalytics.completionRate },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      <Cell fill="#7C3AED" />
                      <Cell fill="rgba(255,255,255,0.08)" />
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-6 mt-2">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-purple-500" />
                  <span className="text-xs text-white/50">Completed ({mockAnalytics.completionRate}%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
                  <span className="text-xs text-white/50">Pending ({100 - mockAnalytics.completionRate}%)</span>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <GlassCard>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
                <Badge variant="default" size="sm">Live</Badge>
              </div>
              <div className="space-y-0">
                {mockTimelineEvents.slice(0, 6).map((event, i) => {
                  const iconBg = timelineIconMap[event.type] || timelineIconMap.note
                  return (
                    <div key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
                      {i < mockTimelineEvents.slice(0, 6).length - 1 && (
                        <div className="absolute left-[17px] top-10 bottom-0 w-px bg-white/5" />
                      )}
                      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', iconBg)}>
                        <div className="h-2 w-2 rounded-full bg-current" />
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <p className="text-sm font-medium text-white">{event.title}</p>
                        <p className="text-xs text-white/40 mt-0.5">{event.description}</p>
                        <p className="text-xs text-white/20 mt-1">
                          {new Date(event.timestamp).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </GlassCard>
          </motion.div>

          <motion.div variants={itemVariants}>
            <GlassCard>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Team Workload</h3>
                <Badge variant="info" size="sm">{mockAnalytics.teamWorkload}%</Badge>
              </div>
              <div className="h-56 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={teamWorkload}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {teamWorkload.map((entry, index) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {teamWorkload.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <StatusDot status={entry.name.toLowerCase() as any} size="sm" />
                    <span className="text-xs text-white/50">{entry.name} ({entry.value})</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </motion.div>
    </DashboardLayout>
  )
}
