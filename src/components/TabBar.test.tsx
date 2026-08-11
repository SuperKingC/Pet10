import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { TabBar } from './TabBar'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('TabBar', () => {
  it('renders the five navigation icons in the reference order', () => {
    const markup = renderToStaticMarkup(
      <TabBar
        active="calendar"
        onChange={vi.fn()}
        onTogglePawMenu={vi.fn()}
        messageBadge={0}
      />
    )

    expect(markup.indexOf('小窝')).toBeLessThan(markup.indexOf('小记'))
    expect(markup.indexOf('小记')).toBeLessThan(markup.indexOf('打开快捷功能'))
    expect(markup.indexOf('打开快捷功能')).toBeLessThan(markup.indexOf('消息'))
    expect(markup.indexOf('消息')).toBeLessThan(markup.indexOf('我的'))
    expect(markup).toContain('/navigation/nest.png')
    expect(markup).toContain('/navigation/journal.png')
    expect(markup).toContain('/navigation/paw.png')
    expect(markup).toContain('/navigation/messages.png')
    expect(markup).toContain('/navigation/me.png')
  })

  it('toggles the paw menu without changing the active tab', async () => {
    const onChange = vi.fn()
    const onTogglePawMenu = vi.fn()
    const container = document.createElement('div')
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <TabBar
          active="messages"
          onChange={onChange}
          onTogglePawMenu={onTogglePawMenu}
          messageBadge={0}
        />
      )
    })

    const pawButton = container.querySelector<HTMLButtonElement>('[aria-label="打开快捷功能"]')
    expect(pawButton).not.toBeNull()

    await act(async () => {
      pawButton?.click()
    })

    expect(onTogglePawMenu).toHaveBeenCalledTimes(1)
    expect(onChange).not.toHaveBeenCalled()

    await act(async () => root.unmount())
  })

  it('marks the selected page item separately from the paw shortcut', () => {
    const markup = renderToStaticMarkup(
      <TabBar
        active="calendar"
        onChange={vi.fn()}
        onTogglePawMenu={vi.fn()}
        messageBadge={0}
      />
    )

    expect(markup).toMatch(/tab-bar__item tab-bar__item--active[^>]*>[\s\S]*小记/)
    expect(markup).not.toMatch(/tab-bar__item--paw tab-bar__item--active/)
  })

  it('returns page icons to their default size while the paw menu is open', () => {
    const markup = renderToStaticMarkup(
      <TabBar
        active="calendar"
        onChange={vi.fn()}
        onTogglePawMenu={vi.fn()}
        messageBadge={0}
        pawMenuOpen
      />
    )

    expect(markup).not.toContain('tab-bar__item--active')
    expect(markup).toContain('tab-bar__item--paw-open')
  })
})
