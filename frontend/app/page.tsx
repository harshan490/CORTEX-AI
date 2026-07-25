'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStore as useAppStore } from '@/lib/store'

export default function RootPage() {
  const router = useRouter()
  const isAuthenticated = useAppStore((s) => s.isAuthenticated)

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard')
    } else {
      router.replace('/auth')
    }
  }, [isAuthenticated, router])

  return null
}
