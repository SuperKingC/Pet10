import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MAJOR_ARCANA, type DrawnCard } from './tarotDeck'
import { TarotCutStage } from './TarotCutStage'
import { TarotFanStage } from './TarotFanStage'
import { TarotShuffleStage } from './TarotShuffleStage'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const mountedRoots: Array<ReturnType<typeof createRoot>> = []
let frameCallbacks: FrameRequestCallback[] = []

function render(element: React.ReactNode) {
  const container = document.createElement('div')
  const root = createRoot(container)
  mountedRoots.push(root)
  act(() => root.render(element))
  return container
}

function click(element: Element) {
  act(() => element.dispatchEvent(new MouseEvent('click', { bubbles: true })))
}

function cards(): DrawnCard[] {
  return Array.from({ length: 10 }, (_, index) => ({
    card: MAJOR_ARCANA[index],
    reversed: false,
    position: '核心指引'
  }))
}

beforeEach(() => {
  frameCallbacks = []
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
    frameCallbacks.push(callback)
    return frameCallbacks.length
  }))
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
})

afterEach(() => {
  while (mountedRoots.length) {
    const root = mountedRoots.pop()
    if (root) act(() => root.unmount())
  }
  vi.unstubAllGlobals()
})

describe('tarot ritual stages', () => {
  it('enables the cut transition only after shuffle reaches one hundred percent', () => {
    const onContinue = vi.fn()
    const incomplete = render(
      <TarotShuffleStage progress={99} onProgress={vi.fn()} onContinue={onContinue} onSkip={vi.fn()} />
    )
    const incompleteButton = incomplete.querySelector('.tarot-next') as HTMLButtonElement
    expect(incompleteButton.disabled).toBe(true)

    const complete = render(
      <TarotShuffleStage progress={100} onProgress={vi.fn()} onContinue={onContinue} onSkip={vi.fn()} />
    )
    const completeButton = complete.querySelector('.tarot-next') as HTMLButtonElement
    expect(completeButton.disabled).toBe(false)
    click(completeButton)
    expect(onContinue).toHaveBeenCalledOnce()
  })

  it('locks cut controls while the active animation is running', () => {
    const onStartCut = vi.fn()
    const onContinue = vi.fn()
    const container = render(
      <TarotCutStage
        cutCount={1}
        cutting
        swapped={false}
        onStartCut={onStartCut}
        onFinishCut={vi.fn()}
        onContinue={onContinue}
      />
    )

    const buttons = container.querySelectorAll('button')
    expect((buttons[0] as HTMLButtonElement).disabled).toBe(true)
    expect((container.querySelector('.tarot-next') as HTMLButtonElement).disabled).toBe(true)
  })

  it('drives both cut piles from one animation frame clock and completes once', () => {
    const onFinishCut = vi.fn()
    const container = render(
      <TarotCutStage
        cutCount={0}
        cutting
        swapped={false}
        onStartCut={vi.fn()}
        onFinishCut={onFinishCut}
        onContinue={vi.fn()}
      />
    )

    expect(frameCallbacks).toHaveLength(1)
    act(() => frameCallbacks.shift()?.(100))
    expect(frameCallbacks).toHaveLength(1)
    act(() => frameCallbacks.shift()?.(1450))

    const upper = container.querySelector('.tarot-cut-deck__left') as HTMLElement
    const lower = container.querySelector('.tarot-cut-deck__right') as HTMLElement
    const shadow = container.querySelector('.tarot-cut-deck__shadow') as HTMLElement

    expect(upper.style.transform).toContain('translate3d')
    expect(lower.style.transform).toContain('translate3d')
    expect(shadow.style.transform).toContain('translateX')
    expect(onFinishCut).toHaveBeenCalledOnce()
    expect(onFinishCut).toHaveBeenCalledWith('tarot-cut-upper')
  })

  it('allows only one selected card to fly at a time', () => {
    const onPick = vi.fn()
    const container = render(
      <TarotFanStage
        drawn={cards()}
        picked={[0]}
        flyingCard={1}
        needCount={3}
        onPick={onPick}
        onFinishPick={vi.fn()}
        onContinue={vi.fn()}
      />
    )

    const cardButtons = container.querySelectorAll('.tarot-fan__card')
    expect((cardButtons[0] as HTMLButtonElement).disabled).toBe(true)
    expect((cardButtons[2] as HTMLButtonElement).disabled).toBe(true)
    click(cardButtons[2])
    expect(onPick).not.toHaveBeenCalled()
  })
})
