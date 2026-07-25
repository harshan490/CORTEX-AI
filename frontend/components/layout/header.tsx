'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Menu,
  Bell,
  Search,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore as useAppStore } from '@/lib/store'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

interface HeaderProps {
  title?: string
  className?: string
}

export function Header({ title, className }: HeaderProps) {
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const user = useAppStore((s) => s.user)
  const [showUserMenu, setShowUserMenu] = useState(false)

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-16 items-center justify-between px-6',
        'border-b border-white/10 bg-cortex-darker/70 backdrop-blur-2xl',
        className
      )}
    >
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors duration-200"
        >
          <Menu className="h-5 w-5" />
        </button>
        {title && (
          <motion.h1
            key={title}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-lg font-semibold text-white"
          >
            {title}
          </motion.h1>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button className="relative flex h-9 w-9 items-center justify-center rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors duration-200">
          <Search className="h-5 w-5" />
        </button>

        <button className="relative flex h-9 w-9 items-center justify-center rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors duration-200">
          <Bell className="h-5 w-5" />
          <Badge
            variant="danger"
            size="sm"
            className="absolute -right-0.5 -top-0.5 h-4 min-w-[16px] px-1 flex items-center justify-center text-[9px]"
          >
            3
          </Badge>
        </button>

        {user && (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 rounded-xl px-3 py-1.5 hover:bg-white/5 transition-colors duration-200"
            >
              <Avatar
                fallback={user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                alt={user.name}
                size="sm"
              />
              <span className="hidden sm:block text-sm font-medium text-white">{user.name}</span>
              <ChevronDown className="h-4 w-4 text-white/40" />
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 z-50 w-56 rounded-xl border border-white/10 bg-cortex-dark/95 p-2 shadow-2xl backdrop-blur-2xl"
                >
                  <div className="px-3 py-2 border-b border-white/5">
                    <p className="text-sm font-medium text-white">{user.name}</p>
                    <p className="text-xs text-white/40">{user.email}</p>
                  </div>
                  <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors">
                    Profile
                  </button>
                  <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors">
                    Preferences
                  </button>
                  <div className="border-t border-white/5 mt-1 pt-1">
                    <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                      Sign out
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
