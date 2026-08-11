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
let animations: Array<{
  keyframes: Keyframe[]
  options?: number | KeyframeAnimationOptions
  animation: Animation
}> = []

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
  animations = []
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
    frameCallbacks.push(callback)
    return frameCallbacks.length
  }))
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (this.classList.contains('tarot-fan__visual')) {
      return { left: 120, top: 420, width: 70, height: 112, right: 190, bottom: 532, x: 120, y: 420, toJSON() {} }
    }
    if (this.classList.contains('tarot-picked-slot') && this.getAttribute('data-order') === '1') {
      return { left: 210, top: 120, width: 56, height: 88, right: 266, bottom: 208, x: 210, y: 120, toJSON() {} }
    }
    return { left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON() {} }
  })
  Object.defineProperty(HTMLElement.prototype, 'animate', {
    configurable: true,
    value: vi.fn(function (
      this: HTMLElement,
      keyframes: Keyframe[] | PropertyIndexedKeyframes,
      options?: number | KeyframeAnimationOptions
    ) {
    const animation = {
      cancel: vi.fn(),
      onfinish: null
    } as unknown as Animation
    animations.push({
      keyframes: Array.from(keyframes as Iterable<Keyframe>),
      options,
      animation
    })
    return animation
    })
  })
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

  it('renders a visible card-back face for both cut piles', () => {
    const container = render(
      <TarotCutStage
        cutCount={0}
        cutting={false}
        swapped={false}
        onStartCut={vi.fn()}
        onFinishCut={vi.fn()}
        onContinue={vi.fn()}
      />
    )

    expect(container.querySelectorAll('.tarot-cut-deck__face')).toHaveLength(2)
    expect(container.querySelectorAll('.tarot-cut-deck__left .tarot-cut-deck__face, .tarot-cut-deck__right .tarot-cut-deck__face')).toHaveLength(2)
  })

  it('builds each cut pile from individually layered thin cards', () => {
    const container = render(
      <TarotCutStage
        cutCount={0}
        cutting={false}
        swapped={false}
        onStartCut={vi.fn()}
        onFinishCut={vi.fn()}
        onContinue={vi.fn()}
      />
    )

    expect(container.querySelectorAll('.tarot-cut-deck__left .tarot-cut-deck__sheet')).toHaveLength(10)
    expect(container.querySelectorAll('.tarot-cut-deck__right .tarot-cut-deck__sheet')).toHaveLength(10)
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

  it('flies a measured overlay into the next picked slot and completes once', () => {
    const onFinishPick = vi.fn()
    const container = render(
      <TarotFanStage
        drawn={cards()}
        picked={[0]}
        flyingCard={4}
        needCount={3}
        onPick={vi.fn()}
        onFinishPick={onFinishPick}
        onContinue={vi.fn()}
      />
    )

    expect(container.querySelectorAll('.tarot-picked-slot')).toHaveLength(3)
    expect(document.body.querySelector('.tarot-fan-flight')).not.toBeNull()
    expect(animations).toHaveLength(1)
    expect(animations[0].keyframes.at(-1)).toMatchObject({
      transform: 'translate3d(83px, -312px, 0) rotate(0deg) scale(0.9655172413793104, 0.9565217391304348)'
    })
    expect(animations[0].options).toMatchObject({ duration: 900 })

    act(() => {
      animations[0].animation.onfinish?.({} as AnimationPlaybackEvent)
      animations[0].animation.onfinish?.({} as AnimationPlaybackEvent)
    })

    expect(onFinishPick).toHaveBeenCalledOnce()
    expect(onFinishPick).toHaveBeenCalledWith(4)
  })

  it('cancels an active card flight without completing after unmount', () => {
    const onFinishPick = vi.fn()
    render(
      <TarotFanStage
        drawn={cards()}
        picked={[]}
        flyingCard={2}
        needCount={1}
        onPick={vi.fn()}
        onFinishPick={onFinishPick}
        onContinue={vi.fn()}
      />
    )

    const animation = animations[0].animation
    const root = mountedRoots.pop()
    if (root) act(() => root.unmount())

    expect(animation.cancel).toHaveBeenCalledOnce()
    act(() => animation.onfinish?.({} as AnimationPlaybackEvent))
    expect(onFinishPick).not.toHaveBeenCalled()
    expect(document.body.querySelector('.tarot-fan-flight')).toBeNull()
  })
})
