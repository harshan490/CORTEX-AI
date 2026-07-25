'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Brain, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cortex-darker">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-6"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 shadow-lg shadow-purple-500/25">
          <Brain className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-6xl font-bold text-white">404</h1>
        <p className="text-lg text-white/50">Page not found</p>
        <p className="text-sm text-white/30 max-w-md text-center">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link href="/dashboard">
          <Button variant="primary" leftIcon={<Home className="h-4 w-4" />}>
            Back to Dashboard
          </Button>
        </Link>
      </motion.div>
    </div>
  )
}
