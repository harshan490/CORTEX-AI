'use client'

import { useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Clock,
  Calendar,
  Users,
  Mic,
  FileText,
  ListChecks,
  GitBranch,
  Brain,
  MessageSquare,
  AlertTriangle,
  Sparkles,
  Activity,
  BarChart3,
  Play,
  Square,
} from 'lucide-react'
import { cn, formatDate, formatRelativeTime } from '@/lib/utils'
import { GlassCard } from '@/components/ui/glass-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProgressBar } from '@/components/ui/progress-bar'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { mockMeetings } from '@/lib/mock-data'

type TabId = 'transcript' | 'summary' | 'actions' | 'decisions' | 'timeline'

interface Tab {
  id: TabId
  label: string
  icon: typeof FileText
}

const tabs: Tab[] = [
  { id: 'transcript', label: 'Transcript', icon: FileText },
  { id: 'summary', label: 'Summary', icon: Brain },
  { id: 'actions', label: 'Action Items', icon: ListChecks },
  { id: 'decisions', label: 'Decisions', icon: GitBranch },
  { id: 'timeline', label: 'Timeline', icon: Activity },
]

const statusConfig = {
  completed: { variant: 'success' as const, label: 'Completed' },
  'in-progress': { variant: 'warning' as const, label: 'In Progress' },
  scheduled: { variant: 'info' as const, label: 'Scheduled' },
  cancelled: { variant: 'danger' as const, label: 'Cancelled' },
}

const priorityConfig = {
  critical: { variant: 'danger' as const, label: 'Critical' },
  high: { variant: 'warning' as const, label: 'High' },
  medium: { variant: 'default' as const, label: 'Medium' },
  low: { variant: 'info' as const, label: 'Low' },
}

const actionStatusConfig = {
  pending: { variant: 'default' as const, label: 'Pending' },
  'in-progress': { variant: 'warning' as const, label: 'In Progress' },
  completed: { variant: 'success' as const, label: 'Completed' },
}

const speakerColors = [
  'text-purple-400',
  'text-blue-400',
  'text-emerald-400',
  'text-amber-400',
  'text-pink-400',
  'text-cyan-400',
]

const mockTranscriptLines = [
  { speaker: 'Alice Chen', text: 'Welcome everyone to the Q4 product strategy review. Let\'s start with the agenda.', time: '0:00', speakerIndex: 0 },
  { speaker: 'Bob Martinez', text: 'I\'ve prepared the engineering capacity analysis for Q4.', time: '0:15', speakerIndex: 1 },
  { speaker: 'Alice Chen', text: 'Great, let\'s review that first. What does the data show?', time: '0:28', speakerIndex: 0 },
  { speaker: 'Bob Martinez', text: 'We have about 480 engineering hours available. The AI Analytics module will need roughly 200 hours.', time: '0:45', speakerIndex: 1 },
  { speaker: 'Carol Williams', text: 'From the product side, we\'re seeing strong demand for the AI features from enterprise clients.', time: '1:20', speakerIndex: 2 },
  { speaker: 'Alice Chen', text: 'Let\'s lock in the AI Analytics module for October launch.', time: '2:00', speakerIndex: 0 },
  { speaker: 'Dave Thompson', text: 'Infrastructure-wise, we can support the new module. We\'ll need to scale our GPU cluster.', time: '2:30', speakerIndex: 3 },
  { speaker: 'Bob Martinez', text: 'The enterprise SSO integration is also high priority. Several prospects are blocked on this.', time: '3:15', speakerIndex: 1 },
  { speaker: 'Alice Chen', text: 'OK, let\'s prioritize both. AI Analytics for October, SSO by November 15.', time: '3:45', speakerIndex: 0 },
  { speaker: 'Carol Williams', text: 'About the mobile SDK - should we reconsider the timeline?', time: '4:20', speakerIndex: 2 },
  { speaker: 'Alice Chen', text: 'Given our capacity, I think we need to push mobile to Q1 2027. Agreed?', time: '4:50', speakerIndex: 0 },
  { speaker: 'Bob Martinez', text: 'That makes sense. We don\'t have the bandwidth right now.', time: '5:15', speakerIndex: 1 },
  { speaker: 'Alice Chen', text: 'Decision made. Mobile SDK moves to Q1 2027. Now let\'s talk about hiring.', time: '5:30', speakerIndex: 0 },
]

