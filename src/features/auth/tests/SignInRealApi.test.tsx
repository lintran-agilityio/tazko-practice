import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../../../app/App'

// Unlike SignIn.test.tsx, this does not mock ../api: the real api.ts runs and only the
// supabase client underneath is replaced. It catches a hint that is silently off (the
// earlier tests mocked allowedDomains, so they could not see that).
const signIn = vi.fn()
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: signIn,
    },
  }),
}))

describe('Sign in with the real api (G-20 hint)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    signIn.mockReset()
  })

  it('shows "Use your company account" and sends nothing for an outside domain', async () => {
    vi.stubEnv('VITE_ALLOWED_EMAIL_DOMAINS', 'acme.test')
    render(
      <MemoryRouter initialEntries={['/sign-in']}>
        <App />
      </MemoryRouter>,
    )
    await userEvent.type(await screen.findByLabelText('Email'), 'sam@other.org')
    await userEvent.type(await screen.findByLabelText('Password'), 'whatever-123{Enter}')
    const field = await screen.findByLabelText('Email')
    expect(field).toHaveValue('sam@other.org')
    expect(field).toHaveAccessibleDescription('Use your company account')
    expect(field).toBeInvalid()
    expect(signIn).not.toHaveBeenCalled()
  })
})
