import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppShell } from './AppShell'

function renderWithUiState(tab: 'messages' | 'nest' | 'calendar' | 'me', roomId?: string) {
  window.sessionStorage.setItem('pet10_ui_state', JSON.stringify({ tab, roomId }))
  return renderToStaticMarkup(<AppShell onLogout={vi.fn()} />)
}

afterEach(() => {
  window.sessionStorage.clear()
})

describe('AppShell bottom navigation visibility', () => {
  it('keeps the bottom navigation on the conversation list', () => {
    expect(renderWithUiState('messages')).toContain('aria-label="主导航"')
  })

  it('hides the bottom navigation inside a conversation detail', () => {
    expect(renderWithUiState('messages', 'room-1')).not.toContain('aria-label="主导航"')
  })

  it('shows the bottom navigation again after returning to the conversation list', () => {
    renderWithUiState('messages', 'room-1')
    expect(renderWithUiState('messages')).toContain('aria-label="主导航"')
  })

  it('keeps the bottom navigation on other tabs', () => {
    expect(renderWithUiState('nest', 'room-1')).toContain('aria-label="主导航"')
  })
})
