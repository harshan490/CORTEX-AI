'use client'

import { cn } from '@/lib/utils'
import type { WorkflowStatus } from '@/types/workflows'

const filterOptions: { value: WorkflowStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'processing', label: 'Processing' },
  { value: 'awaiting_review', label: 'Awaiting Review' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
]

interface WorkflowFiltersProps {
  selected: WorkflowStatus | 'all'
  onChange: (status: WorkflowStatus | 'all') => void
}

export function WorkflowFilters({ selected, onChange }: WorkflowFiltersProps) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap" role="radiogroup" aria-label="Filter workflows by status">
      {filterOptions.map((opt) => (
        <button
          key={opt.value}
          role="radio"
          aria-checked={selected === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'px-3 py-1.5 text-xs rounded-lg font-medium transition-colors',
            selected === opt.value
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
              : 'text-white/40 hover:text-white/70 hover:bg-white/5 border border-transparent'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
