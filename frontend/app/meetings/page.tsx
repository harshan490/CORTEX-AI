'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
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
} from 'lucide-react'
import { cn, formatDate, truncate } from '@/lib/utils'
import { GlassCard } from '@/components/ui/glass-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { mockMeetings } from '@/lib/mock-data'

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

const statusConfig = {
  completed: { variant: 'success' as const, label: 'Completed' },
  'in-progress': { variant: 'warning' as const, label: 'In Progress' },
  scheduled: { variant: 'info' as const, label: 'Scheduled' },
  cancelled: { variant: 'danger' as const, label: 'Cancelled' },
}

export default function MeetingsPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<'date' | 'title'>('date')
  const [page, setPage] = useState(1)
  const perPage = 6

  const filteredMeetings = useMemo(() => {
    let result = [...mockMeetings]
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (m) =>
          m.title.toLowerCase().includes(term) ||
          m.summary.toLowerCase().includes(term)
      )
    }
    result.sort((a, b) => {
      if (sortBy === 'date') return new Date(b.date).getTime() - new Date(a.date).getTime()
      return a.title.localeCompare(b.title)
    })
    return result
  }, [searchTerm, sortBy])

  const totalPages = Math.ceil(filteredMeetings.length / perPage)
  const paginatedMeetings = filteredMeetings.slice((page - 1) * perPage, page * perPage)

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
            <p className="text-white/50 mt-1 text-sm">{filteredMeetings.length} meetings found</p>
          </div>
          <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
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

        {viewMode === 'grid' ? (
          <motion.div
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
          >
            {paginatedMeetings.map((meeting) => {
              const config = statusConfig[meeting.status]
              return (
                <motion.div key={meeting.id} variants={itemVariants}>
                  <GlassCard
                    hover
                    className="h-full cursor-pointer"
                    onClick={() => router.push(`/meetings/${meeting.id}`)}
                  >
                    <div className="flex flex-col h-full">
                      <div className="flex items-start justify-between mb-3">
                        <Badge variant={config.variant} size="sm" dot>
                          {config.label}
                        </Badge>
                        <div className="flex items-center gap-1 text-white/30">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="text-xs">{Math.floor(meeting.duration / 60)}min</span>
                        </div>
                      </div>
                      <h3 className="text-base font-semibold text-white mb-2 line-clamp-2">
                        {meeting.title}
                      </h3>
                      <p className="text-sm text-white/50 mb-4 flex-1 line-clamp-2">
                        {truncate(meeting.summary, 100)}
                      </p>
                      <div className="flex items-center justify-between pt-3 border-t border-white/5">
                        <div className="flex items-center gap-2 text-white/40 text-xs">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(meeting.date, 'MMM d, yyyy')}
                        </div>
                        <div className="flex items-center gap-1.5 text-white/40 text-xs">
                          <Users className="h-3.5 w-3.5" />
                          {meeting.participants.length}
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
            {paginatedMeetings.map((meeting) => {
              const config = statusConfig[meeting.status]
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
                    <p className="text-xs text-white/40 mt-0.5 truncate">{truncate(meeting.summary, 80)}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-4 text-xs text-white/30 shrink-0">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(meeting.date, 'MMM d')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {Math.floor(meeting.duration / 60)}min
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
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
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
