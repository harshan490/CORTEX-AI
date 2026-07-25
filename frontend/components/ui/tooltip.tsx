'use client'

import { cn } from '../../lib/utils'

interface TooltipProps {
  content: string
  children: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
  contentClassName?: string
}

export function Tooltip({
  content,
  children,
  position = 'top',
  className,
  contentClassName,
}: TooltipProps) {
  const positionStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  const arrowStyles = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-white/10',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-white/10',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-white/10',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-white/10',
  }

  const arrowBorder = {
    top: 'border-4',
    bottom: 'border-4',
    left: 'border-4',
    right: 'border-4',
  }

  return (
    <div className={cn('group relative inline-flex', className)}>
      {children}
      <div
        className={cn(
          'pointer-events-none absolute z-50',
          'opacity-0 transition-all duration-200 group-hover:opacity-100',
          'translate-y-1 group-hover:translate-y-0',
          positionStyles[position],
          contentClassName
        )}
      >
        <div
          className={cn(
            'whitespace-nowrap rounded-lg border border-white/10 bg-cortex-dark/95 px-3 py-1.5 text-xs text-white/80 backdrop-blur-xl shadow-lg'
          )}
        >
          {content}
          <div
            className={cn(
              'absolute',
              arrowStyles[position],
              arrowBorder[position]
            )}
          />
        </div>
      </div>
    </div>
  )
}
