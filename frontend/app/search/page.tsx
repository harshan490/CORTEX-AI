'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  X,
  Video,
  GitBranch,
  CheckCircle2,
  FileText,
  Calendar,
  Users,
  Filter,
  Star,
  Clock,
  TrendingUp,
  Sparkles,
  MessageSquare,
} from 'lucide-react'
import { cn, formatDate, formatRelativeTime, truncate } from '@/lib/utils'
import { GlassCard } from '@/components/ui/glass-card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { mockMeetings, mockTasks } from '@/lib/mock-data'

const recentSearches = [
  'authentication implementation',
  'Q4 product strategy decisions',
  'action items for Alice',
  'mobile SDK timeline',
  'enterprise SSO status',
]

interface SearchResult {
  id: string
  type: 'meeting' | 'decision' | 'task' | 'note'
  title: string
  excerpt: string
  date: string
  relevance: number
  source: string
  participants?: string[]
}

const mockResults: SearchResult[] = [
  { id: 'res-1', type: 'meeting', title: 'Q4 Product Strategy Review', excerpt: 'Finalized Q4 roadmap focusing on AI-powered analytics and enterprise integrations. Decided to push mobile SDK to Q1 2027.', date: '2026-07-24T14:00:00Z', relevance: 98, source: 'Meeting', participants: ['Alice', 'Bob', 'Carol', 'Dave'] },
  { id: 'res-2', type: 'decision', title: 'AI Analytics Module Approved', excerpt: 'Decision to launch AI Analytics module in October 2026. 200 engineering hours allocated.', date: '2026-07-24T14:30:00Z', relevance: 95, source: 'Decision' },
  { id: 'res-3', type: 'task', title: 'Draft Detailed AI Analytics Spec', excerpt: 'Create comprehensive specification document for the AI Analytics module. Include architecture, timeline, and resource requirements.', date: '2026-07-24T14:45:00Z', relevance: 92, source: 'Task' },
  { id: 'res-4', type: 'meeting', title: 'Sprint Planning - Week 30', excerpt: 'Planned sprint 30 with focus on bug fixes, performance improvements, and UI polish for the dashboard redesign.', date: '2026-07-25T09:00:00Z', relevance: 89, source: 'Meeting', participants: ['Alice', 'Bob', 'Eve', 'Frank'] },
  { id: 'res-5', type: 'decision', title: 'Enterprise SSO Integration Timeline', excerpt: 'Enterprise SSO integration to be completed by November 15. Bob assigned to evaluate vendors.', date: '2026-07-24T15:00:00Z', relevance: 87, source: 'Decision' },
  { id: 'res-6', type: 'task', title: 'Enterprise SSO - Evaluate Vendors', excerpt: 'Research and evaluate SSO vendors for enterprise integration. Must support SAML and OIDC protocols.', date: '2026-07-24T14:50:00Z', relevance: 85, source: 'Task' },
  { id: 'res-7', type: 'note', title: 'Acme Corp Account Risk', excerpt: 'Account at risk due to competitor offering lower price. Fast-track custom report builder feature requested.', date: '2026-07-23T16:00:00Z', relevance: 82, source: 'Note' },
  { id: 'res-8', type: 'meeting', title: 'Architecture Review - AI Pipeline', excerpt: 'Reviewed proposed architecture for real-time AI processing pipeline. Approved event-driven approach with Kafka.', date: '2026-07-26T11:00:00Z', relevance: 78, source: 'Meeting', participants: ['Alice', 'Bob', 'Eve', 'Hank'] },
  { id: 'res-9', type: 'decision', title: 'Event-Driven Architecture Approved', excerpt: 'Adopt event-driven architecture with Kafka. Use Kubernetes for orchestration. Redis for caching layer.', date: '2026-07-26T11:30:00Z', relevance: 76, source: 'Decision' },
  { id: 'res-10', type: 'task', title: 'OAuth Integration with Google', excerpt: 'Implement sign-in with Google using NextAuth. Critical priority for enterprise authentication flow.', date: '2026-07-19T10:00:00Z', relevance: 74, source: 'Task' },
]

