'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic,
  Square,
  Clock,
  Users,
  MessageSquare,
  GitBranch,
  ListChecks,
  AlertTriangle,
  HelpCircle,
  BarChart3,
  Brain,
  Sparkles,
  Send,
  Volume2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { GlassCard } from '@/components/ui/glass-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ProgressBar } from '@/components/ui/progress-bar'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Avatar, AvatarGroup } from '@/components/ui/avatar'

interface TranscriptLine {
  id: string
  speaker: string
  text: string
  time: string
  speakerIndex: number
}

interface ParticipantTime {
  name: string
  seconds: number
  color: string
}

const speakers = ['Alice Chen', 'Bob Martinez', 'Carol Williams', 'Dave Thompson']

const mockTranscript: TranscriptLine[] = [
  { id: 'tl-001', speaker: 'Alice Chen', text: 'Welcome everyone to today\'s sprint planning. Let\'s start with the agenda.', time: '00:00', speakerIndex: 0 },
  { id: 'tl-002', speaker: 'Bob Martinez', text: 'I\'ve prepared the capacity analysis. We have 480 engineering hours available this sprint.', time: '00:12', speakerIndex: 1 },
  { id: 'tl-003', speaker: 'Alice Chen', text: 'Great, let\'s review the priorities for this sprint cycle.', time: '00:28', speakerIndex: 0 },
  { id: 'tl-004', speaker: 'Carol Williams', text: 'The client dashboard redesign is our top priority. Customers have been requesting it.', time: '00:45', speakerIndex: 2 },
  { id: 'tl-005', speaker: 'Bob Martinez', text: 'We should allocate 200 hours for the dashboard. It needs both frontend and backend work.', time: '01:10', speakerIndex: 1 },
  { id: 'tl-006', speaker: 'Alice Chen', text: 'Let\'s also make sure we address the tech debt. Bob, what\'s your recommendation?', time: '01:35', speakerIndex: 0 },
  { id: 'tl-007', speaker: 'Bob Martinez', text: 'I suggest 40% of the sprint for tech debt. We\'ve been accumulating too much.', time: '01:55', speakerIndex: 1 },
  { id: 'tl-008', speaker: 'Alice Chen', text: 'Agreed. Let\'s dedicate 40% to tech debt reduction. Carol, what about the testing framework?', time: '02:20', speakerIndex: 0 },
  { id: 'tl-009', speaker: 'Carol Williams', text: 'We need to adopt a new testing framework. The current one is slowing us down.', time: '02:40', speakerIndex: 2 },
  { id: 'tl-010', speaker: 'Dave Thompson', text: 'I can take the lead on the testing framework migration. Should take about a week.', time: '03:00', speakerIndex: 3 },
  { id: 'tl-011', speaker: 'Alice Chen', text: 'Perfect. Let\'s make that a priority for this sprint. Decision: adopt new testing framework.', time: '03:20', speakerIndex: 0 },
  { id: 'tl-012', speaker: 'Bob Martinez', text: 'I\'ll also start on the authentication middleware refactor. It\'s been causing issues.', time: '03:40', speakerIndex: 1 },
  { id: 'tl-013', speaker: 'Alice Chen', text: 'Great initiative. Let\'s capture these as action items.', time: '04:00', speakerIndex: 0 },
  { id: 'tl-014', speaker: 'Carol Williams', text: 'I can prepare the component library audit results by tomorrow.', time: '04:15', speakerIndex: 2 },
  { id: 'tl-015', speaker: 'Dave Thompson', text: 'The CI/CD pipeline migration is almost done. Just need to finalize the GitHub Actions config.', time: '04:35', speakerIndex: 3 },
  { id: 'tl-016', speaker: 'Alice Chen', text: 'Excellent progress team. Let\'s review the risks before we wrap up.', time: '04:55', speakerIndex: 0 },
  { id: 'tl-017', speaker: 'Bob Martinez', text: 'One risk: the SSO integration has a tight deadline. I might need help.', time: '05:10', speakerIndex: 1 },
  { id: 'tl-018', speaker: 'Alice Chen', text: 'We can pair you with someone. Let\'s make that a plan. Alright, great meeting everyone.', time: '05:30', speakerIndex: 0 },
]

const initialDecisions = [
  { text: 'Adopt new testing framework for all new features', time: '03:20' },
  { text: 'Dedicate 40% of sprint to tech debt reduction', time: '02:20' },
]

const initialActionItems: { text: string; owner: string; status: 'pending' | 'in-progress' | 'completed'; time: string }[] = [
  { text: 'Refactor authentication middleware', owner: 'Bob', status: 'pending', time: '03:40' },
  { text: 'Testing framework migration lead', owner: 'Dave', status: 'pending', time: '03:00' },
  { text: 'Component library audit', owner: 'Carol', status: 'in-progress', time: '04:15' },
]

const initialRisks: { text: string; severity: 'high' | 'medium' | 'low'; time: string }[] = [
  { text: 'SSO integration deadline too tight', severity: 'high', time: '05:10' },
]

