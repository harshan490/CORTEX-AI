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

  // 2. Profile menu has a solid (opaque) background class
  it('profile menu has an opaque background', () => {
    renderHeader()
    openUserMenu()
    const menu = screen.getByRole('menu')
    expect(menu.className).toContain('bg-cortex-darker')
    // Must NOT contain alpha transparency suffix like /95 or /70
    expect(menu.className).not.toMatch(/bg-cortex-darker\/\d/)
  })

  // 3. Profile action navigates to /settings#profile
  it('Profile navigates to /settings#profile', () => {
    renderHeader()
    openUserMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: /profile/i }))
    expect(pushMock).toHaveBeenCalledWith('/settings#profile')
  })

  // 4. Preferences action navigates to /settings#appearance
  it('Preferences navigates to /settings#appearance', () => {
    renderHeader()
    openUserMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: /preferences/i }))
    expect(pushMock).toHaveBeenCalledWith('/settings#appearance')
  })

  // 5. Sign out invokes logout and navigates to /auth
  it('Sign out invokes logout and navigates to /auth', () => {
    renderHeader()
    openUserMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: /sign out/i }))
    expect(logoutMock).toHaveBeenCalled()
    expect(pushMock).toHaveBeenCalledWith('/auth')
  })

  // 6. Outside click closes the menu
  it('closes user menu on outside click', () => {
    renderHeader()
    openUserMenu()
    expect(screen.getByRole('menu')).toBeInTheDocument()
    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  // 7. Notification panel opens
  it('opens the notification panel on bell click', () => {
    renderHeader()
    openNotifications()
    expect(screen.getByText('Notifications')).toBeInTheDocument()
  })

  // 8. Empty notification state renders
  it('shows empty state when no notifications', () => {
    renderHeader()
    openNotifications()
    expect(screen.getByTestId('empty-notifications')).toBeInTheDocument()
    expect(screen.getByText('No new notifications')).toBeInTheDocument()
  })

  // 9. Escape closes the active popover
  it('closes popover on Escape key', () => {
    renderHeader()
    openUserMenu()
    expect(screen.getByRole('menu')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  // 10. Opening one popover closes the other
  it('opening notifications closes user menu', () => {
    renderHeader()
    openUserMenu()
    // Verify user menu is open via menuitem
    expect(screen.getByRole('menuitem', { name: /sign out/i })).toBeInTheDocument()
    openNotifications()
    // User menu should be gone, notification panel should be visible
    expect(screen.queryByRole('menuitem', { name: /sign out/i })).not.toBeInTheDocument()
    expect(screen.getByText('No new notifications')).toBeInTheDocument()
  })

  // Accessibility: aria-expanded toggles
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

  // No fake notification badge
  it('does not show a notification badge when there are no notifications', () => {
    renderHeader()
    const bellButton = screen.getByLabelText('Notifications')
    const badge = bellButton.querySelector('span')
    expect(badge).toBeNull()
  })
})
