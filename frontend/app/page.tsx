'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Video,
  CheckCircle2,
  Clock,
  Users,
  ArrowRight,
  Brain,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { GlassCard } from '@/components/ui/glass-card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarGroup } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useStore as useAppStore } from '@/lib/store'
import { mockMeetings, mockTeamMembers, mockStats } from '@/lib/mock-data'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

const statCards = [
  { label: 'Total Meetings', value: mockStats.totalMeetings, icon: Video, color: 'from-purple-500 to-blue-500' },
  { label: 'Action Items', value: mockStats.totalActionItems, icon: CheckCircle2, color: 'from-emerald-500 to-teal-500' },
  { label: 'Completed', value: mockStats.completedActions, icon: Clock, color: 'from-amber-500 to-orange-500' },
  { label: 'Team Members', value: mockTeamMembers.length, icon: Users, color: 'from-pink-500 to-rose-500' },
]

function getStatusVariant(status: string) {
  switch (status) {
    case 'completed': return 'success' as const
    case 'in-progress': return 'warning' as const
    case 'scheduled': return 'info' as const
    case 'cancelled': return 'danger' as const
    default: return 'default' as const
  }
}

export default function HomePage() {
  const router = useRouter()
  const isAuthenticated = useAppStore((s) => s.isAuthenticated)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth')
    }
  }, [isAuthenticated, router])

  return (
    <DashboardLayout title="Welcome back, Alice">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        <motion.div variants={itemVariants} className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Dashboard</h2>
            <p className="text-white/50 mt-1">
              Here&apos;s what&apos;s happening with your team today.
            </p>
          </div>
          <Button variant="primary" leftIcon={<Brain className="h-4 w-4" />}>
            AI Assistant
          </Button>
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => {
            const Icon = stat.icon
            return (
              <GlassCard key={stat.label} hover glow>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-white/50">{stat.label}</p>
                    <p className="text-3xl font-bold text-white mt-1">{stat.value.toLocaleString()}</p>
                  </div>
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg', stat.color)}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                </div>
              </GlassCard>
            )
          })}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div variants={itemVariants} className="lg:col-span-2 space-y-4">
            <h3 className="text-lg font-semibold text-white">Recent Meetings</h3>
            <div className="space-y-3">
              {mockMeetings.slice(0, 4).map((meeting) => (
                <motion.div
                  key={meeting.id}
                  whileHover={{ x: 4 }}
                  onClick={() => router.push(`/meetings/${meeting.id}`)}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] p-4 hover:bg-white/[0.06] hover:border-purple-500/20 cursor-pointer transition-all duration-200"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white truncate">{meeting.title}</p>
                      <Badge variant={getStatusVariant(meeting.status)} size="sm">
                        {meeting.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-white/40 mt-1">
                      {new Date(meeting.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      {' '}· {Math.floor(meeting.duration / 60)} min
                      {' '}· {meeting.participants.length} participants
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-white/30 ml-4 shrink-0" />
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Upcoming Deadlines</h3>
            <div className="space-y-3">
              {mockMeetings
                .flatMap((m) => m.actionItems)
                .filter((ai) => ai.status !== 'completed')
                .slice(0, 4)
                .map((item) => {
                  const priorityColor = item.priority === 'critical' || item.priority === 'high'
                    ? 'text-red-400' : 'text-amber-400'
                  return (
                    <GlassCard key={item.id} className="!p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
                          <Clock className="h-4 w-4 text-white/50" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{item.title}</p>
                          <p className="text-xs text-white/40 mt-0.5">Assigned to {item.owner}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={item.priority === 'critical' ? 'danger' : item.priority === 'high' ? 'warning' : 'default'} size="sm">
                              {item.priority}
                            </Badge>
                            <span className="text-xs text-white/30">
                              Due {new Date(item.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </GlassCard>
                  )
                })}
            </div>
          </motion.div>
        </div>

        <motion.div variants={itemVariants} className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Team Overview</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {mockTeamMembers.map((member) => (
              <GlassCard key={member.id} hover className="!p-4 flex items-center gap-3">
                <Avatar
                  fallback={member.avatar}
                  alt={member.name}
                  size="md"
                  status={member.status}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{member.name}</p>
                  <p className="text-xs text-white/40 truncate">{member.role}</p>
                </div>
              </GlassCard>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  )
}
