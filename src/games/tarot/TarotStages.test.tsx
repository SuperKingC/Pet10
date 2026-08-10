import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MAJOR_ARCANA, type DrawnCard } from './tarotDeck'
import { TarotCutStage } from './TarotCutStage'
import { TarotFanStage } from './TarotFanStage'
import { TarotShuffleStage } from './TarotShuffleStage'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const mountedRoots: Array<ReturnType<typeof createRoot>> = []

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

afterEach(() => {
  while (mountedRoots.length) {
    const root = mountedRoots.pop()
    if (root) act(() => root.unmount())
  }
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
