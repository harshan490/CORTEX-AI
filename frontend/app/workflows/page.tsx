'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GitBranch,
  Play,
  Square,
  Brain,
  Video,
  Database,
  ClipboardList,
  CheckCircle2,
  Shield,
  RefreshCw,
  Cpu,
  Bell,
  ArrowDown,
  Terminal,
  Sparkles,
  AlertCircle,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { GlassCard } from '@/components/ui/glass-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

const agents = [
  { id: 'supervisor', name: 'Supervisor', icon: Brain, desc: 'Orchestrates and delegates tasks across all agents', color: 'from-purple-500 to-purple-600', glow: '#7C3AED' },
  { id: 'meeting-intel', name: 'Meeting Intelligence', icon: Video, desc: 'Transcribes, analyzes, and extracts insights from meetings', color: 'from-blue-500 to-blue-600', glow: '#3B82F6' },
  { id: 'memory', name: 'Memory', icon: Database, desc: 'Stores and retrieves context from past interactions', color: 'from-emerald-500 to-emerald-600', glow: '#10B981' },
  { id: 'planner', name: 'Planner', icon: ClipboardList, desc: 'Creates and optimizes schedules and action plans', color: 'from-amber-500 to-amber-600', glow: '#F59E0B' },
  { id: 'action-extract', name: 'Action Extraction', icon: CheckCircle2, desc: 'Identifies and formalizes action items from discussions', color: 'from-teal-500 to-teal-600', glow: '#14B8A6' },
  { id: 'verification', name: 'Verification', icon: Shield, desc: 'Validates accuracy and consistency of extracted data', color: 'from-indigo-500 to-indigo-600', glow: '#6366F1' },
  { id: 'reflection', name: 'Reflection', icon: RefreshCw, desc: 'Analyzes outcomes and suggests improvements', color: 'from-rose-500 to-rose-600', glow: '#F43F5E' },
  { id: 'execution', name: 'Tool Execution', icon: Cpu, desc: 'Executes automated actions and integrations', color: 'from-cyan-500 to-cyan-600', glow: '#06B6D4' },
  { id: 'tools', name: 'Tools', icon: Terminal, desc: 'Manages external tool integrations and API calls', color: 'from-violet-500 to-violet-600', glow: '#8B5CF6' },
  { id: 'reminder', name: 'Reminder Loop', icon: Bell, desc: 'Monitors deadlines and sends proactive reminders', color: 'from-orange-500 to-orange-600', glow: '#F97316' },
]

const connections = [
  { from: 0, to: 1 },
  { from: 1, to: 2 },
  { from: 2, to: 3 },
  { from: 3, to: 4 },
  { from: 4, to: 5 },
  { from: 5, to: 6 },
  { from: 6, to: 7 },
  { from: 7, to: 8 },
  { from: 8, to: 9 },
  { from: 9, to: 3 },
]

const mockLogs = [
  { time: '00:00:00', agent: 'Supervisor', msg: 'Initializing workflow pipeline...', type: 'info' as const },
  { time: '00:00:01', agent: 'Supervisor', msg: 'Delegating transcription to Meeting Intelligence agent', type: 'info' as const },
  { time: '00:00:02', agent: 'Meeting Intelligence', msg: 'Starting real-time transcription for mtg-002', type: 'start' as const },
  { time: '00:00:03', agent: 'Meeting Intelligence', msg: 'Detected 4 speakers in the meeting', type: 'info' as const },
  { time: '00:00:05', agent: 'Meeting Intelligence', msg: 'Transcription quality: 96% confidence', type: 'success' as const },
  { time: '00:00:06', agent: 'Memory', msg: 'Storing transcript chunks to vector database', type: 'info' as const },
  { time: '00:00:08', agent: 'Memory', msg: 'Indexing complete: 142 segments stored', type: 'success' as const },
  { time: '00:00:09', agent: 'Planner', msg: 'Analyzing transcript for action planning', type: 'info' as const },
  { time: '00:00:12', agent: 'Planner', msg: 'Identified 3 potential action areas', type: 'info' as const },
  { time: '00:00:14', agent: 'Action Extraction', msg: 'Extracting action items from discussion', type: 'start' as const },
  { time: '00:00:16', agent: 'Action Extraction', msg: 'Found 6 action items with high confidence', type: 'success' as const },
  { time: '00:00:17', agent: 'Verification', msg: 'Cross-referencing decisions with action items', type: 'info' as const },
  { time: '00:00:19', agent: 'Verification', msg: 'Verified 5/6 action items against transcript', type: 'info' as const },
  { time: '00:00:20', agent: 'Verification', msg: '1 item flagged for review: incomplete context', type: 'warning' as const },
  { time: '00:00:22', agent: 'Reflection', msg: 'Analyzing extraction accuracy patterns', type: 'info' as const },
  { time: '00:00:25', agent: 'Reflection', msg: 'Suggestion: improve speaker diarization model', type: 'info' as const },
  { time: '00:00:27', agent: 'Tool Execution', msg: 'Creating action items in connected tools', type: 'start' as const },
  { time: '00:00:29', agent: 'Tool Execution', msg: 'Synced 5 items to project management', type: 'success' as const },
  { time: '00:00:31', agent: 'Tools', msg: 'Calendar integration: updated deadlines', type: 'success' as const },
  { time: '00:00:33', agent: 'Reminder', msg: 'Setting deadline reminders for all action items', type: 'info' as const },
  { time: '00:00:35', agent: 'Reminder', msg: '3 reminders configured with 24h lead time', type: 'success' as const },
  { time: '00:00:37', agent: 'Supervisor', msg: 'Pipeline execution completed successfully', type: 'success' as const },
]

