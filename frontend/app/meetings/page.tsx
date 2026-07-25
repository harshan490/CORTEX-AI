'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Plus,
  Search,
  Video,
  Clock,
  Users,
  List,
  Grid,
  ArrowUpDown,
  Calendar,
  Brain,
  RefreshCw,
} from 'lucide-react'
import { cn, formatDate, truncate } from '@/lib/utils'
import { GlassCard } from '@/components/ui/glass-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { useStore as useAppStore } from '@/lib/store'
import { api } from '@/lib/api'
import type { MeetingStatus } from '@/types'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

const statusConfig: Record<MeetingStatus, { variant: 'success' | 'warning' | 'info' | 'danger' | 'default'; label: string }> = {
  approved: { variant: 'success', label: 'Approved' },
  awaiting_review: { variant: 'warning', label: 'Awaiting Review' },
  processing: { variant: 'info', label: 'Processing' },
  rejected: { variant: 'danger', label: 'Rejected' },
  failed: { variant: 'danger', label: 'Failed' },
  archived: { variant: 'default', label: 'Archived' },
}

export default function MeetingsPage() {
  const router = useRouter()
  const isAuthenticated = useAppStore((s) => s.isAuthenticated)

  useEffect(() => {
    if (!isAuthenticated) router.push('/auth')
  }, [isAuthenticated, router])

  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<'date' | 'title'>('date')
  const [page, setPage] = useState(1)
  const perPage = 12

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['meetings', { page, perPage, search: searchTerm }],
    queryFn: () =>
      api.listMeetings({
        search: searchTerm || undefined,
        page,
        pageSize: perPage,
      }),
    staleTime: 30_000,
  })

  const meetings = data?.meetings ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / perPage)

  const sorted = [...meetings].sort((a, b) => {
    if (sortBy === 'title') return a.title.localeCompare(b.title)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return (
    <DashboardLayout title="Meetings">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">All Meetings</h2>
            <p className="text-white/50 mt-1 text-sm">{total} meetings found</p>
          </div>
          <Button
            variant="primary"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => router.push('/meetings/new')}
          >
            New Meeting
          </Button>
        </motion.div>

        <motion.div variants={itemVariants} className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] max-w-sm">
            <Input
              placeholder="Search meetings..."
              icon={<Search className="h-4 w-4" />}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setPage(1)
              }}
            />
          </div>
          <button
            onClick={() => setSortBy(sortBy === 'date' ? 'title' : 'date')}
            className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all"
          >
            <ArrowUpDown className="h-4 w-4" />
            {sortBy === 'date' ? 'Date' : 'Title'}
          </button>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <div className="flex items-center rounded-xl border border-white/10 overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={cn('p-2.5 transition-colors', viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70')}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn('p-2.5 transition-colors', viewMode === 'list' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70')}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </motion.div>

        {error && (
          <motion.div variants={itemVariants} className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            Failed to load meetings: {error instanceof Error ? error.message : 'Unknown error'}
          </motion.div>
        )}

        {isLoading && (
          <div className={cn(
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'
              : 'space-y-2'
          )}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="h-4 w-24 rounded bg-white/10 mb-3" />
                <div className="h-5 w-3/4 rounded bg-white/10 mb-2" />
                <div className="h-4 w-full rounded bg-white/10 mb-4" />
                <div className="h-3 w-1/2 rounded bg-white/10" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && sorted.length === 0 && (
          <motion.div variants={itemVariants} className="flex flex-col items-center justify-center py-20">
            <Brain className="h-16 w-16 text-purple-400/30 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No meetings yet</h3>
            <p className="text-white/40 text-sm mb-6">Upload a transcript or record a meeting to get started.</p>
            <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => router.push('/meetings/new')}>
              Create First Meeting
            </Button>
          </motion.div>
        )}

        {!isLoading && sorted.length > 0 && (
          viewMode === 'grid' ? (
            <motion.div
              variants={containerVariants}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
            >
              {sorted.map((meeting) => {
                const config = statusConfig[meeting.status] ?? statusConfig.archived
                return (
                  <motion.div key={meeting.id} variants={itemVariants}>
                    <GlassCard
                      hover
                      className="h-full cursor-pointer"
                      onClick={() => router.push(`/meetings/${meeting.id}`)}
                    >
                      <div className="flex flex-col h-full">
                        <div className="flex items-start justify-between mb-3">
                          <Badge variant={config.variant} size="sm" dot={meeting.status === 'processing'}>
                            {config.label}
                          </Badge>
                          <div className="flex items-center gap-1 text-white/30">
                            <Users className="h-3.5 w-3.5" />
                            <span className="text-xs">{meeting.participants.length}</span>
                          </div>
                        </div>
                        <h3 className="text-base font-semibold text-white mb-2 line-clamp-2">
                          {meeting.title}
                        </h3>
                        <p className="text-sm text-white/50 mb-4 flex-1 line-clamp-2">
                          {truncate(meeting.executiveSummary ?? meeting.description ?? '—', 100)}
                        </p>
                        <div className="flex items-center justify-between pt-3 border-t border-white/5">
                          <div className="flex items-center gap-2 text-white/40 text-xs">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(meeting.createdAt, 'MMM d, yyyy')}
                          </div>
                          <div className="flex items-center gap-1.5 text-white/40 text-xs">
                            {meeting.actionItems.length > 0 && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {meeting.actionItems.length} tasks
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                )
              })}
            </motion.div>
          ) : (
            <motion.div variants={containerVariants} className="space-y-2">
              {sorted.map((meeting) => {
                const config = statusConfig[meeting.status] ?? statusConfig.archived
                return (
                  <motion.div
                    key={meeting.id}
                    variants={itemVariants}
                    whileHover={{ x: 4 }}
                    onClick={() => router.push(`/meetings/${meeting.id}`)}
                    className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:bg-white/[0.05] hover:border-purple-500/20 cursor-pointer transition-all"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                      <Video className="h-5 w-5 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">{meeting.title}</p>
                        <Badge variant={config.variant} size="sm">{config.label}</Badge>
                      </div>
                      <p className="text-xs text-white/40 mt-0.5 truncate">
                        {truncate(meeting.executiveSummary ?? meeting.description ?? '—', 80)}
                      </p>
                    </div>
                    <div className="hidden sm:flex items-center gap-4 text-xs text-white/30 shrink-0">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(meeting.createdAt, 'MMM d')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {meeting.participants.length}
                      </span>
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          )
        )}

        {totalPages > 1 && (
          <motion.div variants={itemVariants} className="flex items-center justify-center gap-2 pt-4">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/50 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={cn(
                  'h-8 w-8 rounded-lg text-sm font-medium transition-all',
                  p === page
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'text-white/40 hover:text-white hover:bg-white/5 border border-transparent'
                )}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/50 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Next
            </button>
          </motion.div>
        )}
      </motion.div>
    </DashboardLayout>
  )
}
