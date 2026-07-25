'use client'

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { LoadingSpinner } from './loading-spinner'

const variantStyles = {
  primary:
    'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:from-purple-500 hover:to-blue-500 active:shadow-purple-500/20 border-0',
  secondary:
    'glass text-white border border-white/10 hover:bg-white/10 hover:border-purple-500/30 active:bg-white/5',
  ghost:
    'text-white/80 hover:text-white hover:bg-white/10 active:bg-white/5 border border-transparent',
  danger:
    'bg-red-600/90 text-white hover:bg-red-500 active:bg-red-700 border border-red-500/20 shadow-lg shadow-red-500/20',
  outline:
    'border border-white/20 text-white bg-transparent hover:bg-white/5 hover:border-purple-500/30 active:bg-white/10',
}

const sizeStyles = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-base gap-2.5 rounded-xl',
}

const spinnerSizes = {
  sm: 'sm',
  md: 'md',
  lg: 'md',
} as const

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantStyles
  size?: keyof typeof sizeStyles
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'relative inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:ring-offset-2 focus:ring-offset-cortex-darker disabled:pointer-events-none disabled:opacity-50',
          variantStyles[variant],
          sizeStyles[size],
          variant === 'primary' &&
            !disabled &&
            'hover:shadow-[0_0_20px_rgba(124,58,237,0.4)]',
          className
        )}
        {...props}
      >
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <LoadingSpinner
              size={spinnerSizes[size]}
              color={variant === 'primary' ? 'white' : 'purple'}
            />
          </span>
        )}
        <span className={cn('flex items-center gap-2', loading && 'invisible')}>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </span>
      </button>
    )
  }
)

Button.displayName = 'Button'
