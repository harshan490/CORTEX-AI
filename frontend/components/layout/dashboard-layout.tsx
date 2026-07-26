'use client'

import { motion } from 'framer-motion'
import { useStore as useAppStore } from '@/lib/store'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

interface DashboardLayoutProps {
  children: React.ReactNode
  title?: string
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)

  return (
    <div className="relative min-h-screen bg-cortex-darker">
      <Sidebar />

      <motion.div
        initial={false}
        animate={{
          marginLeft: sidebarOpen ? 256 : 64,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="flex min-h-screen flex-col"
      >
        <Header title={title} />

        <main className="relative z-0 flex-1 overflow-y-auto p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        </main>
      </motion.div>
    </div>
  )
}
