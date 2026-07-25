'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Clock,
  Calendar,
  Users,
  FileText,
  ListChecks,
  GitBranch,
  Brain,
  AlertTriangle,
  Activity,
  BarChart3,
  CheckCircle,
  XCircle,
  HelpCircle,
  RefreshCw,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { GlassCard } from '@/components/ui/glass-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProgressBar } from '@/components/ui/progress-bar'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { api } from '@/lib/api'
import type { MeetingStatus, Decision, ActionItem, Risk, Clarification, Dependency, TranscriptSegment } from '@/types'

type TabId = 'transcript' | 'summary' | 'actions' | 'decisions' | 'risks'

const tabs: { id: TabId; label: string; icon: typeof FileText }[] = [
  { id: 'transcript', label: 'Transcript', icon: FileText },
  { id: 'summary', label: 'Summary', icon: Brain },
  { id: 'actions', label: 'Action Items', icon: ListChecks },
  { id: 'decisions', label: 'Decisions', icon: GitBranch },
  { id: 'risks', label: 'Risks', icon: AlertTriangle },
]

const statusConfig: Record<MeetingStatus, { variant: 'success' | 'warning' | 'info' | 'danger' | 'default'; label: string }> = {
  approved: { variant: 'success', label: 'Approved' },
  awaiting_review: { variant: 'warning', label: 'Awaiting Review' },
  processing: { variant: 'info', label: 'Processing' },
  rejected: { variant: 'danger', label: 'Rejected' },
  failed: { variant: 'danger', label: 'Failed' },
  archived: { variant: 'default', label: 'Archived' },
}

const priorityVariant = {
  critical: 'danger' as const,
  high: 'warning' as const,
  medium: 'default' as const,
  low: 'info' as const,
}

const taskStatusVariant = {
  pending: 'default' as const,
  in_progress: 'warning' as const,
  blocked: 'danger' as const,
  overdue: 'danger' as const,
  escalated: 'danger' as const,
  completed: 'success' as const,
}

const speakerColors = [
  'text-purple-400',
  'text-blue-400',
  'text-emerald-400',
  'text-amber-400',
  'text-pink-400',
  'text-cyan-400',
]

const pageTransition = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
}

