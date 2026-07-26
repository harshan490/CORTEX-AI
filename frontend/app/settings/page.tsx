'use client'

import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { GlassCard } from '@/components/ui/glass-card'
import { motion } from 'framer-motion'
import {
  Bell,
  Shield,
  Users,
  Key,
  Globe,
  Palette,
  Webhook,
  Database,
} from 'lucide-react'

const sections = [
  {
    id: 'profile',
    title: 'Profile',
    icon: Users,
    description: 'Manage your personal information and preferences',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    icon: Bell,
    description: 'Configure email, Slack, and push notification preferences',
  },
  {
    id: 'security',
    title: 'Security',
    icon: Shield,
    description: 'Password, two-factor authentication, and session management',
  },
  {
    id: 'api-keys',
    title: 'API Keys',
    icon: Key,
    description: 'Manage API keys for programmatic access',
  },
  {
    id: 'integrations',
    title: 'Integrations',
    icon: Globe,
    description: 'Connect Google Calendar, Slack, Jira, and more',
  },
  {
    id: 'appearance',
    title: 'Appearance',
    icon: Palette,
    description: 'Customize the look and feel of CORTEX AI',
  },
  {
    id: 'webhooks',
    title: 'Webhooks',
    icon: Webhook,
    description: 'Configure webhook endpoints for event notifications',
  },
  {
    id: 'data',
    title: 'Data Management',
    icon: Database,
    description: 'Export, import, and manage your data',
  },
]

export default function SettingsPage() {
  return (
    <DashboardLayout title="Settings">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sections.map((section) => {
            const Icon = section.icon
            return (
              <Link
                key={section.id}
                href={`/settings/${section.id}`}
                aria-label={`${section.title} settings`}
                className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050507]"
              >
                <GlassCard hover className="!p-5 group h-full">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 group-hover:from-purple-500/30 group-hover:to-blue-500/30 transition-all">
                      <Icon className="h-5 w-5 text-purple-400" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-white">{section.title}</h3>
                      <p className="text-xs text-white/40 mt-1 leading-relaxed">{section.description}</p>
                    </div>
                  </div>
                </GlassCard>
              </Link>
            )
          })}
        </div>
      </motion.div>
    </DashboardLayout>
  )
}
