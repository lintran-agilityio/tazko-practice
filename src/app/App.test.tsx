import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockAuth, session } from '../features/auth/tests/mockAuth'
import App from './App'
import { acceptInvitePath, screens, signInPath } from './routes'

vi.mock('../features/auth/api')

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )

const inShell = screens.filter((s) => s.path !== signInPath)

describe('routes', () => {
  beforeEach(() => mockAuth(session('minh')))

  it('has 14 screens', () => {
    expect(screens).toHaveLength(14)
  })

  it.each(inShell)('shows $label at $path inside the shell', async ({ path, label }) => {
    renderAt(path)
    expect(await screen.findByRole('heading', { level: 1, name: label })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
  })

  it('shows Sign in outside the shell, for a signed-out visitor', async () => {
    mockAuth(null)
    renderAt(signInPath)
    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument()
  })

  it('does not list Sign in in the navigation', async () => {
    renderAt('/')
    await screen.findByRole('navigation', { name: 'Main' })
    expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument()
  })

  it('shows Accept invite outside the shell', async () => {
    renderAt(acceptInvitePath)
    expect(await screen.findByRole('heading', { name: 'Accept invite' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument()
  })

  it('shows a not-found page for unknown paths when signed in', async () => {
    renderAt('/nope')
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })
})
