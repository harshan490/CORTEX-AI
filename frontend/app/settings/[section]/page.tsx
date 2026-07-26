'use client'

import { use } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Bell,
  Shield,
  Users,
  Key,
  Globe,
  Palette,
  Webhook,
  Database,
  Save,
  RefreshCw,
  Construction,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface SectionConfig {
  title: string
  icon: LucideIcon
  description: string
  implemented: boolean
}

const sectionMap: Record<string, SectionConfig> = {
  profile: {
    title: 'Profile',
    icon: Users,
    description: 'Manage your personal information and preferences',
    implemented: true,
  },
  notifications: {
    title: 'Notifications',
    icon: Bell,
    description: 'Configure email, Slack, and push notification preferences',
    implemented: false,
  },
  security: {
    title: 'Security',
    icon: Shield,
    description: 'Password, two-factor authentication, and session management',
    implemented: false,
  },
  'api-keys': {
    title: 'API Keys',
    icon: Key,
    description: 'Manage API keys for programmatic access',
    implemented: false,
  },
  integrations: {
    title: 'Integrations',
    icon: Globe,
    description: 'Connect Google Calendar, Slack, Jira, and more',
    implemented: true,
  },
  appearance: {
    title: 'Appearance',
    icon: Palette,
    description: 'Customize the look and feel of CORTEX AI',
    implemented: false,
  },
  webhooks: {
    title: 'Webhooks',
    icon: Webhook,
    description: 'Configure webhook endpoints for event notifications',
    implemented: false,
  },
  data: {
    title: 'Data Management',
    icon: Database,
    description: 'Export, import, and manage your data',
    implemented: false,
  },
}

function ProfileSection() {
  return (
    <GlassCard className="!p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Profile Settings</h3>
          <p className="text-sm text-white/40 mt-1">Update your personal information</p>
        </div>
        <Button variant="primary" leftIcon={<Save className="h-4 w-4" />}>
          Save Changes
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm text-white/60">Full Name</label>
          <Input defaultValue="Alice Johnson" />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-white/60">Email</label>
          <Input defaultValue="alice@cortex.ai" />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-white/60">Role</label>
          <Input defaultValue="Product Manager" />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-white/60">Timezone</label>
          <Input defaultValue="America/New_York" />
        </div>
      </div>
    </GlassCard>
  )
}

function IntegrationsSection() {
  return (
    <GlassCard className="!p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Connected Integrations</h3>
          <p className="text-sm text-white/40 mt-1">Manage your integrated tools and services</p>
        </div>
        <Button variant="secondary" leftIcon={<RefreshCw className="h-4 w-4" />}>
          Sync All
        </Button>
      </div>
      <div className="space-y-3">
        {[
          { name: 'Google Calendar', status: 'Connected', color: 'success' },
          { name: 'Gmail', status: 'Connected', color: 'success' },
          { name: 'Slack', status: 'Connected', color: 'success' },
          { name: 'Jira', status: 'Disconnected', color: 'danger' },
          { name: 'Notion', status: 'Pending', color: 'warning' },
          { name: 'GitHub', status: 'Connected', color: 'success' },
        ].map((integration) => (
          <div
            key={integration.name}
            className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
                <Globe className="h-4 w-4 text-white/50" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{integration.name}</p>
                <Badge variant={integration.color as 'success' | 'danger' | 'warning'} size="sm">
                  {integration.status}
                </Badge>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              Configure
            </Button>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}

function PlaceholderSection({ config }: { config: SectionConfig }) {
  return (
    <GlassCard className="!p-6">
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 mb-4">
          <Construction className="h-8 w-8 text-purple-400/60" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">{config.title}</h3>
        <p className="text-sm text-white/40 max-w-md mb-1">{config.description}</p>
        <p className="text-sm text-white/30 mt-3">
          This section is not configured yet. It will be available in a future update.
        </p>
      </div>
    </GlassCard>
  )
}

export default function SettingsSectionPage({
  params,
}: {
  params: Promise<{ section: string }>
}) {
  const { section } = use(params)
  const config = sectionMap[section]

  if (!config) {
    notFound()
  }

  const Icon = config.icon

  return (
    <DashboardLayout title="Settings">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center gap-4">
          <Link
            href="/settings"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60"
            aria-label="Back to Settings"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20">
              <Icon className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{config.title}</h2>
              <p className="text-sm text-white/40">{config.description}</p>
            </div>
          </div>
        </div>

        {section === 'profile' && <ProfileSection />}
        {section === 'integrations' && <IntegrationsSection />}
        {!config.implemented && <PlaceholderSection config={config} />}
      </motion.div>
    </DashboardLayout>
  )
}
