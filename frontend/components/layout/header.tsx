'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Menu,
  Bell,
  Search,
  ChevronDown,
  User,
  Settings,
  LogOut,
  InboxIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore as useAppStore } from '@/lib/store'
import { Avatar } from '@/components/ui/avatar'

interface HeaderProps {
  title?: string
  className?: string
}

type ActivePopover = 'none' | 'notifications' | 'user'

export function Header({ title, className }: HeaderProps) {
  const router = useRouter()
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const user = useAppStore((s) => s.user)
  const logout = useAppStore((s) => s.logout)
  const [activePopover, setActivePopover] = useState<ActivePopover>('none')

  const notificationRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const closeAll = useCallback(() => setActivePopover('none'), [])

  const togglePopover = useCallback((popover: ActivePopover) => {
    setActivePopover((prev) => (prev === popover ? 'none' : popover))
  }, [])

  // Close on Escape
  useEffect(() => {
    if (activePopover === 'none') return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAll()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [activePopover, closeAll])

  // Close on outside click
  useEffect(() => {
    if (activePopover === 'none') return
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        activePopover === 'notifications' &&
        notificationRef.current &&
        !notificationRef.current.contains(target)
      ) {
        closeAll()
      }
      if (
        activePopover === 'user' &&
        userMenuRef.current &&
        !userMenuRef.current.contains(target)
      ) {
        closeAll()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [activePopover, closeAll])

  const handleSignOut = useCallback(() => {
    closeAll()
    logout()
    router.push('/auth')
  }, [closeAll, logout, router])

  const handleNavigate = useCallback(
    (path: string) => {
      closeAll()
      router.push(path)
    },
    [closeAll, router]
  )

  const notifications: string[] = []

  return (
    <header
      className={cn(
        'sticky top-0 z-40 isolate flex h-16 items-center justify-between px-6',
        'border-b border-white/10 bg-[#050507]/95 backdrop-blur-2xl',
        className
      )}
    >
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors duration-200"
          aria-label="Toggle sidebar"
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
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors duration-200"
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </button>

        {/* Notification bell */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => togglePopover('notifications')}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors duration-200"
            aria-label="Notifications"
            aria-expanded={activePopover === 'notifications'}
            aria-haspopup="true"
          >
            <Bell className="h-5 w-5" />
            {notifications.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-medium text-white">
                {notifications.length}
              </span>
            )}
          </button>

          {activePopover === 'notifications' && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 z-[9999] w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-white/15 bg-[#0D0B22] p-1 shadow-2xl ring-1 ring-black/20"
              role="menu"
            >
              <div className="px-3 py-2 border-b border-white/10">
                <p className="text-sm font-medium text-white">Notifications</p>
              </div>
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4" data-testid="empty-notifications">
                  <InboxIcon className="h-8 w-8 text-white/20 mb-2" />
                  <p className="text-sm text-white/40">No new notifications</p>
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((n, i) => (
                    <div key={i} className="px-3 py-2 text-sm text-white/60">
                      {n}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* User profile menu */}
        {user && (
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => togglePopover('user')}
              className="flex items-center gap-2 rounded-xl px-3 py-1.5 hover:bg-white/5 transition-colors duration-200"
              aria-label="User menu"
              aria-expanded={activePopover === 'user'}
              aria-haspopup="true"
            >
              <Avatar
                fallback={user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                alt={user.name}
                size="sm"
              />
              <span className="hidden sm:block text-sm font-medium text-white">{user.name}</span>
              <ChevronDown className="h-4 w-4 text-white/40" />
            </button>

            {activePopover === 'user' && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 z-[9999] w-56 max-w-[calc(100vw-2rem)] rounded-xl border border-white/15 bg-[#0D0B22] p-2 shadow-2xl ring-1 ring-black/20"
                role="menu"
              >
                <div className="px-3 py-2 border-b border-white/10">
                  <p className="text-sm font-medium text-white">{user.name}</p>
                  <p className="text-xs text-white/40">{user.email}</p>
                </div>
                <button
                  onClick={() => handleNavigate('/settings#profile')}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                  role="menuitem"
                >
                  <User className="h-4 w-4" />
                  Profile
                </button>
                <button
                  onClick={() => handleNavigate('/settings#appearance')}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                  role="menuitem"
                >
                  <Settings className="h-4 w-4" />
                  Preferences
                </button>
                <div className="border-t border-white/10 mt-1 pt-1">
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    role="menuitem"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
