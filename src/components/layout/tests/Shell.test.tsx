import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../../app/App'
import { mockAuth, session } from '../../../features/auth/tests/mockAuth'

vi.mock('../../../features/auth/api')

const nav = () => screen.getByRole('navigation', { name: 'Main' })
const menu = () => screen.getByRole('button', { name: 'Open menu' })

const renderApp = async () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  )
  await screen.findByRole('navigation', { name: 'Main' })
}

describe('navigation drawer', () => {
  beforeEach(() => mockAuth(session('minh')))

  it('opens from the button and closes on Esc', async () => {
    await renderApp()
    expect(menu()).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(menu())
    expect(menu()).toHaveAttribute('aria-expanded', 'true')
    expect(nav()).toHaveAttribute('data-open', 'true')
    await userEvent.keyboard('{Escape}')
    expect(menu()).toHaveAttribute('aria-expanded', 'false')
    expect(nav()).toHaveAttribute('data-open', 'false')
  })

  it('closes when a page is chosen and goes to it', async () => {
    await renderApp()
    await userEvent.click(menu())
    await userEvent.click(screen.getByRole('link', { name: 'Labels' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Labels' })).toBeInTheDocument()
    expect(nav()).toHaveAttribute('data-open', 'false')
  })

  it('closes when the backdrop is clicked', async () => {
    await renderApp()
    await userEvent.click(menu())
    await userEvent.click(screen.getByTestId('backdrop'))
    expect(nav()).toHaveAttribute('data-open', 'false')
  })
})
