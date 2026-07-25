'use client'

import { useRouter } from 'next/navigation'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface PageEmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
}

export function PageEmptyState({ icon, title, description, actionLabel, actionHref }: PageEmptyStateProps) {
  const router = useRouter()

  return (
    <GlassCard className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-white/20 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-white/40 max-w-md mb-6">{description}</p>
      {actionLabel && actionHref && (
        <Button
          variant="primary"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => router.push(actionHref)}
        >
          {actionLabel}
        </Button>
      )}
    </GlassCard>
  )
}
