import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import App from '../../src/app/App'
import { acceptInvitePath, screens } from '../../src/app/routes'

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )

describe('routes', () => {
  it('has 14 screens', () => {
    expect(screens).toHaveLength(14)
  })

  it.each(screens)('shows $label at $path inside the shell', ({ path, label }) => {
    renderAt(path)
    expect(screen.getByRole('heading', { level: 1, name: label })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
  })

  it('shows Accept invite outside the shell', () => {
    renderAt(acceptInvitePath)
    expect(screen.getByRole('heading', { name: 'Accept invite' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument()
  })

  it('shows a not-found page for unknown paths', () => {
    renderAt('/nope')
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })
})
