'use client'

import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'

interface PageErrorStateProps {
  error: Error
  onRetry?: () => void
}

export function PageErrorState({ error, onRetry }: PageErrorStateProps) {
  const isNetworkError = error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed')
  const Icon = isNetworkError ? WifiOff : AlertTriangle

  return (
    <GlassCard className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 mb-4">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">
        {isNetworkError ? 'Backend Unavailable' : 'Something went wrong'}
      </h3>
      <p className="text-sm text-white/40 max-w-md mb-6">
        {isNetworkError
          ? 'Unable to reach the Cortex API. Check that the backend is running and try again.'
          : error.message}
      </p>
      {onRetry && (
        <Button
          variant="secondary"
          leftIcon={<RefreshCw className="h-4 w-4" />}
          onClick={onRetry}
        >
          Try Again
        </Button>
      )}
    </GlassCard>
  )
}
