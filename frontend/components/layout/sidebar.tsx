'use client'

import { useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Video,
  BarChart3,
  GitBranch,
  Clock,
  Search,
  Settings,
  Brain,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore as useAppStore } from '@/lib/store'
import { Avatar } from '@/components/ui/avatar'

interface NavItem {
  label: string
  icon: typeof LayoutDashboard
  path: string
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Meetings', icon: Video, path: '/meetings' },
  { label: 'Analytics', icon: BarChart3, path: '/analytics' },
  { label: 'Workflows', icon: GitBranch, path: '/workflows' },
  { label: 'History', icon: Clock, path: '/history' },
  { label: 'Search', icon: Search, path: '/search' },
  { label: 'Settings', icon: Settings, path: '/settings' },
]

const sidebarVariants = {
  expanded: { width: 256 },
  collapsed: { width: 64 },
}

const itemVariants = {
  expanded: { opacity: 1, x: 0 },
  collapsed: { opacity: 0, x: -20 },
}

const itemIconVariants = {
  expanded: { x: 0 },
  collapsed: { x: 0 },
}

export function Sidebar() {
  const pathname = usePathname()
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const user = useAppStore((s) => s.user)
  const logout = useAppStore((s) => s.logout)

  const isActive = useCallback(
    (path: string) => {
      if (path === '/dashboard') return pathname === '/dashboard' || pathname === '/'
      return pathname.startsWith(path)
    },
    [pathname]
  )

  return (
    <motion.aside
      variants={sidebarVariants}
      animate={sidebarOpen ? 'expanded' : 'collapsed'}
      initial="expanded"
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col',
        'border-r border-white/10 bg-cortex-darker/80 backdrop-blur-2xl',
        'overflow-hidden'
      )}
    >
      <div className="flex h-16 items-center justify-between px-4 border-b border-white/5">
        <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 shadow-lg shadow-purple-500/25 shrink-0">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <motion.span
            variants={itemVariants}
            animate={sidebarOpen ? 'expanded' : 'collapsed'}
            className="text-sm font-bold tracking-wide text-white whitespace-nowrap"
          >
            CORTEX
          </motion.span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.path)
          const Icon = item.icon
          return (
            <Link key={item.path} href={item.path}>
              <motion.div
                whileHover={{ x: 4 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  'relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-200',
                  active
                    ? 'bg-gradient-to-r from-purple-500/15 to-blue-500/10 text-white'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                )}
              >
                {active && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-purple-500 to-blue-500 shadow-[0_0_8px_rgba(124,58,237,0.5)]"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                <div className="flex items-center justify-center w-5 h-5 shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <motion.span
                  variants={itemVariants}
                  animate={sidebarOpen ? 'expanded' : 'collapsed'}
                  className="text-sm font-medium whitespace-nowrap"
                >
                  {item.label}
                </motion.span>
              </motion.div>
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-white/5 p-3 space-y-3">
        {user && (
          <motion.div
            variants={itemVariants}
            animate={sidebarOpen ? 'expanded' : 'collapsed'}
            className="flex items-center gap-3 rounded-xl px-3 py-2"
          >
            <Avatar
              fallback={user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              alt={user.name}
              size="sm"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-white/40 truncate">{user.role}</p>
            </div>
          </motion.div>
        )}

        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-colors duration-200"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <motion.span
            variants={itemVariants}
            animate={sidebarOpen ? 'expanded' : 'collapsed'}
            className="text-sm font-medium whitespace-nowrap"
          >
            Logout
          </motion.span>
        </button>

        <button
          onClick={toggleSidebar}
          className="flex w-full items-center justify-center rounded-xl py-2 text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors duration-200"
        >
          {sidebarOpen ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      </div>
    </motion.aside>
  )
}
