'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Brain, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cortex-darker">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-6"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600 to-orange-600 shadow-lg shadow-red-500/25">
          <Brain className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-white">Something went wrong</h1>
        <p className="text-white/50 max-w-md text-center">
          {error.message || 'An unexpected error occurred.'}
        </p>
        <Button variant="primary" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={reset}>
          Try Again
        </Button>
      </motion.div>
    </div>
  )
}