const mockTimelineEntries = [
  { time: '0:00', event: 'Meeting started', type: 'start' as const, icon: Play },
  { time: '0:15', event: 'Engineering capacity review began', type: 'milestone' as const, icon: Activity },
  { time: '2:00', event: 'Decision: AI Analytics module approved for October', type: 'decision' as const, icon: GitBranch },
  { time: '3:45', event: 'Decision: Enterprise SSO by November 15', type: 'decision' as const, icon: GitBranch },
  { time: '4:50', event: 'Discussion: Mobile SDK timeline', type: 'discussion' as const, icon: MessageSquare },
  { time: '5:30', event: 'Decision: Mobile SDK postponed to Q1 2027', type: 'decision' as const, icon: GitBranch },
  { time: '5:45', event: 'Task created: Draft AI Analytics spec (assigned to Alice)', type: 'task' as const, icon: ListChecks },
  { time: '6:30', event: 'Task created: Enterprise SSO vendor evaluation (assigned to Bob)', type: 'task' as const, icon: ListChecks },
  { time: '7:00', event: 'Task created: Prepare hiring plan (assigned to Carol)', type: 'task' as const, icon: ListChecks },
]

const pageTransition = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
}

export default function MeetingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabId>('transcript')
  const [isLiveTranscription, setIsLiveTranscription] = useState(false)

  const meeting = useMemo(
    () => mockMeetings.find((m) => m.id === params.id),
    [params.id]
  )

  if (!meeting) {
    return (
      <DashboardLayout title="Meeting Not Found">
        <div className="flex flex-col items-center justify-center py-20">
          <AlertTriangle className="h-16 w-16 text-amber-400/50 mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Meeting not found</h2>
          <p className="text-white/50 text-sm mb-6">The meeting you&apos;re looking for doesn&apos;t exist.</p>
          <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => router.push('/meetings')}>
            Back to Meetings
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  const config = statusConfig[meeting.status]

  return (
    <DashboardLayout title={meeting.title}>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <button
            onClick={() => router.push('/meetings')}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white">{meeting.title}</h1>
              <Badge variant={config.variant} size="md" dot={meeting.status === 'in-progress'}>
                {config.label}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-1.5 text-sm text-white/40">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {formatDate(meeting.date, 'MMM d, yyyy')}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {Math.floor(meeting.duration / 60)} min
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {meeting.participants.length} participants
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={isLiveTranscription ? 'danger' : 'secondary'}
              size="sm"
              leftIcon={isLiveTranscription ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              onClick={() => setIsLiveTranscription(!isLiveTranscription)}
            >
              {isLiveTranscription ? 'Stop Demo' : 'Live Demo'}
            </Button>
          </div>
        </motion.div>

        <div className="flex items-center gap-1 border-b border-white/10 overflow-x-auto scrollbar-hidden">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'relative flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors',
                  isActive ? 'text-white' : 'text-white/40 hover:text-white/70'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                  />
                )}
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-3">
            <AnimatePresence mode="wait">
              {activeTab === 'transcript' && (
                <motion.div key="transcript" {...pageTransition}>
                  <GlassCard>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">Transcript</h3>
                      {isLiveTranscription && (
                        <Badge variant="danger" size="sm" dot pulse>
                          Recording
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-4 max-h-[600px] overflow-y-auto scrollbar-thin pr-2">
                      {mockTranscriptLines.map((line, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex gap-3"
                        >
                          <span className="text-xs text-white/20 w-10 shrink-0 pt-0.5 text-right font-mono">
                            {line.time}
                          </span>
                          <div className="flex-1">
                            <span className={cn('text-sm font-semibold', speakerColors[line.speakerIndex % speakerColors.length])}>
                              {line.speaker}
                            </span>
                            <p className="text-sm text-white/80 mt-0.5 leading-relaxed">{line.text}</p>
                          </div>
                        </motion.div>
                      ))}
                      {isLiveTranscription && (
                        <div className="flex items-center gap-2 text-white/30 text-sm animate-pulse">
                          <span className="h-2 w-2 rounded-full bg-red-400" />
                          Listening...
                        </div>
                      )}
                    </div>
                  </GlassCard>
                </motion.div>
              )}

              {activeTab === 'summary' && (
                <motion.div key="summary" {...pageTransition}>
                  <GlassCard>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-white">AI-Generated Summary</h3>
                      <Badge variant="success" size="sm" dot>AI Generated</Badge>
                    </div>
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-semibold text-purple-400 mb-2 flex items-center gap-2">
                          <Brain className="h-4 w-4" />
                          Overview
                        </h4>
                        <p className="text-sm text-white/70 leading-relaxed">{meeting.summary}</p>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                          <GitBranch className="h-4 w-4" />
                          Key Decisions
                        </h4>
                        <div className="space-y-2">
                          {meeting.decisions.map((decision, i) => (
                            <div key={i} className="flex items-start gap-3 rounded-lg border border-emerald-500/10 bg-emerald-500/5 p-3">
                              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                              </div>
                              <p className="text-sm text-white/80">{decision}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {meeting.risks.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Risks & Concerns
                          </h4>
                          <div className="space-y-2">
                            {meeting.risks.map((risk, i) => (
                              <div key={i} className="flex items-start gap-3 rounded-lg border border-amber-500/10 bg-amber-500/5 p-3">
                                <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                                <p className="text-sm text-white/80">{risk}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </GlassCard>
                </motion.div>
              )}

              {activeTab === 'actions' && (
                <motion.div key="actions" {...pageTransition}>
                  <GlassCard>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">Action Items</h3>
                      <Badge variant="default" size="sm">{meeting.actionItems.length} items</Badge>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/5">
                            <th className="text-left text-xs font-medium text-white/40 px-3 py-2">Task</th>
                            <th className="text-left text-xs font-medium text-white/40 px-3 py-2">Owner</th>
                            <th className="text-left text-xs font-medium text-white/40 px-3 py-2">Deadline</th>
                            <th className="text-left text-xs font-medium text-white/40 px-3 py-2">Priority</th>
                            <th className="text-left text-xs font-medium text-white/40 px-3 py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {meeting.actionItems.map((item) => {
                            const priorityConf = priorityConfig[item.priority]
                            const statusConf = actionStatusConfig[item.status]
                            return (
                              <motion.tr
                                key={item.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
                              >
                                <td className="px-3 py-3">
                                  <p className="text-sm text-white font-medium">{item.title}</p>
                                </td>
                                <td className="px-3 py-3">
                                  <span className="text-sm text-white/60">{item.owner}</span>
                                </td>
                                <td className="px-3 py-3">
                                  <span className="text-sm text-white/60">{formatDate(item.deadline, 'MMM d')}</span>
                                </td>
                                <td className="px-3 py-3">
                                  <Badge variant={priorityConf.variant} size="sm">{priorityConf.label}</Badge>
                                </td>
                                <td className="px-3 py-3">
                                  <Badge variant={statusConf.variant} size="sm" dot={item.status === 'in-progress'}>{statusConf.label}</Badge>
                                </td>
                              </motion.tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </GlassCard>
                </motion.div>
              )}

              {activeTab === 'decisions' && (
                <motion.div key="decisions" {...pageTransition}>
                  <GlassCard>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">Decisions Made</h3>
                      <Badge variant="success" size="sm">{meeting.decisions.length} decisions</Badge>
                    </div>
                    <div className="space-y-3">
                      {meeting.decisions.map((decision, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="flex items-start gap-4 rounded-xl border border-emerald-500/10 bg-emerald-500/[0.03] p-4"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20">
                            <GitBranch className="h-4 w-4 text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-sm text-white/90">{decision}</p>
                            <p className="text-xs text-white/30 mt-1">
                              Decided during &ldquo;{meeting.title}&rdquo;
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </GlassCard>
                </motion.div>
              )}

              {activeTab === 'timeline' && (
                <motion.div key="timeline" {...pageTransition}>
                  <GlassCard>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-white">Meeting Timeline</h3>
                      <Badge variant="info" size="sm">{mockTimelineEntries.length} events</Badge>
                    </div>
                    <div className="space-y-0">
                      {mockTimelineEntries.map((entry, i) => {
                        const typeColors = {
                          start: 'border-purple-500 bg-purple-500/20 text-purple-400',
                          decision: 'border-emerald-500 bg-emerald-500/20 text-emerald-400',
                          milestone: 'border-blue-500 bg-blue-500/20 text-blue-400',
                          task: 'border-amber-500 bg-amber-500/20 text-amber-400',
                          discussion: 'border-pink-500 bg-pink-500/20 text-pink-400',
                        }
                        const color = typeColors[entry.type]
                        return (
                          <div key={i} className="relative flex gap-4 pb-8 last:pb-0">
                            {i < mockTimelineEntries.length - 1 && (
                              <div className="absolute left-[19px] top-10 bottom-0 w-px bg-white/5" />
                            )}
                            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2', color)}>
                              <entry.icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 pt-2">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-white">{entry.event}</p>
                              </div>
                              <span className="text-xs text-white/30 mt-1 block">at {entry.time}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="xl:col-span-1 space-y-4">
            <GlassCard>
              <div className="flex items-center gap-2 mb-4">
                <Brain className="h-5 w-5 text-purple-400" />
                <h3 className="text-sm font-semibold text-white">AI Insights</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-white/50">Speaking Time</span>
                    <span className="text-white/70">Alice (42%)</span>
                  </div>
                  <ProgressBar value={42} variant="default" size="sm" />
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="text-white/30">Bob (28%)</span>
                    <span className="text-white/30">Carol (18%)</span>
                    <span className="text-white/30">Dave (12%)</span>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-4">
                  <h4 className="text-xs font-medium text-white/50 mb-2">Top Topics</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {['AI Analytics', 'Enterprise SSO', 'Mobile SDK', 'Hiring', 'Q4 Roadmap'].map((topic) => (
                      <Badge key={topic} variant="default" size="sm">{topic}</Badge>
                    ))}
                  </div>
                </div>

                <div className="border-t border-white/5 pt-4">
                  <h4 className="text-xs font-medium text-white/50 mb-2">Sentiment</h4>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-gradient-to-r from-red-500/30 via-amber-500/30 to-emerald-500/30 relative">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-emerald-400 border-2 border-cortex-darker" />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-white/30 mt-1">
                    <span>Negative</span>
                    <span className="text-emerald-400 font-medium">Positive</span>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-4">
                  <h4 className="text-xs font-medium text-white/50 mb-2">Meeting Score</h4>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-emerald-400">87</span>
                    <div className="flex-1">
                      <ProgressBar value={87} variant="success" size="sm" />
                      <p className="text-xs text-white/30 mt-1">Productive meeting</p>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-blue-400" />
                <h3 className="text-sm font-semibold text-white">Quick Stats</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50">Duration</span>
                  <span className="text-sm text-white">{Math.floor(meeting.duration / 60)} min</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50">Participants</span>
                  <span className="text-sm text-white">{meeting.participants.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50">Action Items</span>
                  <span className="text-sm text-white">{meeting.actionItems.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50">Decisions</span>
                  <span className="text-sm text-white">{meeting.decisions.length}</span>
                </div>
                {meeting.risks.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/50">Risks</span>
                    <span className="text-sm text-amber-400">{meeting.risks.length}</span>
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