export default function MeetingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const meetingId = params.id as string
  const [activeTab, setActiveTab] = useState<TabId>('summary')

  const { data: meeting, isLoading, error } = useQuery({
    queryKey: ['meeting', meetingId],
    queryFn: () => api.getMeeting(meetingId),
    staleTime: 5_000,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'processing') return 2_000
      return false
    },
  })

  const approveMutation = useMutation({
    mutationFn: () => api.approveMeeting(meetingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting', meetingId] })
      queryClient.invalidateQueries({ queryKey: ['meetings'] })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: () => api.rejectMeeting(meetingId, 'Rejected by reviewer'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting', meetingId] })
      queryClient.invalidateQueries({ queryKey: ['meetings'] })
    },
  })

  const retryMutation = useMutation({
    mutationFn: async () => {
      const { apiClient } = await import('@/lib/api-client')
      await apiClient.retryProcessing(meetingId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting', meetingId] })
      queryClient.invalidateQueries({ queryKey: ['meetings'] })
    },
  })

  // Build a speaker index map for consistent colors
  const speakerIndex = new Map<string, number>()
  meeting?.transcript.forEach((seg) => {
    if (!speakerIndex.has(seg.speaker)) {
      speakerIndex.set(seg.speaker, speakerIndex.size)
    }
  })

  if (isLoading) {
    return (
      <DashboardLayout title="Loading...">
        <div className="animate-pulse space-y-6">
          <div className="h-10 w-64 rounded bg-white/10" />
          <div className="h-64 rounded-2xl bg-white/5" />
        </div>
      </DashboardLayout>
    )
  }

  if (error || !meeting) {
    return (
      <DashboardLayout title="Meeting Not Found">
        <div className="flex flex-col items-center justify-center py-20">
          <AlertTriangle className="h-16 w-16 text-amber-400/50 mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Meeting not found</h2>
          <p className="text-white/50 text-sm mb-6">
            {error instanceof Error ? error.message : "The meeting you're looking for doesn't exist."}
          </p>
          <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => router.push('/meetings')}>
            Back to Meetings
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  const config = statusConfig[meeting.status] ?? statusConfig.archived
  const completedTasks = meeting.actionItems.filter((t) => t.status === 'completed').length
  const completionPct = meeting.actionItems.length > 0
    ? Math.round((completedTasks / meeting.actionItems.length) * 100)
    : 0

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
              <Badge variant={config.variant} size="md" dot={meeting.status === 'processing'}>
                {config.label}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-1.5 text-sm text-white/40">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {formatDate(meeting.createdAt, 'MMM d, yyyy')}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {meeting.participants.length} participants
              </span>
              {meeting.processingConfidence != null && (
                <span className="flex items-center gap-1.5">
                  <Brain className="h-4 w-4" />
                  {Math.round(meeting.processingConfidence * 100)}% confidence
                </span>
              )}
            </div>
          </div>
          {meeting.status === 'awaiting_review' && (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<XCircle className="h-4 w-4" />}
                loading={rejectMutation.isPending}
                onClick={() => rejectMutation.mutate()}
              >
                Reject
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<CheckCircle className="h-4 w-4" />}
                loading={approveMutation.isPending}
                onClick={() => approveMutation.mutate()}
              >
                Approve
              </Button>
            </div>
          )}
          {meeting.status === 'failed' && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<RefreshCw className="h-4 w-4" />}
              loading={retryMutation.isPending}
              onClick={() => retryMutation.mutate()}
            >
              Retry Processing
            </Button>
          )}
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
                {tab.id === 'actions' && meeting.actionItems.length > 0 && (
                  <span className="ml-1 text-xs text-white/30">({meeting.actionItems.length})</span>
                )}
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

        {meeting.status === 'processing' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 flex items-center gap-3"
          >
            <div className="h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-blue-300">AI is analyzing this meeting. The page will update automatically.</p>
          </motion.div>
        )}

        {meeting.status === 'failed' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-300">Processing Failed</p>
                <p className="text-xs text-red-400/70 mt-0.5">An error occurred during AI analysis. You can retry processing.</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<RefreshCw className="h-4 w-4" />}
                loading={retryMutation.isPending}
                onClick={() => retryMutation.mutate()}
              >
                Retry
              </Button>
            </div>
            {retryMutation.isError && (
              <p className="text-xs text-red-400 mt-2">
                {retryMutation.error instanceof Error ? retryMutation.error.message : 'Retry failed'}
              </p>
            )}
          </motion.div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-3">
            <AnimatePresence mode="wait">
              {activeTab === 'transcript' && (
                <motion.div key="transcript" {...pageTransition}>
                  <GlassCard>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">Transcript</h3>
                      <Badge variant="default" size="sm">{meeting.transcript.length} segments</Badge>
                    </div>
                    {meeting.transcript.length === 0 ? (
                      <p className="text-white/40 text-sm py-8 text-center">No transcript available.</p>
                    ) : (
                      <div className="space-y-4 max-h-[600px] overflow-y-auto scrollbar-thin pr-2">
                        {meeting.transcript.map((seg: TranscriptSegment, i: number) => {
                          const idx = speakerIndex.get(seg.speaker) ?? i
                          return (
                            <motion.div
                              key={seg.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.02 }}
                              className="flex gap-3"
                            >
                              <span className="text-xs text-white/20 w-14 shrink-0 pt-0.5 text-right font-mono">
                                {Math.floor(seg.startTime / 60)}:{String(Math.floor(seg.startTime % 60)).padStart(2, '0')}
                              </span>
                              <div className="flex-1">
                                <span className={cn('text-sm font-semibold', speakerColors[idx % speakerColors.length])}>
                                  {seg.speaker}
                                </span>
                                <p className="text-sm text-white/80 mt-0.5 leading-relaxed">{seg.text}</p>
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    )}
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
                      {meeting.executiveSummary && (
                        <div>
                          <h4 className="text-sm font-semibold text-purple-400 mb-2 flex items-center gap-2">
                            <Brain className="h-4 w-4" />
                            Overview
                          </h4>
                          <p className="text-sm text-white/70 leading-relaxed">{meeting.executiveSummary}</p>
                        </div>
                      )}

                      {meeting.topics.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-2">
                            <Activity className="h-4 w-4" />
                            Topics Discussed
                          </h4>
                          <div className="space-y-3">
                            {meeting.topics.map((topic) => (
                              <div key={topic.id} className="rounded-lg border border-blue-500/10 bg-blue-500/5 p-3">
                                <p className="text-sm font-medium text-white">{topic.title}</p>
                                <p className="text-xs text-white/60 mt-1">{topic.summary}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {meeting.dependencies.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-cyan-400 mb-3 flex items-center gap-2">
                            <GitBranch className="h-4 w-4" />
                            Dependencies
                          </h4>
                          <div className="space-y-2">
                            {meeting.dependencies.map((dep: Dependency) => (
                              <div key={dep.id} className="flex items-start gap-3 rounded-lg border border-cyan-500/10 bg-cyan-500/5 p-3">
                                <GitBranch className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-sm text-white/80">
                                    <span className="text-cyan-300">{dep.fromItemId}</span>
                                    {' '}<Badge variant="default" size="sm">{dep.type}</Badge>{' '}
                                    <span className="text-cyan-300">{dep.toItemId}</span>
                                  </p>
                                  {dep.description && (
                                    <p className="text-xs text-white/50 mt-0.5">{dep.description}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {meeting.clarifications.filter(c => c.status === 'pending').length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
                            <HelpCircle className="h-4 w-4" />
                            Open Questions
                          </h4>
                          <div className="space-y-2">
                            {meeting.clarifications.filter(c => c.status === 'pending').map((c: Clarification) => (
                              <div key={c.id} className="flex items-start gap-3 rounded-lg border border-amber-500/10 bg-amber-500/5 p-3">
                                <HelpCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-sm text-white/80">{c.question}</p>
                                  {c.context && (
                                    <p className="text-xs text-white/40 mt-0.5 italic">{c.context}</p>
                                  )}
                                </div>
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
                    {meeting.actionItems.length === 0 ? (
                      <p className="text-white/40 text-sm py-8 text-center">No action items extracted.</p>
                    ) : (
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
                            {meeting.actionItems.map((item: ActionItem) => (
                              <motion.tr
                                key={item.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
                              >
                                <td className="px-3 py-3">
                                  <p className="text-sm text-white font-medium">{item.title}</p>
                                  {item.description && (
                                    <p className="text-xs text-white/40 mt-0.5 line-clamp-1">{item.description}</p>
                                  )}
                                </td>
                                <td className="px-3 py-3">
                                  <span className="text-sm text-white/60">{item.owner ?? '—'}</span>
                                </td>
                                <td className="px-3 py-3">
                                  <span className="text-sm text-white/60">
                                    {item.deadline ? formatDate(item.deadline, 'MMM d') : '—'}
                                  </span>
                                </td>
                                <td className="px-3 py-3">
                                  <Badge variant={priorityVariant[item.priority]} size="sm">
                                    {item.priority}
                                  </Badge>
                                </td>
                                <td className="px-3 py-3">
                                  <Badge
                                    variant={taskStatusVariant[item.status]}
                                    size="sm"
                                    dot={item.status === 'in_progress'}
                                  >
                                    {item.status.replace('_', ' ')}
                                  </Badge>
                                </td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
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
                    {meeting.decisions.length === 0 ? (
                      <p className="text-white/40 text-sm py-8 text-center">No decisions recorded.</p>
                    ) : (
                      <div className="space-y-3">
                        {meeting.decisions.map((decision: Decision, i: number) => (
                          <motion.div
                            key={decision.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className="flex items-start gap-4 rounded-xl border border-emerald-500/10 bg-emerald-500/[0.03] p-4"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20">
                              <GitBranch className="h-4 w-4 text-emerald-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">{decision.title}</p>
                              <p className="text-xs text-white/60 mt-1">{decision.description}</p>
                              {decision.decidedBy.length > 0 && (
                                <p className="text-xs text-white/30 mt-1">
                                  By: {decision.decidedBy.join(', ')}
                                </p>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </GlassCard>
                </motion.div>
              )}

              {activeTab === 'risks' && (
                <motion.div key="risks" {...pageTransition}>
                  <GlassCard>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">Risks & Concerns</h3>
                      <Badge variant="warning" size="sm">{meeting.risks.length} risks</Badge>
                    </div>
                    {meeting.risks.length === 0 ? (
                      <p className="text-white/40 text-sm py-8 text-center">No risks identified.</p>
                    ) : (
                      <div className="space-y-3">
                        {meeting.risks.map((risk: Risk, i: number) => (
                          <motion.div
                            key={risk.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className="flex items-start gap-4 rounded-xl border border-amber-500/10 bg-amber-500/[0.03] p-4"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/20">
                              <AlertTriangle className="h-4 w-4 text-amber-400" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-white">{risk.title}</p>
                                <Badge
                                  variant={risk.severity === 'critical' || risk.severity === 'high' ? 'danger' : 'warning'}
                                  size="sm"
                                >
                                  {risk.severity}
                                </Badge>
                              </div>
                              <p className="text-xs text-white/60 mt-1">{risk.description}</p>
                              {risk.mitigation && (
                                <p className="text-xs text-emerald-400 mt-1.5">
                                  Mitigation: {risk.mitigation}
                                </p>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="xl:col-span-1 space-y-4">
            <GlassCard>
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-blue-400" />
                <h3 className="text-sm font-semibold text-white">Quick Stats</h3>
              </div>
              <div className="space-y-3">
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
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50">Risks</span>
                  <span className={cn('text-sm', meeting.risks.length > 0 ? 'text-amber-400' : 'text-white')}>
                    {meeting.risks.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50">Dependencies</span>
                  <span className="text-sm text-white">{meeting.dependencies.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50">Open Questions</span>
                  <span className={cn('text-sm', meeting.clarifications.filter(c => c.status === 'pending').length > 0 ? 'text-amber-400' : 'text-white')}>
                    {meeting.clarifications.filter(c => c.status === 'pending').length}
                  </span>
                </div>
                {meeting.processingConfidence != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/50">Confidence</span>
                    <span className="text-sm text-purple-400">
                      {Math.round(meeting.processingConfidence * 100)}%
                    </span>
                  </div>
                )}
              </div>
            </GlassCard>

            {meeting.actionItems.length > 0 && (
              <GlassCard>
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-white">Task Completion</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/50">{completedTasks} of {meeting.actionItems.length} done</span>
                    <span className="text-emerald-400 font-medium">{completionPct}%</span>
                  </div>
                  <ProgressBar value={completionPct} variant="success" size="sm" />
                </div>
              </GlassCard>
            )}

            {meeting.participants.length > 0 && (
              <GlassCard>
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-5 w-5 text-purple-400" />
                  <h3 className="text-sm font-semibold text-white">Participants</h3>
                </div>
                <div className="space-y-2">
                  {meeting.participants.map((p) => (
                    <div key={p.id} className="flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/30 to-blue-500/30 text-xs font-medium text-purple-300">
                        {p.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white truncate">{p.name}</p>
                        {p.role && <p className="text-xs text-white/40 truncate">{p.role}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
