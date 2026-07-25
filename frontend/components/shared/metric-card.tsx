'use client'

import { cn } from '@/lib/utils'
import { GlassCard } from '@/components/ui/glass-card'

interface MetricCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  className?: string
}

const variantColors = {
  default: 'text-purple-400',
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  danger: 'text-red-400',
  info: 'text-blue-400',
}

export function MetricCard({ label, value, icon, variant = 'default', className }: MetricCardProps) {
  return (
    <GlassCard className={cn('flex items-center gap-3 p-4', className)}>
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5', variantColors[variant])}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
        <p className="text-xs text-white/40 truncate">{label}</p>
      </div>
    </GlassCard>
  )
}
