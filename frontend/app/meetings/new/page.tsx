'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  FileText,
  Brain,
  CheckCircle,
} from 'lucide-react'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { useStore as useAppStore } from '@/lib/store'
import { api } from '@/lib/api'

export default function NewMeetingPage() {
  const router = useRouter()
  const isAuthenticated = useAppStore((s) => s.isAuthenticated)

  useEffect(() => {
    if (!isAuthenticated) router.push('/auth')
  }, [isAuthenticated, router])

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [transcript, setTranscript] = useState('')

  const createMutation = useMutation({
    mutationFn: () =>
      api.processMeeting({
        title,
        description: description || undefined,
        transcript: transcript || undefined,
        inputMethod: 'transcript',
      }),
    onSuccess: (meeting) => {
      router.push(`/meetings/${meeting.id}`)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    createMutation.mutate()
  }

  return (
    <DashboardLayout title="New Meeting">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-6"
        >
          <button
            onClick={() => router.push('/meetings')}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">New Meeting</h1>
            <p className="text-sm text-white/40 mt-0.5">Submit a transcript for AI processing</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard>
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Meeting Title"
                placeholder="e.g. Q3 Product Strategy Review"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />

              <Input
                label="Description (optional)"
                placeholder="Brief context about this meeting"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-white/70">
                  Transcript
                </label>
                <textarea
                  placeholder="Paste your meeting transcript here. The AI will extract action items, decisions, risks, and generate a summary..."
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  rows={10}
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/20 focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/30 transition-colors"
                />
              </div>

              {createMutation.isError && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {createMutation.error instanceof Error
                    ? createMutation.error.message
                    : 'Failed to process meeting'}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={createMutation.isPending}
                  leftIcon={createMutation.isPending ? undefined : <Brain className="h-4 w-4" />}
                  disabled={!title.trim()}
                >
                  {createMutation.isPending ? 'Processing...' : 'Process with AI'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  onClick={() => router.push('/meetings')}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </GlassCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-6 grid grid-cols-3 gap-4"
        >
          {[
            { icon: FileText, label: 'Transcript', desc: 'Paste meeting notes or auto-generated transcript' },
            { icon: Brain, label: 'AI Analysis', desc: 'Extracts decisions, tasks, risks, and summaries' },
            { icon: CheckCircle, label: 'Review & Approve', desc: 'Confirm AI output before publishing' },
          ].map((step, i) => {
            const Icon = step.icon
            return (
              <div key={step.label} className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
                <div className="flex h-10 w-10 mx-auto mb-3 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                  <Icon className="h-5 w-5 text-purple-400" />
                </div>
                <p className="text-xs font-semibold text-white mb-1">{i + 1}. {step.label}</p>
                <p className="text-xs text-white/40">{step.desc}</p>
              </div>
            )
          })}
        </motion.div>
      </div>
    </DashboardLayout>
  )
}
