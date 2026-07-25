'use client'

import { Search, SortAsc, SortDesc, Filter, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { HistoryFilters as HistoryFiltersType, HistorySortOrder } from '@/types/workflows'

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'approved', label: 'Approved' },
  { value: 'awaiting_review', label: 'Awaiting Review' },
  { value: 'processing', label: 'Processing' },
  { value: 'rejected', label: 'Rejected' },
]

interface HistoryFiltersProps {
  filters: HistoryFiltersType
  showFilters: boolean
  onToggleFilters: () => void
  onSearchChange: (search: string) => void
  onStatusChange: (status: string) => void
  onSortChange: (order: HistorySortOrder) => void
  onHighRiskChange: (highRisk: boolean) => void
  onDateFromChange: (date: string) => void
  onDateToChange: (date: string) => void
}

export function HistoryFiltersBar({
  filters,
  showFilters,
  onToggleFilters,
  onSearchChange,
  onStatusChange,
  onSortChange,
  onHighRiskChange,
  onDateFromChange,
  onDateToChange,
}: HistoryFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] max-w-sm">
          <Input
            placeholder="Search meetings..."
            icon={<Search className="h-4 w-4" />}
            value={filters.search ?? ''}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search history"
          />
        </div>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Filter className="h-4 w-4" />}
          onClick={onToggleFilters}
        >
          Filters
        </Button>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={filters.sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
          onClick={() => onSortChange(filters.sortOrder === 'asc' ? 'desc' : 'asc')}
          aria-label={`Sort ${filters.sortOrder === 'asc' ? 'newest first' : 'oldest first'}`}
        >
          {filters.sortOrder === 'asc' ? 'Oldest' : 'Newest'}
        </Button>
      </div>

      {showFilters && (
        <div className="flex items-center gap-3 flex-wrap rounded-xl bg-white/[0.02] border border-white/5 p-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-white/40">Status:</span>
            {statusOptions.map((opt) => {
              const isActive = opt.value === 'all'
                ? (!filters.status || filters.status.length === 0)
                : filters.status?.includes(opt.value)
              return (
                <button
                  key={opt.value}
                  onClick={() => onStatusChange(opt.value)}
                  className={cn(
                    'px-2 py-1 text-[10px] rounded-md font-medium transition-colors',
                    isActive
                      ? 'bg-purple-500/20 text-purple-300'
                      : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                  )}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>

          <div className="h-4 w-px bg-white/10 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">From:</span>
            <input
              type="date"
              value={filters.dateFrom ?? ''}
              onChange={(e) => onDateFromChange(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-[10px] text-white/60 focus:outline-none focus:border-purple-500/30"
              aria-label="Date from"
            />
            <span className="text-xs text-white/40">To:</span>
            <input
              type="date"
              value={filters.dateTo ?? ''}
              onChange={(e) => onDateToChange(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-[10px] text-white/60 focus:outline-none focus:border-purple-500/30"
              aria-label="Date to"
            />
          </div>

          <div className="h-4 w-px bg-white/10 hidden sm:block" />

          <button
            onClick={() => onHighRiskChange(!filters.highRiskOnly)}
            className={cn(
              'flex items-center gap-1 px-2 py-1 text-[10px] rounded-md font-medium transition-colors',
              filters.highRiskOnly
                ? 'bg-red-500/20 text-red-300'
                : 'text-white/40 hover:text-white/70 hover:bg-white/5'
            )}
          >
            <AlertTriangle className="h-3 w-3" />
            High Risk
          </button>
        </div>
      )}
    </div>
  )
}
