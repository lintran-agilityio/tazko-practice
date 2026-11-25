import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import App from '../../../app/App'

const nav = () => screen.getByRole('navigation', { name: 'Main' })
const menu = () => screen.getByRole('button', { name: 'Open menu' })

const renderApp = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  )

describe('navigation drawer', () => {
  it('opens from the button and closes on Esc', async () => {
    renderApp()
    expect(menu()).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(menu())
    expect(menu()).toHaveAttribute('aria-expanded', 'true')
    expect(nav()).toHaveAttribute('data-open', 'true')
    await userEvent.keyboard('{Escape}')
    expect(menu()).toHaveAttribute('aria-expanded', 'false')
    expect(nav()).toHaveAttribute('data-open', 'false')
  })

  it('closes when a page is chosen and goes to it', async () => {
    renderApp()
    await userEvent.click(menu())
    await userEvent.click(screen.getByRole('link', { name: 'Labels' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Labels' })).toBeInTheDocument()
    expect(nav()).toHaveAttribute('data-open', 'false')
  })

  it('closes when the backdrop is clicked', async () => {
    renderApp()
    await userEvent.click(menu())
    await userEvent.click(screen.getByTestId('backdrop'))
    expect(nav()).toHaveAttribute('data-open', 'false')
  })
})
