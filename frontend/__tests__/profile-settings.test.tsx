import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import React, { Suspense } from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import SettingsSectionPage from '@/app/settings/[section]/page'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/settings/profile',
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

vi.mock('@/components/layout/dashboard-layout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}))

const setUserMock = vi.fn()
const logoutMock = vi.fn()
const toggleSidebarMock = vi.fn()

// Stable references so useEffect([user]) doesn't re-fire on every render
const stableUser = {
  id: 'user-1',
  name: 'Demo User',
  email: 'demo@cortex.ai',
  role: 'Engineer',
  timezone: 'Europe/London',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const stableStore = {
  toggleSidebar: toggleSidebarMock,
  sidebarOpen: true,
  user: stableUser,
  logout: logoutMock,
  setUser: setUserMock,
}

vi.mock('@/lib/store', () => ({
  useStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector(stableStore),
  getStoredToken: () => 'test-token',
}))

const updateProfileMock = vi.fn()

vi.mock('@/lib/api', () => ({
  api: {
    updateProfile: (...args: unknown[]) => updateProfileMock(...args),
  },
  isDemoMode: false,
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function renderProfile() {
  await act(async () => {
    render(
      <Suspense fallback={<div>Loading...</div>}>
        <SettingsSectionPage params={Promise.resolve({ section: 'profile' })} />
      </Suspense>
    )
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Profile Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    updateProfileMock.mockResolvedValue({
      id: 'user-1',
      name: 'Updated Name',
      email: 'demo@cortex.ai',
      role: 'Engineer',
      timezone: 'Europe/London',
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-07-26T00:00:00Z',
    })
  })

  // 1. Current profile loads
  it('loads the authenticated user profile into the form', async () => {
    await renderProfile()
    const nameInput = screen.getByTestId('profile-name') as HTMLInputElement
    expect(nameInput.value).toBe('Demo User')
    const emailInput = screen.getByTestId('profile-email') as HTMLInputElement
    expect(emailInput.value).toBe('demo@cortex.ai')
    const roleInput = screen.getByTestId('profile-role') as HTMLInputElement
    expect(roleInput.value).toBe('Engineer')
    const tzInput = screen.getByTestId('profile-timezone') as HTMLInputElement
    expect(tzInput.value).toBe('Europe/London')
  })

  // 2. Hardcoded Alice profile is absent
  it('does not show hardcoded Alice Johnson data', async () => {
    await renderProfile()
    expect(screen.queryByDisplayValue('Alice Johnson')).not.toBeInTheDocument()
    expect(screen.queryByDisplayValue('alice@cortex.ai')).not.toBeInTheDocument()
    expect(screen.queryByDisplayValue('Product Manager')).not.toBeInTheDocument()
    expect(screen.queryByDisplayValue('America/New_York')).not.toBeInTheDocument()
  })

  // 3. Save sends the expected payload
  it('sends updated profile data on save', async () => {
    await renderProfile()
    const nameInput = screen.getByTestId('profile-name') as HTMLInputElement
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } })
    })
    // Confirm state flushed
    await waitFor(() => expect(nameInput.value).toBe('Updated Name'))
    await act(async () => {
      fireEvent.click(screen.getByTestId('save-profile'))
    })
    await waitFor(() => {
      expect(updateProfileMock).toHaveBeenCalledWith({
        name: 'Updated Name',
        role: 'Engineer',
        timezone: 'Europe/London',
      })
    })
  })

  // 4. Button disables while saving
  it('disables save button while submitting', async () => {
    let resolvePromise: (v: unknown) => void
    updateProfileMock.mockReturnValue(
      new Promise((resolve) => { resolvePromise = resolve })
    )
    await renderProfile()
    fireEvent.click(screen.getByTestId('save-profile'))
    expect(screen.getByTestId('save-profile')).toBeDisabled()

    // Resolve the promise
    await act(async () => {
      resolvePromise!({
        id: 'user-1',
        name: 'Demo User',
        email: 'demo@cortex.ai',
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-07-26T00:00:00Z',
      })
    })
    expect(screen.getByTestId('save-profile')).not.toBeDisabled()
  })

  // 5. Success state appears after a successful response
  it('shows success message after save', async () => {
    await renderProfile()
    fireEvent.click(screen.getByTestId('save-profile'))
    await waitFor(() => {
      expect(screen.getByTestId('profile-success')).toBeInTheDocument()
    })
    expect(screen.getByText('Profile updated successfully')).toBeInTheDocument()
  })

  // 6. Failed request shows an error
  it('shows error message on failed save', async () => {
    updateProfileMock.mockRejectedValue(new Error('Server error'))
    await renderProfile()
    fireEvent.click(screen.getByTestId('save-profile'))
    await waitFor(() => {
      expect(screen.getByTestId('profile-error')).toBeInTheDocument()
    })
    expect(screen.getByText('Server error')).toBeInTheDocument()
  })

  // 7. Header user information refreshes after save
  it('calls setUser to update store after successful save', async () => {
    await renderProfile()
    fireEvent.click(screen.getByTestId('save-profile'))
    await waitFor(() => {
      expect(setUserMock).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Updated Name' })
      )
    })
  })

  // Email is read-only
  it('email field is read-only', async () => {
    await renderProfile()
    const emailInput = screen.getByTestId('profile-email') as HTMLInputElement
    expect(emailInput).toHaveAttribute('readOnly')
  })

  // Client-side validation: empty name
  it('shows client error for empty name without API call', async () => {
    await renderProfile()
    const nameInput = screen.getByTestId('profile-name') as HTMLInputElement
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: '   ' } })
    })
    await waitFor(() => expect(nameInput.value).toBe('   '))
    await act(async () => {
      fireEvent.click(screen.getByTestId('save-profile'))
    })
    await waitFor(() => {
      expect(screen.getByTestId('profile-error')).toBeInTheDocument()
    })
    expect(screen.getByText('Name cannot be empty')).toBeInTheDocument()
    expect(updateProfileMock).not.toHaveBeenCalled()
  })
})