const typeConfig = {
  meeting: { icon: Video, label: 'Meeting', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  decision: { icon: GitBranch, label: 'Decision', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  task: { icon: CheckCircle2, label: 'Task', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  note: { icon: FileText, label: 'Note', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
}

const typeColors = {
  meeting: '#7C3AED',
  decision: '#10B981',
  task: '#3B82F6',
  note: '#F59E0B',
}

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)
  return parts.map((part, i) =>
    regex.test(part) ? (
      <span key={i} className="bg-purple-500/30 text-purple-200 rounded px-0.5">{part}</span>
    ) : (
      part
    )
  )
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { transition: { staggerChildren: 0.05 } },
}

const resultVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filterType, setFilterType] = useState<string[]>([])
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery)
    if (!searchQuery.trim()) {
      setResults([])
      return
    }
    setIsSearching(true)
    setTimeout(() => {
      const q = searchQuery.toLowerCase()
      let filtered = mockResults.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.excerpt.toLowerCase().includes(q) ||
          r.source.toLowerCase().includes(q)
      )
      if (filterType.length > 0) {
        filtered = filtered.filter((r) => filterType.includes(r.type))
      }
      setResults(filtered)
      setIsSearching(false)
    }, 600)
  }

  const handleRecentSearch = (term: string) => {
    setQuery(term)
    handleSearch(term)
  }

  const toggleFilter = (type: string) => {
    setFilterType((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {}
    results.forEach((r) => {
      const key = r.type === 'meeting' ? 'Meetings' : r.type === 'decision' ? 'Decisions' : r.type === 'task' ? 'Tasks' : 'Notes'
      if (!groups[key]) groups[key] = []
      groups[key].push(r)
    })
    return groups
  }, [results])

  const filterOptions = [
    { id: 'meeting', label: 'Meetings', icon: Video },
    { id: 'decision', label: 'Decisions', icon: GitBranch },
    { id: 'task', label: 'Tasks', icon: CheckCircle2 },
    { id: 'note', label: 'Notes', icon: FileText },
  ]

  return (
    <DashboardLayout title="Search">
      <div className="max-w-5xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-8 pb-4"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-2xl blur-3xl" />
            <div className="relative">
              <div className={cn(
                'flex items-center gap-3 rounded-2xl border bg-white/[0.04] px-5 py-4',
                'backdrop-blur-2xl transition-all duration-300',
                query ? 'border-purple-500/40 shadow-[0_0_30px_rgba(124,58,237,0.15)]' : 'border-white/10 hover:border-white/20'
              )}>
                <Search className="h-6 w-6 text-white/30 shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Ask anything... &quot;What did we decide about authentication?&quot;"
                  className="flex-1 bg-transparent text-lg text-white placeholder:text-white/20 outline-none"
                />
                {query && (
                  <button
                    onClick={() => { setQuery(''); setResults([]) }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {!query && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-6"
            >
              <p className="text-xs text-white/30 mb-3 font-medium uppercase tracking-wider">Recent Searches</p>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((term) => (
                  <button
                    key={term}
                    onClick={() => handleRecentSearch(term)}
                    className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/50 hover:text-white hover:border-purple-500/30 hover:bg-purple-500/10 transition-all"
                  >
                    <Clock className="h-3 w-3" />
                    {term}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>

        <div className="flex items-start gap-6">
          {query && results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="hidden lg:block w-56 shrink-0"
            >
              <GlassCard className="!p-4 sticky top-24">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-white/60" />
                    <h3 className="text-sm font-semibold text-white">Filters</h3>
                  </div>
                  {filterType.length > 0 && (
                    <button
                      onClick={() => setFilterType([])}
                      className="text-[10px] text-purple-400 hover:text-purple-300"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  {filterOptions.map((opt) => {
                    const Icon = opt.icon
                    const isActive = filterType.includes(opt.id)
                    return (
                      <button
                        key={opt.id}
                        onClick={() => toggleFilter(opt.id)}
                        className={cn(
                          'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all',
                          isActive
                            ? 'bg-purple-500/15 text-purple-300'
                            : 'text-white/50 hover:text-white hover:bg-white/5'
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {opt.label}
                        {isActive && <X className="h-3 w-3 ml-auto" />}
                      </button>
                    )
                  })}
                </div>
                <div className="mt-4 pt-4 border-t border-white/5">
                  <p className="text-[10px] text-white/30 font-medium mb-2">Date Range</p>
                  <div className="space-y-1">
                    {['Today', 'This Week', 'This Month', 'All Time'].map((range) => (
                      <button
                        key={range}
                        className="w-full text-left rounded-lg px-3 py-1.5 text-xs text-white/40 hover:text-white hover:bg-white/5 transition-all"
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}

          <div className="flex-1 min-w-0">
            {isSearching && (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="h-2 w-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="h-2 w-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <p className="text-sm text-white/40">Searching across meetings, decisions, tasks...</p>
                </div>
              </div>
            )}

            {!isSearching && results.length > 0 && (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-6"
              >
                <p className="text-sm text-white/40">
                  Found <span className="text-white font-medium">{results.length}</span> results for &ldquo;{query}&rdquo;
                </p>
                {Object.entries(groupedResults).map(([group, items]) => (
                  <div key={group}>
                    <h3 className="text-sm font-semibold text-white/60 mb-3 flex items-center gap-2">
                      <span className="h-4 w-0.5 rounded-full bg-purple-500" />
                      {group}
                      <span className="text-xs text-white/30">({items.length})</span>
                    </h3>
                    <div className="space-y-2">
                      {items.map((result) => {
                        const config = typeConfig[result.type]
                        const Icon = config.icon
                        return (
                          <motion.div
                            key={result.id}
                            variants={resultVariants}
                            whileHover={{ x: 4 }}
                            className="group cursor-pointer"
                          >
                            <GlassCard className="!p-4 hover:border-purple-500/20 transition-all duration-200">
                              <div className="flex items-start gap-4">
                                <div className={cn(
                                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border',
                                  config.color
                                )}>
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors">
                                      {highlightMatch(result.title, query)}
                                    </h4>
                                    <Badge variant="default" size="sm" className={cn(config.color)}>
                                      {config.label}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-white/50 mt-1.5 leading-relaxed">
                                    {highlightMatch(truncate(result.excerpt, 150), query)}
                                  </p>
                                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                                    <span className="flex items-center gap-1 text-[10px] text-white/30">
                                      <Calendar className="h-3 w-3" />
                                      {formatRelativeTime(result.date)}
                                    </span>
                                    {result.participants && (
                                      <span className="flex items-center gap-1 text-[10px] text-white/30">
                                        <Users className="h-3 w-3" />
                                        {result.participants.join(', ')}
                                      </span>
                                    )}
                                    <span className="flex items-center gap-1 text-[10px]">
                                      <Star className="h-3 w-3 text-amber-400" />
                                      <span className="text-amber-400/70">{result.relevance}% match</span>
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </GlassCard>
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {!isSearching && query && results.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-20 text-center"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 mb-4">
                  <Search className="h-8 w-8 text-white/20" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No results found</h3>
                <p className="text-sm text-white/40 max-w-md mb-6">
                  We couldn&apos;t find any matches for &ldquo;{query}&rdquo;. Try adjusting your search terms or filters.
                </p>
                <div className="space-y-3">
                  <p className="text-xs text-white/30 font-medium">Suggestions:</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {['enterprise SSO', 'AI Analytics', 'sprint planning', 'mobile SDK', 'action items'].map((s) => (
                      <button
                        key={s}
                        onClick={() => handleRecentSearch(s)}
                        className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/50 hover:text-white hover:border-purple-500/30 transition-all"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {!query && !isSearching && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8"
              >
                {[
                  { icon: MessageSquare, title: 'Search Meetings', desc: 'Find specific meetings, discussions, and outcomes' },
                  { icon: GitBranch, title: 'Find Decisions', desc: 'Look up decisions made across all meetings' },
                  { icon: CheckCircle2, title: 'Track Tasks', desc: 'Search for action items and their status' },
                ].map((item) => {
                  const Icon = item.icon
                  return (
                    <GlassCard key={item.title} hover className="text-center !p-6">
                      <div className="flex justify-center mb-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                          <Icon className="h-6 w-6 text-purple-400" />
                        </div>
                      </div>
                      <h4 className="text-sm font-semibold text-white mb-1">{item.title}</h4>
                      <p className="text-xs text-white/40">{item.desc}</p>
                    </GlassCard>
                  )
                })}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
