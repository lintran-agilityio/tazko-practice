import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../../app/App'
import { mockAuth, session } from './mockAuth'

vi.mock('../api')

const h1 = (name: string) => screen.findByRole('heading', { level: 1, name })

describe('return path after sign in is same-origin only (#29)', () => {
  beforeEach(() => vi.resetAllMocks())

  it.each(['/\\evil.com', '//evil.com', 'https://x.example', '/ok\\path', '\\\\evil.com'])(
    'ignores %s and goes Home',
    async (from) => {
      mockAuth(session('minh'))
      render(
        <MemoryRouter initialEntries={[{ pathname: '/sign-in', state: { from } }]}>
          <App />
        </MemoryRouter>,
      )
      expect(await h1('Home')).toBeInTheDocument()
    },
  )

  it('still returns to a normal in-app path', async () => {
    mockAuth(session('minh'))
    render(
      <MemoryRouter initialEntries={[{ pathname: '/sign-in', state: { from: '/labels?x=1' } }]}>
        <App />
      </MemoryRouter>,
    )
    expect(await h1('Labels')).toBeInTheDocument()
  })
})

describe('a failed sign out (#27)', () => {
  beforeEach(() => vi.resetAllMocks())

  it('falls back to a local sign out and leaves no unhandled rejection', async () => {
    const auth = mockAuth(session('minh'))
    auth.api.signOut.mockRejectedValueOnce(new Error('network')).mockImplementationOnce(async () => {
      act(() => auth.emit(null))
    })
    render(
      <MemoryRouter initialEntries={['/board']}>
        <App />
      </MemoryRouter>,
    )
    await h1('Board')
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(await h1('Sign in')).toBeInTheDocument()
    expect(auth.api.signOut).toHaveBeenCalledTimes(2)
    expect(auth.api.signOut).toHaveBeenLastCalledWith('local')
  })

  it('when both fail, stays signed in and an expiry later still keeps the page', async () => {
    const auth = mockAuth(session('minh'))
    auth.api.signOut.mockRejectedValue(new Error('network'))
    render(
      <MemoryRouter initialEntries={['/board']}>
        <App />
      </MemoryRouter>,
    )
    await h1('Board')
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(await h1('Board')).toBeInTheDocument()
    act(() => auth.emit(null))
    await h1('Sign in')
    auth.api.signInWithPassword.mockImplementation(async () => {
      act(() => auth.emit(session('minh')))
      return { error: null }
    })
    await userEvent.type(await screen.findByLabelText('Email'), 'minh@acme.test')
    await userEvent.type(await screen.findByLabelText('Password'), 'pw-123456{Enter}')
    expect(await h1('Board')).toBeInTheDocument()
  })
})
