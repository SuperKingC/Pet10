import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getTarotDevStage, isTarotDevStage, TAROT_DEV_STAGES, TarotDevEntry } from './TarotDevEntry'
import { renderToStaticMarkup } from 'react-dom/server'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const roots: Array<ReturnType<typeof createRoot>> = []

afterEach(() => {
  while (roots.length) {
    const root = roots.pop()
    if (root) act(() => root.unmount())
  }
  vi.restoreAllMocks()
})

describe('tarot development entry', () => {
  it('supports every documented stage', () => {
    expect(TAROT_DEV_STAGES).toEqual(['question', 'spread', 'shuffle', 'cut', 'fan', 'reveal', 'reading'])
    expect(getTarotDevStage('?stage=cut')).toBe('cut')
  })

  it('falls back to question for unknown stages', () => {
    expect(getTarotDevStage('?stage=unknown')).toBe('question')
    expect(isTarotDevStage('cut')).toBe(true)
    expect(isTarotDevStage('unknown')).toBe(false)
  })

  it('renders the requested formal stage component', () => {
    const markup = renderToStaticMarkup(<TarotDevEntry search="?stage=cut" />)
    expect(markup).toContain('data-dev-stage="cut"')
    expect(markup).toContain('tarot-cut')
  })

  it('supports a five-card fan layout review', () => {
    const markup = renderToStaticMarkup(<TarotDevEntry search="?stage=fan&count=5" />)
    expect(markup).toContain('tarot-picked-row--5')
    expect(markup).toContain('已选 1/5')
  })

  it('lets the fan review stage play and finish a selected-card flight', () => {
    let finish: Animation['onfinish']
    Object.defineProperty(HTMLElement.prototype, 'animate', {
      configurable: true,
      value: vi.fn(() => ({
        cancel: vi.fn(),
        get onfinish() {
          return finish
        },
        set onfinish(callback) {
          finish = callback
        }
      }))
    })

    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    roots.push(root)
    act(() => root.render(<TarotDevEntry search="?stage=fan" />))

    const card = container.querySelector('[aria-label="第 5 张牌"]') as HTMLButtonElement
    act(() => card.click())
    expect(card.disabled).toBe(true)

    act(() => finish?.call({} as Animation, {} as AnimationPlaybackEvent))
    expect(container.textContent).toContain('已选 2/3')
    container.remove()
  })

  it('updates shuffle progress while holding the deck', () => {
    const frameCallbacks: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      frameCallbacks.push(callback)
      return frameCallbacks.length
    }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())

    const container = document.createElement('div')
    const root = createRoot(container)
    act(() => root.render(<TarotDevEntry search="?stage=shuffle" />))

    const deck = container.querySelector('.tarot-shuffle-deck') as HTMLButtonElement
    const progress = container.querySelector('.tarot-shuffle-bar span') as HTMLSpanElement
    expect(progress.style.transform).toBe('scaleX(0)')

    act(() => deck.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true })))
    act(() => frameCallbacks.shift()?.(100))
    act(() => frameCallbacks.shift()?.(148))

    expect(progress.style.transform).not.toBe('scaleX(0)')

    act(() => root.unmount())
    vi.unstubAllGlobals()
  })
})
