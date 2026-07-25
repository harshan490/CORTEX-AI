'use client'

import { cn } from '../../lib/utils'

const sizeStyles = {
  xs: 'h-3 w-3 border',
  sm: 'h-4 w-4 border-[1.5px]',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-2',
  xl: 'h-10 w-10 border-[3px]',
}

const colorStyles = {
  purple: 'border-white/10 border-t-purple-500',
  white: 'border-white/20 border-t-white',
  blue: 'border-white/10 border-t-blue-500',
}

interface LoadingSpinnerProps {
  size?: keyof typeof sizeStyles
  color?: keyof typeof colorStyles
  text?: string
  className?: string
}

export function LoadingSpinner({
  size = 'md',
  color = 'purple',
  text,
  className,
}: LoadingSpinnerProps) {
  return (
    <div className={cn('inline-flex items-center gap-3', className)}>
      <div
        className={cn(
          'animate-spin rounded-full',
          sizeStyles[size],
          colorStyles[color]
        )}
      />
      {text && (
        <span className="text-sm text-white/60">{text}</span>
      )}
    </div>
  )
}

interface FullscreenLoaderProps {
  text?: string
  backdrop?: boolean
  className?: string
}

export function FullscreenLoader({
  text = 'Loading...',
  backdrop = true,
  className,
}: FullscreenLoaderProps) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center gap-4',
        backdrop && 'bg-cortex-darker/80 backdrop-blur-sm',
        className
      )}
    >
      <LoadingSpinner size="xl" color="purple" />
      {text && (
        <p className="text-sm text-white/50 animate-pulse">{text}</p>
      )}
    </div>
  )
}
