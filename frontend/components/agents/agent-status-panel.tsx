'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  Video,
  Database,
  ClipboardList,
  CheckCircle2,
  Shield,
  RefreshCw,
  Cpu,
  Bell,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Clock,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { GlassCard } from '@/components/ui/glass-card'

interface AgentData {
  id: string
  name: string
  icon: typeof Brain
  status: 'idle' | 'running' | 'completed' | 'error'
  currentAction: string
  processingTime?: string
  lastAction?: string
  confidence?: number
  reasoning?: string
}

const agents: AgentData[] = [
  { id: 'agent-supervisor', name: 'Supervisor', icon: Brain, status: 'running', currentAction: 'Orchestrating agent pipeline', processingTime: '12s', lastAction: 'Delegated transcription task', confidence: 98, reasoning: 'All agents operational, continuing workflow execution' },
  { id: 'agent-meeting', name: 'Meeting Intelligence', icon: Video, status: 'running', currentAction: 'Processing meeting mtg-002', processingTime: '8s', lastAction: 'Extracted speaker segments', confidence: 94, reasoning: 'Audio quality is good, transcription confidence high' },
  { id: 'agent-memory', name: 'Memory', icon: Database, status: 'completed', currentAction: 'Idle', processingTime: '3s', lastAction: 'Stored meeting summary to vector DB', confidence: 99, reasoning: 'Successfully embedded and indexed all meeting data' },
  { id: 'agent-planner', name: 'Planner', icon: ClipboardList, status: 'idle', currentAction: 'Waiting for input', processingTime: '-', lastAction: 'Generated sprint plan for Week 30', confidence: 87, reasoning: 'Awaiting new task creation to generate plan' },
  { id: 'agent-actions', name: 'Action Extraction', icon: CheckCircle2, status: 'completed', currentAction: 'Idle', processingTime: '5s', lastAction: 'Extracted 6 action items from mtg-002', confidence: 92, reasoning: 'All action items verified against transcript' },
  { id: 'agent-verify', name: 'Verification', icon: Shield, status: 'running', currentAction: 'Validating action items', processingTime: '4s', lastAction: 'Verified 3 action items from mtg-001', confidence: 96, reasoning: 'Cross-referencing decisions with action items' },
  { id: 'agent-reflection', name: 'Reflection', icon: RefreshCw, status: 'idle', currentAction: 'Analyzing past outcomes', processingTime: '-', lastAction: 'Completed retrospective analysis', confidence: 85, reasoning: 'Analyzing success patterns from completed tasks' },
  { id: 'agent-execution', name: 'Tool Execution', icon: Cpu, status: 'running', currentAction: 'Executing scheduled tasks', processingTime: '6s', lastAction: 'Executed calendar update for mtg-003', confidence: 97, reasoning: 'All tool calls returning successfully' },
  { id: 'agent-reminder', name: 'Reminder Loop', icon: Bell, status: 'idle', currentAction: 'Monitoring deadlines', processingTime: '-', lastAction: 'Sent 3 deadline reminders', confidence: 100, reasoning: 'No pending reminders at this time' },
  { id: 'agent-analytics', name: 'Analytics', icon: BarChart3, status: 'completed', currentAction: 'Generating reports', processingTime: '2s', lastAction: 'Generated weekly productivity report', confidence: 91, reasoning: 'All metrics within expected ranges' },
]

const statusConfig = {
  idle: { label: 'Idle', color: 'text-white/40', bg: 'bg-white/10', dot: 'bg-white/30' },
  running: { label: 'Running', color: 'text-blue-400', bg: 'bg-blue-500/15', dot: 'bg-blue-400 animate-pulse' },
  completed: { label: 'Completed', color: 'text-emerald-400', bg: 'bg-emerald-500/15', dot: 'bg-emerald-400' },
  error: { label: 'Error', color: 'text-red-400', bg: 'bg-red-500/15', dot: 'bg-red-400 animate-pulse' },
}

interface AgentStatusPanelProps {
  variant?: 'compact' | 'full'
  className?: string
}

export function AgentStatusPanel({ variant = 'full', className }: AgentStatusPanelProps) {
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')

  const filteredAgents = filter === 'all' ? agents : agents.filter((a) => a.status === filter)

  return (
    <GlassCard className={cn('p-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-400" />
          <h3 className="text-sm font-semibold text-white">AI Agents</h3>
        </div>
        {variant === 'full' && (
          <div className="flex items-center gap-1.5">
            {['all', 'running', 'completed', 'idle', 'error'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'px-2 py-1 text-[10px] rounded-md font-medium transition-colors',
                  filter === f
                    ? 'bg-purple-500/20 text-purple-300'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                )}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        {filteredAgents.map((agent, i) => {
          const status = statusConfig[agent.status]
          const Icon = agent.icon
          const isExpanded = expandedAgent === agent.id

          return (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <button
                onClick={() => setExpandedAgent(isExpanded ? null : agent.id)}
                className="w-full group"
              >
                <div
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200',
                    'hover:bg-white/[0.04]',
                    isExpanded && 'rounded-b-none bg-white/[0.03]'
                  )}
                >
                  <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', status.bg)}>
                    <Icon className={cn('h-4 w-4', status.color)} />
                  </div>

                  {variant === 'full' && (
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{agent.name}</span>
                        <span className={cn('flex items-center gap-1.5 text-[10px] font-medium', status.color)}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
                          {status.label}
                        </span>
                      </div>
                      <p className="text-xs text-white/40 truncate mt-0.5">{agent.currentAction}</p>
                    </div>
                  )}

                  {variant === 'compact' && (
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{agent.name}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 shrink-0">
                    {agent.processingTime && agent.processingTime !== '-' && (
                      <span className="flex items-center gap-1 text-[10px] text-white/30">
                        <Clock className="h-3 w-3" />
                        {agent.processingTime}
                      </span>
                    )}
                    {variant === 'full' && (
                      isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-white/30" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-white/30" />
                      )
                    )}
                  </div>
                </div>
              </button>

              {variant === 'full' && (
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 pt-1 space-y-2 rounded-b-xl bg-white/[0.02] border-t border-white/5 mx-3">
                        {agent.lastAction && (
                          <div className="flex items-start gap-2">
                            <Sparkles className="h-3 w-3 text-purple-400 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-[10px] text-white/30 font-medium">Last Action</p>
                              <p className="text-xs text-white/60">{agent.lastAction}</p>
                            </div>
                          </div>
                        )}
                        {agent.confidence !== undefined && (
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-white/30">Confidence</span>
                            <span className="text-xs font-medium" style={{ color: agent.confidence >= 90 ? '#34D399' : agent.confidence >= 80 ? '#FBBF24' : '#F87171' }}>
                              {agent.confidence}%
                            </span>
                          </div>
                        )}
                        {agent.reasoning && (
                          <div className="flex items-start gap-2">
                            <Brain className="h-3 w-3 text-blue-400 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-[10px] text-white/30 font-medium">Reasoning</p>
                              <p className="text-xs text-white/50">{agent.reasoning}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </motion.div>
          )
        })}
      </div>
    </GlassCard>
  )
}
