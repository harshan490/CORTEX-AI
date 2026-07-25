'use client'

import { useState } from 'react'
import { cn } from '../../lib/utils'

const sizeStyles = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
}

const statusSizes = {
  xs: 'h-1.5 w-1.5 ring-1',
  sm: 'h-2 w-2 ring-1',
  md: 'h-2.5 w-2.5 ring-2',
  lg: 'h-3 w-3 ring-2',
  xl: 'h-3.5 w-3.5 ring-2',
}

const ringWidths = {
  xs: 'ring-1',
  sm: 'ring-2',
  md: 'ring-2',
  lg: 'ring-3',
  xl: 'ring-3',
}

interface AvatarProps {
  src?: string
  alt?: string
  fallback?: string
  size?: keyof typeof sizeStyles
  status?: 'online' | 'offline' | 'busy' | 'away'
  className?: string
  ring?: boolean
}

export function Avatar({
  src,
  alt = '',
  fallback,
  size = 'md',
  status,
  className,
  ring = false,
}: AvatarProps) {
  const [imgError, setImgError] = useState(false)

  const initials = fallback || getInitials(alt)

  return (
    <div className="relative inline-flex shrink-0">
      <div
        className={cn(
          'relative flex items-center justify-center overflow-hidden rounded-full bg-white/10 text-white/80',
          sizeStyles[size],
          ring && 'ring-2 ring-purple-500/40 ring-offset-2 ring-offset-cortex-darker',
          !src || imgError ? '' : '',
          className
        )}
      >
        {src && !imgError ? (
          <img
            src={src}
            alt={alt}
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="font-medium uppercase leading-none">
            {initials || '?'}
          </span>
        )}
      </div>
      {status && (
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 rounded-full border-cortex-darker',
            statusSizes[size],
            status === 'online' && 'bg-emerald-400',
            status === 'offline' && 'bg-white/30',
            status === 'busy' && 'bg-red-400',
            status === 'away' && 'bg-amber-400',
          )}
        />
      )}
    </div>
  )
}

function getInitials(name: string): string {
  if (!name) return ''
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

interface AvatarGroupProps {
  children: React.ReactNode
  max?: number
  size?: keyof typeof sizeStyles
  className?: string
}

export function AvatarGroup({
  children,
  max = 4,
  size = 'md',
  className,
}: AvatarGroupProps) {
  const items = Array.isArray(children) ? children : [children]
  const visible = items.slice(0, max)
  const overflow = items.length - max

  return (
    <div className={cn('flex -space-x-2', className)}>
      {visible.map((child, i) => (
        <div key={i} className="ring-2 ring-cortex-darker rounded-full">
          {child}
        </div>
      ))}
      {overflow > 0 && (
        <div
          className={cn(
            'flex items-center justify-center rounded-full bg-white/10 text-xs font-medium text-white/60 ring-2 ring-cortex-darker',
            sizeStyles[size]
          )}
        >
          +{overflow}
        </div>
      )}
    </div>
  )
}
