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
    expect(renderWithUiState('messages')).toContain('class="tab-bar"')
  })

  it('keeps the bottom navigation mounted but hidden inside a conversation detail', () => {
    const markup = renderWithUiState('messages', 'room-1')

    expect(markup).toContain('class="tab-bar tab-bar--hidden"')
    expect(markup).toContain('aria-hidden="true"')
  })

  it('shows the bottom navigation again after returning to the conversation list', () => {
    renderWithUiState('messages', 'room-1')
    expect(renderWithUiState('messages')).toContain('class="tab-bar"')
  })

  it('keeps the bottom navigation on other tabs', () => {
    expect(renderWithUiState('nest', 'room-1')).toContain('class="tab-bar"')
  })
})
