'use client'

import { cn } from '../../lib/utils'

const statusConfig = {
  online: { bg: 'bg-emerald-400', label: 'Online' },
  offline: { bg: 'bg-white/30', label: 'Offline' },
  busy: { bg: 'bg-red-400', label: 'Busy' },
  away: { bg: 'bg-amber-400', label: 'Away' },
  idle: { bg: 'bg-yellow-400', label: 'Idle' },
}

interface StatusDotProps {
  status?: keyof typeof statusConfig
  className?: string
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = {
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
}

export function StatusDot({
  status = 'online',
  className,
  showLabel = false,
  size = 'md',
}: StatusDotProps) {
  const config = statusConfig[status]
  const isAnimated = status === 'online'

  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={cn(
          'relative inline-block rounded-full',
          sizeMap[size],
          config.bg,
          isAnimated &&
            'before:absolute before:inset-0 before:animate-ping before:rounded-full before:bg-emerald-400/60',
          className
        )}
      />
      {showLabel && (
        <span className="text-xs text-white/60">{config.label}</span>
      )}
    </span>
  )
}
