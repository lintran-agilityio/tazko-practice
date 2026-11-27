import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../../app/App'
import { domain, mockAuth, session } from './mockAuth'

vi.mock('../api')

const h1 = (name: string) => screen.findByRole('heading', { level: 1, name })

// Owner decision: Sign out forgets the remembered path; only a signed-out visit or an
// expired session keeps it.
describe('sign out forgets the page (M3)', () => {
  beforeEach(() => vi.resetAllMocks())

  it('goes to Sign in, and the next sign in lands on Home, not the page left', async () => {
    const auth = mockAuth(session('minh'))
    auth.api.signOut.mockImplementation(async () => {
      auth.api.getSession.mockResolvedValue(null)
      act(() => auth.emit(null))
    })
    auth.api.signInWithPassword.mockImplementation(async () => {
      auth.api.getSession.mockResolvedValue(session('minh'))
      act(() => auth.emit(session('minh')))
      return { error: null }
    })
    render(
      <MemoryRouter initialEntries={['/board']}>
        <App />
      </MemoryRouter>,
    )
    await h1('Board')
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    await h1('Sign in')
    await userEvent.type(await screen.findByLabelText('Email'), `minh@${domain}`)
    await userEvent.type(await screen.findByLabelText('Password'), 'pw-123456{Enter}')
    expect(await h1('Home')).toBeInTheDocument()
  })

  it('keeps the page when the session expires while the app is open', async () => {
    const auth = mockAuth(session('minh'))
    auth.api.signInWithPassword.mockImplementation(async () => {
      auth.api.getSession.mockResolvedValue(session('minh'))
      act(() => auth.emit(session('minh')))
      return { error: null }
    })
    render(
      <MemoryRouter initialEntries={['/board']}>
        <App />
      </MemoryRouter>,
    )
    await h1('Board')
    act(() => auth.emit(null))
    await h1('Sign in')
    await userEvent.type(await screen.findByLabelText('Email'), `minh@${domain}`)
    await userEvent.type(await screen.findByLabelText('Password'), 'pw-123456{Enter}')
    expect(await h1('Board')).toBeInTheDocument()
  })
})
