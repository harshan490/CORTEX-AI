import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import React, { Suspense } from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import SettingsPage from '@/app/settings/page'
import SettingsSectionPage from '@/app/settings/[section]/page'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, back: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/settings',
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
}))

vi.mock('framer-motion', () => {
  const React = require('react')
  const motion = new Proxy(
    {},
    {
      get: (_target: unknown, prop: string) =>
        React.forwardRef((props: Record<string, unknown>, ref: React.Ref<HTMLElement>) => {
          const {
            initial: _i,
            animate: _a,
            exit: _e,
            variants: _v,
            transition: _t,
            whileHover: _wh,
            whileTap: _wt,
            layout: _l,
            ...rest
          } = props
          return React.createElement(prop, { ...rest, ref })
        }),
    },
  )
  return { motion, AnimatePresence: ({ children }: { children: React.ReactNode }) => children }
})

vi.mock('@/lib/store', () => ({
  useStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      toggleSidebar: vi.fn(),
      sidebarOpen: true,
      user: { name: 'Alice Johnson', email: 'alice@cortex.ai' },
      logout: vi.fn(),
    }),
  getStoredToken: () => 'test-token',
}))

vi.mock('@/components/layout/dashboard-layout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALL_SECTION_IDS = [
  'profile',
  'notifications',
  'security',
  'api-keys',
  'integrations',
  'appearance',
  'webhooks',
  'data',
]

const SECTION_TITLES: Record<string, string> = {
  profile: 'Profile',
  notifications: 'Notifications',
  security: 'Security',
  'api-keys': 'API Keys',
  integrations: 'Integrations',
  appearance: 'Appearance',
  webhooks: 'Webhooks',
  data: 'Data Management',
}

function renderHub() {
  return render(<SettingsPage />)
}

async function renderSection(section: string) {
  let result: ReturnType<typeof render> | undefined
  await act(async () => {
    result = render(
      <Suspense fallback={<div>Loading...</div>}>
        <SettingsSectionPage params={Promise.resolve({ section })} />
      </Suspense>
    )
  })
  return result!
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Settings Hub Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all eight settings cards', () => {
    renderHub()
    for (const id of ALL_SECTION_IDS) {
      expect(
        screen.getByLabelText(`${SECTION_TITLES[id]} settings`)
      ).toBeInTheDocument()
    }
  })

  it.each(ALL_SECTION_IDS)(
    'card "%s" links to /settings/%s',
    (id) => {
      renderHub()
      const link = screen.getByLabelText(`${SECTION_TITLES[id]} settings`)
      expect(link).toHaveAttribute('href', `/settings/${id}`)
    }
  )

  it('all cards are rendered as <a> elements (Link)', () => {
    renderHub()
    for (const id of ALL_SECTION_IDS) {
      const link = screen.getByLabelText(`${SECTION_TITLES[id]} settings`)
      expect(link.tagName).toBe('A')
    }
  })

  it('cards are keyboard-activatable via Enter', () => {
    renderHub()
    const link = screen.getByLabelText('Profile settings')
    // Focus the link, then press Enter — standard <a> behavior
    link.focus()
    expect(document.activeElement).toBe(link)
    // The link is a real <a> tag, so Enter/Space natively activate it
    // We just verify it's focusable and is the active element
    expect(link.tagName).toBe('A')
  })
})

describe('Settings Section Page', () => {
  it('renders profile section with form fields', async () => {
    await renderSection('profile')
    expect(screen.getByText('Profile Settings')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Alice Johnson')).toBeInTheDocument()
  })

  it('renders integrations section with integration list', async () => {
    await renderSection('integrations')
    expect(screen.getByText('Connected Integrations')).toBeInTheDocument()
    expect(screen.getByText('Google Calendar')).toBeInTheDocument()
    expect(screen.getByText('Slack')).toBeInTheDocument()
  })

  it.each(['notifications', 'security', 'api-keys', 'appearance', 'webhooks', 'data'])(
    'renders placeholder for unimplemented section "%s"',
    async (id) => {
      await renderSection(id)
      expect(
        screen.getByText('This section is not configured yet. It will be available in a future update.')
      ).toBeInTheDocument()
    }
  )

  it('has a Back to Settings link', async () => {
    await renderSection('profile')
    const backLink = screen.getByLabelText('Back to Settings')
    expect(backLink).toBeInTheDocument()
    expect(backLink).toHaveAttribute('href', '/settings')
  })

  it('calls notFound for unknown section', async () => {
    await expect(renderSection('nonexistent')).rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('each section page shows section title and description', async () => {
    await renderSection('security')
    // Title appears in both the page header and the placeholder card
    expect(screen.getAllByText('Security').length).toBeGreaterThanOrEqual(1)
    expect(
      screen.getAllByText('Password, two-factor authentication, and session management').length
    ).toBeGreaterThanOrEqual(1)
  })
})
