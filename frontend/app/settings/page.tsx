'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
  Save,
  RefreshCw,
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
              <GlassCard key={section.id} hover className="!p-5 cursor-pointer group">
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
            )
          })}
        </div>

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
      </motion.div>
    </DashboardLayout>
  )
}
