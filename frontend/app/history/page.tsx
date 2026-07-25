'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Clock,
  Search,
  Calendar,
  Download,
  Video,
  GitBranch,
  ListChecks,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { GlassCard } from '@/components/ui/glass-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { mockMeetings } from '@/lib/mock-data'

const now = new Date('2026-07-25')

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { transition: { staggerChildren: 0.05 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

const participantFilters = ['Alice Chen', 'Bob Martinez', 'Carol Williams', 'Dave Thompson', 'Eve Park']
const statusFilters = ['completed', 'in-progress', 'scheduled', 'cancelled']

export default function HistoryPage() {
  const router = useRouter()
  const [currentMonth, setCurrentMonth] = useState(6)
  const [currentYear, setCurrentYear] = useState(2026)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)

  const filteredMeetings = useMemo(() => {
    let result = [...mockMeetings]
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      result = result.filter((m) => m.title.toLowerCase().includes(q) || m.summary.toLowerCase().includes(q))
    }
    if (selectedParticipant) {
      result = result.filter((m) => m.participants.some((p) => p.toLowerCase().includes(selectedParticipant.toLowerCase())))
    }
    if (selectedStatus) {
      result = result.filter((m) => m.status === selectedStatus)
    }
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [searchTerm, selectedParticipant, selectedStatus])

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const meetingDates = useMemo(() => {
    const dates = new Set<string>()
    mockMeetings.forEach((m) => {
      const d = new Date(m.date)
      dates.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`)
    })
    return dates
  }, [])

  return (
    <DashboardLayout title="History">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Meeting History</h2>
            <p className="text-white/50 mt-1 text-sm">{filteredMeetings.length} meetings found</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Filter className="h-4 w-4" />}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filters
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="h-4 w-4" />}
            >
              Export
            </Button>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] max-w-sm">
            <Input
              placeholder="Search history..."
              icon={<Search className="h-4 w-4" />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 flex-wrap w-full sm:w-auto"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-white/40 mr-1">Participant:</span>
                {participantFilters.map((p) => (
                  <button
                    key={p}
                    onClick={() => setSelectedParticipant(selectedParticipant === p ? null : p)}
                    className={cn(
                      'px-2 py-1 text-[10px] rounded-md font-medium transition-colors',
                      selectedParticipant === p
                        ? 'bg-purple-500/20 text-purple-300'
                        : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                    )}
                  >
                    {p.split(' ')[0]}
                  </button>
                ))}
              </div>
              <div className="h-4 w-px bg-white/10" />
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-white/40 mr-1">Status:</span>
                {statusFilters.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedStatus(selectedStatus === s ? null : s)}
                    className={cn(
                      'px-2 py-1 text-[10px] rounded-md font-medium transition-colors',
                      selectedStatus === s
                        ? 'bg-purple-500/20 text-purple-300'
                        : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                    )}
                  >
                    {s === 'in-progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>

        <motion.div variants={itemVariants}>
          <GlassCard>
            <div className="flex items-center justify-between mb-6">
              <button onClick={prevMonth} className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h3 className="text-base font-semibold text-white">
                {monthNames[currentMonth]} {currentYear}
              </h3>
              <button onClick={nextMonth} className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {dayNames.map((day) => (
                <div key={day} className="text-center text-[10px] font-medium text-white/30 py-2">
                  {day}
                </div>
              ))}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const dateKey = `${currentYear}-${currentMonth}-${day}`
                const hasMeeting = meetingDates.has(dateKey)
                const isToday = day === now.getDate() && currentMonth === now.getMonth() && currentYear === now.getFullYear()

                return (
                  <div
                    key={day}
                    className={cn(
                      'relative flex items-center justify-center h-10 text-xs rounded-lg transition-all',
                      isToday
                        ? 'bg-purple-500/20 text-purple-300 font-bold'
                        : hasMeeting
                          ? 'bg-white/5 text-white/70 hover:bg-white/10 cursor-pointer'
                          : 'text-white/30 hover:bg-white/5'
                    )}
                  >
                    {day}
                    {hasMeeting && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-purple-400" />
                    )}
                  </div>
                )
              })}
            </div>
          </GlassCard>
        </motion.div>

        <motion.div variants={itemVariants}>
          <GlassCard>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Timeline</h3>
              <Badge variant="default" size="sm">{filteredMeetings.length} entries</Badge>
            </div>

            {filteredMeetings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="h-12 w-12 text-white/20 mb-3" />
                <p className="text-sm text-white/40">No meetings found matching your criteria</p>
              </div>
            ) : (
              <div className="space-y-0">
                {filteredMeetings.map((meeting, i) => {
                  const isLast = i === filteredMeetings.length - 1
                  const statusVariant = meeting.status === 'completed' ? 'success' as const
                    : meeting.status === 'in-progress' ? 'warning' as const
                    : meeting.status === 'scheduled' ? 'info' as const
                    : 'danger' as const

                  return (
                    <motion.div
                      key={meeting.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="relative flex gap-4 pb-6 last:pb-0 group cursor-pointer"
                      onClick={() => router.push(`/meetings/${meeting.id}`)}
                    >
                      {!isLast && (
                        <div className="absolute left-[23px] top-12 bottom-0 w-px bg-gradient-to-b from-white/10 to-transparent" />
                      )}
                      <div className="flex flex-col items-center">
                        <div className={cn(
                          'flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300',
                          meeting.status === 'completed'
                            ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-400'
                            : meeting.status === 'in-progress'
                              ? 'border-amber-500/30 bg-amber-500/20 text-amber-400'
                              : meeting.status === 'scheduled'
                                ? 'border-blue-500/30 bg-blue-500/20 text-blue-400'
                                : 'border-red-500/30 bg-red-500/20 text-red-400',
                          'group-hover:shadow-[0_0_12px_rgba(124,58,237,0.3)] group-hover:scale-110'
                        )}>
                          <Video className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 pt-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors">
                            {meeting.title}
                          </p>
                          <Badge variant={statusVariant} size="sm" dot={meeting.status === 'in-progress'}>
                            {meeting.status === 'in-progress' ? 'In Progress' : meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1.5 text-xs text-white/40 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(meeting.date, 'MMM d, yyyy · h:mm a')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {Math.floor(meeting.duration / 60)} min
                          </span>
                          <span className="flex items-center gap-1">
                            <GitBranch className="h-3.5 w-3.5" />
                            {meeting.decisions.length} decisions
                          </span>
                          <span className="flex items-center gap-1">
                            <ListChecks className="h-3.5 w-3.5" />
                            {meeting.actionItems.length} actions
                          </span>
                        </div>
                        <p className="text-xs text-white/30 mt-1.5 line-clamp-1">{meeting.summary}</p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </GlassCard>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  )
}