const logTypeStyles = {
  info: 'text-white/60',
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  start: 'text-blue-400',
  error: 'text-red-400',
}

const agentColors: Record<string, string> = {
  Supervisor: 'text-purple-400',
  'Meeting Intelligence': 'text-blue-400',
  Memory: 'text-emerald-400',
  Planner: 'text-amber-400',
  'Action Extraction': 'text-teal-400',
  Verification: 'text-indigo-400',
  Reflection: 'text-rose-400',
  'Tool Execution': 'text-cyan-400',
  Tools: 'text-violet-400',
  Reminder: 'text-orange-400',
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { transition: { staggerChildren: 0.04 } },
}

const nodeVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4 } },
}

export default function WorkflowsPage() {
  const [running, setRunning] = useState(false)
  const [visibleLogs, setVisibleLogs] = useState<typeof mockLogs>([])
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [completedAgents, setCompletedAgents] = useState<Set<string>>(new Set())
  const logEndRef = useRef<HTMLDivElement>(null)
  const indexRef = useRef(0)

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [visibleLogs])

  const runWorkflow = useCallback(() => {
    setRunning(true)
    setVisibleLogs([])
    setCompletedAgents(new Set())
    indexRef.current = 0
    setActiveAgentId('supervisor')

    const interval = setInterval(() => {
      if (indexRef.current < mockLogs.length) {
        const log = mockLogs[indexRef.current]
        setVisibleLogs((prev) => [...prev, log])
        setActiveAgentId(log.agent.toLowerCase().replace(/\s+/g, '-'))
        indexRef.current++

        if (indexRef.current === mockLogs.length) {
          clearInterval(interval)
          setTimeout(() => {
            setRunning(false)
            setCompletedAgents(new Set(agents.map((a) => a.id)))
            setActiveAgentId(null)
          }, 500)
        }
      }
    }, 250)

    const completedInterval = setInterval(() => {
      setCompletedAgents((prev) => {
        const next = new Set(prev)
        const idx = Math.min(indexRef.current, agents.length - 1)
        if (idx >= 0) next.add(agents[Math.min(idx, agents.length - 1)].id)
        return next
      })
    }, 1000)

    return () => {
      clearInterval(interval)
      clearInterval(completedInterval)
    }
  }, [])

  const stopWorkflow = useCallback(() => {
    setRunning(false)
  }, [])

  return (
    <DashboardLayout title="Workflows">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <motion.div variants={nodeVariants} className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Multi-Agent Pipeline</h2>
            <p className="text-white/50 mt-1 text-sm max-w-2xl">
              CORTEX AI orchestrates a chain of specialized agents that work together to process meetings,
              extract insights, and execute actions autonomously.
            </p>
          </div>
          <Button
            variant={running ? 'danger' : 'primary'}
            size="lg"
            leftIcon={running ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            onClick={running ? stopWorkflow : runWorkflow}
          >
            {running ? 'Stop Demo' : 'Run Workflow'}
          </Button>
        </motion.div>

        <motion.div variants={nodeVariants}>
          <GlassCard className="overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Agent Pipeline</h3>
              <div className="flex items-center gap-2 text-xs text-white/40">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Running
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" /> Completed
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-white/20" /> Idle
                </span>
              </div>
            </div>

            <div className="relative">
              {connections.map((conn, i) => {
                const fromAgent = agents[conn.from]
                const toAgent = conn.to === 3 && conn.from === 9 ? agents[3] : agents[conn.to]
                const isActive = running && completedAgents.has(fromAgent.id) && !completedAgents.has(toAgent.id)
                const isCompleted = completedAgents.has(fromAgent.id) && completedAgents.has(toAgent.id)

                return (
                  <div
                    key={`conn-${i}`}
                    className="flex items-center justify-center py-1"
                  >
                    <div className={cn(
                      'h-8 w-px transition-all duration-500',
                      isActive ? 'bg-gradient-to-b from-purple-500 to-blue-500 shadow-[0_0_8px_rgba(124,58,237,0.5)]' : isCompleted ? 'bg-emerald-500/50' : 'bg-white/10'
                    )} />
                    <ArrowDown className={cn(
                      'h-3 w-3 ml-1 transition-all duration-300',
                      isActive ? 'text-purple-400 animate-bounce' : isCompleted ? 'text-emerald-400/50' : 'text-white/20'
                    )} />
                  </div>
                )
              })}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {agents.map((agent, i) => {
                  const isActive = running && activeAgentId === agent.id
                  const isCompleted = completedAgents.has(agent.id)
                  const Icon = agent.icon

                  return (
                    <motion.div
                      key={agent.id}
                      variants={nodeVariants}
                      whileHover={{ scale: 1.03 }}
                      className={cn(
                        'relative rounded-2xl border p-4 transition-all duration-500',
                        isActive
                          ? 'border-purple-500/50 bg-purple-500/10 shadow-[0_0_20px_rgba(124,58,237,0.3)]'
                          : isCompleted
                            ? 'border-emerald-500/30 bg-emerald-500/10'
                            : 'border-white/10 bg-white/5 hover:border-white/20'
                      )}
                    >
                      {isActive && (
                        <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 blur-sm -z-10 animate-pulse" />
                      )}
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br',
                          agent.color,
                          isActive && 'shadow-[0_0_12px_rgba(124,58,237,0.5)]'
                        )}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white">{agent.name}</span>
                            <span className={cn(
                              'h-2 w-2 rounded-full shrink-0',
                              isActive ? 'bg-emerald-400 animate-pulse' : isCompleted ? 'bg-emerald-400' : 'bg-white/20'
                            )} />
                          </div>
                          <p className="text-[10px] text-white/40 mt-0.5 leading-tight">{agent.desc}</p>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div variants={nodeVariants}>
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Terminal className="h-5 w-5 text-white/60" />
                <h3 className="text-lg font-semibold text-white">Execution Logs</h3>
              </div>
              {running && (
                <Badge variant="warning" size="sm" dot pulse>Running</Badge>
              )}
            </div>
            <div className="h-80 overflow-y-auto font-mono text-xs space-y-1 scrollbar-thin bg-black/20 rounded-xl p-4">
              {visibleLogs.length === 0 && !running && (
                <div className="flex flex-col items-center justify-center h-full text-white/30">
                  <Play className="h-8 w-8 mb-2" />
                  <p className="text-sm">Click &quot;Run Workflow&quot; to see execution logs</p>
                </div>
              )}
              <AnimatePresence>
                {visibleLogs.map((log, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-start gap-3 py-1"
                  >
                    <span className="text-white/20 w-14 shrink-0">{log.time}</span>
                    <span className={cn('w-28 shrink-0 font-semibold', agentColors[log.agent] || 'text-white/60')}>
                      [{log.agent}]
                    </span>
                    <span className={cn(logTypeStyles[log.type])}>{log.msg}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
              {running && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-white/30 py-1"
                >
                  <span className="h-3 w-3 rounded-full bg-purple-400 animate-pulse" />
                  Processing...
                </motion.div>
              )}
              <div ref={logEndRef} />
            </div>
          </GlassCard>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  )
}
