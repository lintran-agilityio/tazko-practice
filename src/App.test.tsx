import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import App from './App'
import { acceptInvitePath, screens } from './routes'

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

describe('navigation drawer', () => {
  const nav = () => screen.getByRole('navigation', { name: 'Main' })
  const menu = () => screen.getByRole('button', { name: 'Open menu' })

  it('opens from the button and closes on Esc', async () => {
    renderAt('/')
    expect(menu()).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(menu())
    expect(menu()).toHaveAttribute('aria-expanded', 'true')
    expect(nav()).toHaveAttribute('data-open', 'true')
    await userEvent.keyboard('{Escape}')
    expect(menu()).toHaveAttribute('aria-expanded', 'false')
    expect(nav()).toHaveAttribute('data-open', 'false')
  })

  it('closes when a page is chosen and goes to it', async () => {
    renderAt('/')
    await userEvent.click(menu())
    await userEvent.click(screen.getByRole('link', { name: 'Labels' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Labels' })).toBeInTheDocument()
    expect(nav()).toHaveAttribute('data-open', 'false')
  })

  it('closes when the backdrop is clicked', async () => {
    renderAt('/')
    await userEvent.click(menu())
    await userEvent.click(screen.getByTestId('backdrop'))
    expect(nav()).toHaveAttribute('data-open', 'false')
  })
})
