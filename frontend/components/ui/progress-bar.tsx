'use client'

import { useMemo } from 'react'
import { cn } from '../../lib/utils'

const variantStyles = {
  default: 'bg-gradient-to-r from-purple-500 to-purple-400',
  success: 'bg-gradient-to-r from-emerald-500 to-emerald-400',
  warning: 'bg-gradient-to-r from-amber-500 to-amber-400',
  danger: 'bg-gradient-to-r from-red-500 to-red-400',
}

const sizeStyles = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
}

const labelSizes = {
  sm: 'text-[10px]',
  md: 'text-xs',
  lg: 'text-sm',
}

interface ProgressBarProps {
  value: number
  max?: number
  variant?: keyof typeof variantStyles
  size?: keyof typeof sizeStyles
  showLabel?: boolean
  showPercentage?: boolean
  label?: string
  className?: string
  animated?: boolean
  gradient?: boolean
}

export function ProgressBar({
  value,
  max = 100,
  variant = 'default',
  size = 'md',
  showLabel = false,
  showPercentage = false,
  label,
  className,
  animated = true,
  gradient = true,
}: ProgressBarProps) {
  const percentage = useMemo(() => {
    const pct = Math.min(100, Math.max(0, (value / max) * 100))
    return Math.round(pct)
  }, [value, max])

  return (
    <div className={cn('w-full', className)}>
      {(showLabel || showPercentage) && (
        <div className="mb-1.5 flex items-center justify-between">
          {showLabel && (
            <span className={cn('font-medium text-white/70', labelSizes[size])}>
              {label || `${percentage}%`}
            </span>
          )}
          {showPercentage && (
            <span className={cn('text-white/50', labelSizes[size])}>
              {percentage}%
            </span>
          )}
        </div>
      )}
      <div
        className={cn(
          'w-full overflow-hidden rounded-full bg-white/5',
          sizeStyles[size]
        )}
      >
        <div
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          className={cn(
            'h-full rounded-full',
            variantStyles[variant],
            animated && 'transition-all duration-700 ease-out'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