const speakerColors = ['#7C3AED', '#3B82F6', '#10B981', '#F59E0B']

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export default function LiveMeetingPage() {
  const [transcriptLines, setTranscriptLines] = useState<TranscriptLine[]>([])
  const [lineIndex, setLineIndex] = useState(0)
  const [isLive, setIsLive] = useState(true)
  const [demoInput, setDemoInput] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [decisions, setDecisions] = useState(initialDecisions)
  const [actionItems, setActionItems] = useState(initialActionItems)
  const [risks, setRisks] = useState(initialRisks)
  const [questions, setQuestions] = useState<string[]>(['Do we need to update the testing framework?', 'What about mobile SDK timeline?'])
  const transcriptEndRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const transcriptTimerRef = useRef<NodeJS.Timeout | null>(null)

  const speakingTime = useRef<Record<string, number>>({
    'Alice Chen': 0,
    'Bob Martinez': 0,
    'Carol Williams': 0,
    'Dave Thompson': 0,
  })

  useEffect(() => {
    if (isLive) {
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1)
      }, 1000)

      transcriptTimerRef.current = setInterval(() => {
        if (lineIndex < mockTranscript.length) {
          const line = mockTranscript[lineIndex]
          setTranscriptLines((prev) => [...prev, line])
          speakingTime.current[line.speaker] = (speakingTime.current[line.speaker] || 0) + 5
          setLineIndex((prev) => prev + 1)
        } else {
          if (transcriptTimerRef.current) clearInterval(transcriptTimerRef.current)
        }
      }, 1500)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (transcriptTimerRef.current) clearInterval(transcriptTimerRef.current)
    }
  }, [isLive, lineIndex])

  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [transcriptLines])

  const handleEndMeeting = useCallback(() => {
    setIsLive(false)
    if (timerRef.current) clearInterval(timerRef.current)
    if (transcriptTimerRef.current) clearInterval(transcriptTimerRef.current)
  }, [])

  const handleSendDemoLine = useCallback(() => {
    if (!demoInput.trim()) return
    const line: TranscriptLine = {
      id: `tl-demo-${Date.now()}`,
      speaker: 'Alice Chen',
      text: demoInput,
      time: formatTime(elapsed),
      speakerIndex: 0,
    }
    setTranscriptLines((prev) => [...prev, line])
    speakingTime.current['Alice Chen'] = (speakingTime.current['Alice Chen'] || 0) + 3
    if (demoInput.toLowerCase().includes('decision')) {
      setDecisions((prev) => [...prev, { text: demoInput, time: formatTime(elapsed) }])
    }
    if (demoInput.toLowerCase().includes('action') || demoInput.toLowerCase().includes('will')) {
      setActionItems((prev) => [...prev, { text: demoInput, owner: 'Team', status: 'pending', time: formatTime(elapsed) }])
    }
    if (demoInput.toLowerCase().includes('risk') || demoInput.toLowerCase().includes('concern')) {
      setRisks((prev) => [...prev, { text: demoInput, severity: 'medium', time: formatTime(elapsed) }])
    }
    if (demoInput.includes('?')) {
      setQuestions((prev) => [...prev, demoInput])
    }
    setDemoInput('')
  }, [demoInput, elapsed])

  const participantTimes: ParticipantTime[] = speakers.map((name, i) => ({
    name,
    seconds: speakingTime.current[name] || 0,
    color: speakerColors[i],
  }))

  const totalSpeakingSeconds = participantTimes.reduce((sum, p) => sum + p.seconds, 0) || 1

  return (
    <DashboardLayout title="Live Meeting">
      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between flex-wrap gap-4"
        >
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-white">Sprint Planning - Week 30</h1>
                <Badge
                  variant={isLive ? 'danger' : 'default'}
                  size="md"
                  dot={isLive}
                  pulse={isLive}
                >
                  {isLive ? 'LIVE' : 'ENDED'}
                </Badge>
              </div>
              <div className="flex items-center gap-4 mt-1.5 text-sm text-white/40">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {formatTime(elapsed)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  4 participants
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AvatarGroup>
              {speakers.map((name, i) => (
                <Avatar key={name} fallback={name.split(' ').map((n) => n[0]).join('')} alt={name} size="sm" />
              ))}
            </AvatarGroup>
            <Button
              variant={isLive ? 'danger' : 'secondary'}
              size="sm"
              leftIcon={isLive ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              onClick={handleEndMeeting}
            >
              {isLive ? 'End Meeting' : 'Rejoin'}
            </Button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          <div className="xl:col-span-3 space-y-4">
            <GlassCard className="!p-0 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-white/40" />
                  <h3 className="text-sm font-semibold text-white">Live Transcript</h3>
                </div>
                {isLive && (
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
                    <span className="text-[10px] text-red-400 font-medium">Recording</span>
                  </div>
                )}
              </div>
              <div className="h-[520px] overflow-y-auto p-5 space-y-3 scrollbar-thin">
                {transcriptLines.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-white/20">
                    <Volume2 className="h-10 w-10 mb-3" />
                    <p className="text-sm">Waiting for transcript...</p>
                  </div>
                )}
                <AnimatePresence>
                  {transcriptLines.map((line) => (
                    <motion.div
                      key={line.id}
                      initial={{ opacity: 0, x: -10, y: 5 }}
                      animate={{ opacity: 1, x: 0, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex gap-3 group"
                    >
                      <span className="text-[10px] text-white/20 w-10 shrink-0 pt-1 text-right font-mono">
                        {line.time}
                      </span>
                      <div className="flex-1">
                        <span
                          className="text-xs font-semibold"
                          style={{ color: speakerColors[line.speakerIndex % speakerColors.length] }}
                        >
                          {line.speaker}
                        </span>
                        <p className="text-sm text-white/80 mt-0.5 leading-relaxed">{line.text}</p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {isLive && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 text-white/20 text-sm"
                  >
                    <span className="flex space-x-0.5">
                      <span className="h-2 w-0.5 bg-purple-400 animate-pulse" style={{ animationDelay: '0ms' }} />
                      <span className="h-3 w-0.5 bg-purple-400 animate-pulse" style={{ animationDelay: '150ms' }} />
                      <span className="h-2 w-0.5 bg-purple-400 animate-pulse" style={{ animationDelay: '300ms' }} />
                    </span>
                    AI is processing...
                  </motion.div>
                )}
                <div ref={transcriptEndRef} />
              </div>

              <div className="border-t border-white/5 p-3">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Simulate transcript line (AI demo)..."
                    icon={<MessageSquare className="h-4 w-4 text-white/30" />}
                    value={demoInput}
                    onChange={(e) => setDemoInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSendDemoLine() }}
                    className="!rounded-xl text-xs"
                  />
                  <button
                    onClick={handleSendDemoLine}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </GlassCard>
          </div>

          <div className="xl:col-span-2 space-y-4">
            <GlassCard className="!p-4">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-blue-400" />
                <h3 className="text-sm font-semibold text-white">Speaking Time</h3>
              </div>
              <div className="space-y-3">
                {participantTimes.map((p) => {
                  const pct = Math.round((p.seconds / totalSpeakingSeconds) * 100)
                  return (
                    <div key={p.name}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-white/70 flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                          {p.name.split(' ')[0]}
                        </span>
                        <span className="text-white/40">{formatTime(p.seconds)} ({pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: p.color }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </GlassCard>

            <GlassCard className="!p-4">
              <div className="flex items-center gap-2 mb-3">
                <GitBranch className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">Decisions</h3>
                <Badge variant="success" size="sm" className="ml-auto">{decisions.length}</Badge>
              </div>
              <div className="space-y-2 max-h-36 overflow-y-auto scrollbar-thin">
                {decisions.length === 0 ? (
                  <p className="text-xs text-white/30">No decisions detected yet</p>
                ) : (
                  decisions.map((d, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg border border-emerald-500/10 bg-emerald-500/5 p-2.5">
                      <div className="h-2 w-2 rounded-full bg-emerald-400 mt-1 shrink-0" />
                      <div>
                        <p className="text-xs text-white/70">{d.text}</p>
                        <span className="text-[10px] text-white/30">at {d.time}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>

            <GlassCard className="!p-4">
              <div className="flex items-center gap-2 mb-3">
                <ListChecks className="h-4 w-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-white">Action Items</h3>
                <Badge variant="info" size="sm" className="ml-auto">{actionItems.length}</Badge>
              </div>
              <div className="space-y-2 max-h-36 overflow-y-auto scrollbar-thin">
                {actionItems.length === 0 ? (
                  <p className="text-xs text-white/30">No action items extracted yet</p>
                ) : (
                  actionItems.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg border border-blue-500/10 bg-blue-500/5 p-2.5">
                      <div className={cn(
                        'h-2 w-2 rounded-full mt-1 shrink-0',
                        item.status === 'completed' ? 'bg-emerald-400' : item.status === 'in-progress' ? 'bg-amber-400' : 'bg-blue-400'
                      )} />
                      <div>
                        <p className="text-xs text-white/70">{item.text}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-white/30">@{item.owner}</span>
                          <span className="text-[10px] text-white/30">at {item.time}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>

            <div className="grid grid-cols-2 gap-4">
              <GlassCard className="!p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <h3 className="text-xs font-semibold text-white">Risks</h3>
                </div>
                <div className="space-y-1.5">
                  {risks.length === 0 ? (
                    <p className="text-[10px] text-white/30">None detected</p>
                  ) : (
                    risks.map((r, i) => (
                      <div key={i} className="text-[10px] text-white/60 flex items-start gap-1">
                        <span className="text-amber-400">&#9888;</span>
                        {r.text}
                      </div>
                    ))
                  )}
                </div>
              </GlassCard>

              <GlassCard className="!p-4">
                <div className="flex items-center gap-2 mb-2">
                  <HelpCircle className="h-4 w-4 text-pink-400" />
                  <h3 className="text-xs font-semibold text-white">Questions</h3>
                </div>
                <div className="space-y-1.5">
                  {questions.length === 0 ? (
                    <p className="text-[10px] text-white/30">None raised</p>
                  ) : (
                    questions.map((q, i) => (
                      <div key={i} className="text-[10px] text-white/60">&#8226; {q}</div>
                    ))
                  )}
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
