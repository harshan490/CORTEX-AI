import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Header } from '@/components/layout/header'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, back: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/dashboard',
}))

// Mock framer-motion – render plain HTML elements
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

const logoutMock = vi.fn()

vi.mock('@/lib/store', () => ({
  useStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      toggleSidebar: vi.fn(),
      sidebarOpen: true,
      user: { name: 'Alice Johnson', email: 'alice@cortex.ai' },
      logout: logoutMock,
    }),
  getStoredToken: () => 'test-token',
}))

// ---------------------------------------------------------------------------
// Constants — the opaque background hex used by dropdown panels
// ---------------------------------------------------------------------------

// The dropdown uses bg-[#0D0B22] — a fully opaque Tailwind arbitrary value
// matching the Cortex background.tertiary token.
const OPAQUE_BG_CLASS = 'bg-[#0D0B22]'
const STACKING_CLASS = 'z-[9999]'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderHeader() {
  return render(<Header title="Dashboard" />)
}

function openUserMenu() {
  fireEvent.click(screen.getByLabelText('User menu'))
}

function openNotifications() {
  fireEvent.click(screen.getByLabelText('Notifications'))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 1. Profile menu opens
  it('opens the profile menu on click', () => {
    renderHeader()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    openUserMenu()
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  // 2. Profile dropdown uses a fully opaque background class
  it('profile menu uses fully opaque background', () => {
    renderHeader()
    openUserMenu()
    const menu = screen.getByRole('menu')
    expect(menu.className).toContain(OPAQUE_BG_CLASS)
    // Must NOT use the phantom cortex-darker token
    expect(menu.className).not.toContain('bg-cortex-dark')
    // Must NOT use backdrop-blur as sole background strategy
    expect(menu.className).not.toContain('backdrop-blur')
  })

  // 3. Profile dropdown has the expected stacking class
  it('profile menu has high z-index stacking class', () => {
    renderHeader()
    openUserMenu()
    const menu = screen.getByRole('menu')
    expect(menu.className).toContain(STACKING_CLASS)
  })

  // 4. Notification dropdown uses the same panel treatment
  it('notification panel uses same opaque background and stacking', () => {
    renderHeader()
    openNotifications()
    const panel = screen.getByRole('menu')
    expect(panel.className).toContain(OPAQUE_BG_CLASS)
    expect(panel.className).toContain(STACKING_CLASS)
    expect(panel.className).not.toContain('bg-cortex-dark')
  })

  // 5. Profile action navigates to /settings#profile
  it('Profile navigates to /settings#profile', () => {
    renderHeader()
    openUserMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: /profile/i }))
    expect(pushMock).toHaveBeenCalledWith('/settings#profile')
  })

  // 6. Preferences action navigates to /settings#appearance
  it('Preferences navigates to /settings#appearance', () => {
    renderHeader()
    openUserMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: /preferences/i }))
    expect(pushMock).toHaveBeenCalledWith('/settings#appearance')
  })

  // 7. Sign out invokes logout and navigates to /auth
  it('Sign out invokes logout and navigates to /auth', () => {
    renderHeader()
    openUserMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: /sign out/i }))
    expect(logoutMock).toHaveBeenCalled()
    expect(pushMock).toHaveBeenCalledWith('/auth')
  })

  // 8. Outside click closes the menu
  it('closes user menu on outside click', () => {
    renderHeader()
    openUserMenu()
    expect(screen.getByRole('menu')).toBeInTheDocument()
    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  // 9. Notification panel opens
  it('opens the notification panel on bell click', () => {
    renderHeader()
    openNotifications()
    expect(screen.getByText('Notifications')).toBeInTheDocument()
  })

  // 10. Empty notification state renders
  it('shows empty state when no notifications', () => {
    renderHeader()
    openNotifications()
    expect(screen.getByTestId('empty-notifications')).toBeInTheDocument()
    expect(screen.getByText('No new notifications')).toBeInTheDocument()
  })

  // 11. Escape closes the active popover
  it('closes popover on Escape key', () => {
    renderHeader()
    openUserMenu()
    expect(screen.getByRole('menu')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  // 12. Opening one popover closes the other
  it('opening notifications closes user menu', () => {
    renderHeader()
    openUserMenu()
    expect(screen.getByRole('menuitem', { name: /sign out/i })).toBeInTheDocument()
    openNotifications()
    expect(screen.queryByRole('menuitem', { name: /sign out/i })).not.toBeInTheDocument()
    expect(screen.getByText('No new notifications')).toBeInTheDocument()
  })

  // 13. Accessibility: aria-expanded toggles
  it('sets aria-expanded correctly on toggle buttons', () => {
    renderHeader()
    const bellButton = screen.getByLabelText('Notifications')
    const userButton = screen.getByLabelText('User menu')
    expect(bellButton).toHaveAttribute('aria-expanded', 'false')
    expect(userButton).toHaveAttribute('aria-expanded', 'false')
    openUserMenu()
    expect(userButton).toHaveAttribute('aria-expanded', 'true')
    expect(bellButton).toHaveAttribute('aria-expanded', 'false')
  })

  // 14. No fake notification badge
  it('does not show a notification badge when there are no notifications', () => {
    renderHeader()
    const bellButton = screen.getByLabelText('Notifications')
    const badge = bellButton.querySelector('span')
    expect(badge).toBeNull()
  })
})
