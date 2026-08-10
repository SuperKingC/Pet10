import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TarotGame } from './TarotGame'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('tarot game flow', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
    container = document.createElement('div')
    root = createRoot(container)
    act(() => root.render(<TarotGame onClose={vi.fn()} onShareToChat={vi.fn()} />))
  })

  afterEach(() => {
    act(() => root.unmount())
    vi.unstubAllGlobals()
    window.localStorage.clear()
  })

  function button(text: string): HTMLButtonElement {
    const match = [...container.querySelectorAll('button')].find((item) => item.textContent?.includes(text))
    if (!match) throw new Error(`Missing button: ${text}`)
    return match
  }

  function click(element: Element) {
    act(() => element.dispatchEvent(new MouseEvent('click', { bubbles: true })))
  }

  it('completes and restarts a single-card reading without waiting for animations', () => {
    click(button('我现在最需要看清的是什么？'))
    click(button('下一步 · 选牌阵'))
    click(button('下一步 · 洗牌'))
    click(button('跳过洗牌与切牌'))

    click(container.querySelector('.tarot-fan__card') as HTMLButtonElement)
    expect(container.textContent).toContain('已选 1/1')
    click(button('翻开所选牌'))
    click(container.querySelector('.tarot-reveal-slot') as HTMLButtonElement)
    click(button('查看解读'))

    expect(container.textContent).toContain('核心结论')
    expect(container.textContent).toContain('我现在最需要看清的是什么？')

    click(button('再占一次'))
    expect(container.textContent).toContain('先写下你真正想知道的事')
    expect((container.querySelector('textarea') as HTMLTextAreaElement).value).toBe('')
  })
})
