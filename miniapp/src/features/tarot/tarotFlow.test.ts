import { describe, expect, it } from 'vitest'
import {
  MAJOR_ARCANA,
  type TarotCandidate,
} from './tarotCards'
import { createInitialTarotFlow, tarotFlowReducer } from './tarotFlow'
import type { TarotReading } from './tarotReading'

function candidates(count = 10): TarotCandidate[] {
  return Array.from({ length: count }, (_, index) => ({
    card: MAJOR_ARCANA[index],
    reversed: index % 2 === 1,
  }))
}

describe('miniapp tarot question flow', () => {
  it('starts at the question stage with the single-card spread', () => {
    expect(createInitialTarotFlow()).toEqual({
      stage: 'question',
      question: '',
      promptOffset: 0,
      spread: 'single',
    })
  })

  it('does not continue with a blank question', () => {
    const initial = createInitialTarotFlow()
    const withWhitespace = tarotFlowReducer(initial, {
      type: 'set-question',
      question: '   ',
    })

    expect(tarotFlowReducer(withWhitespace, { type: 'continue' })).toBe(withWhitespace)
  })

  it('trims the question and enters only the spread stage', () => {
    const initial = createInitialTarotFlow()
    const withQuestion = tarotFlowReducer(initial, {
      type: 'set-question',
      question: '  我该如何面对这段关系？  ',
    })
    const spread = tarotFlowReducer(withQuestion, { type: 'continue' })

    expect(spread).toEqual({
      stage: 'spread',
      question: '我该如何面对这段关系？',
      spread: 'single',
    })
    expect(tarotFlowReducer(spread, {
      type: 'set-question',
      question: '不应覆盖',
    })).toBe(spread)
  })

  it('selects a spread and enters only the shuffle stage', () => {
    const question = tarotFlowReducer(createInitialTarotFlow(), {
      type: 'set-question',
      question: '这段关系接下来会怎样？',
    })
    const spread = tarotFlowReducer(question, { type: 'continue' })
    const selected = tarotFlowReducer(spread, {
      type: 'set-spread',
      spread: 'relationship',
    })
    const shuffle = tarotFlowReducer(selected, { type: 'continue' })

    expect(selected).toEqual({
      stage: 'spread',
      question: '这段关系接下来会怎样？',
      spread: 'relationship',
    })
    expect(shuffle).toEqual({
      stage: 'shuffle',
      question: '这段关系接下来会怎样？',
      spread: 'relationship',
      progress: 0,
    })
    expect(tarotFlowReducer(shuffle, { type: 'continue' })).toBe(shuffle)
  })

  it('requires completed shuffle and one completed cut before entering the fan', () => {
    const question = tarotFlowReducer(createInitialTarotFlow(), {
      type: 'set-question',
      question: '我应该怎样重新找到自己的节奏？',
    })
    const spread = tarotFlowReducer(question, { type: 'continue' })
    const shuffle = tarotFlowReducer(spread, { type: 'continue' })

    expect(tarotFlowReducer(shuffle, { type: 'continue' })).toBe(shuffle)

    const completedShuffle = tarotFlowReducer(shuffle, {
      type: 'set-shuffle-progress',
      progress: 100,
    })
    const cut = tarotFlowReducer(completedShuffle, { type: 'continue' })
    expect(cut).toMatchObject({ stage: 'cut', cutCount: 0, cutting: false })
    expect(tarotFlowReducer(cut, {
      type: 'enter-fan',
      candidates: candidates(),
    })).toBe(cut)

    const cutting = tarotFlowReducer(cut, { type: 'start-cut' })
    expect(tarotFlowReducer(cutting, { type: 'start-cut' })).toBe(cutting)
    const cutComplete = tarotFlowReducer(cutting, { type: 'finish-cut' })
    const fan = tarotFlowReducer(cutComplete, {
      type: 'enter-fan',
      candidates: candidates(),
    })

    expect(fan).toMatchObject({ stage: 'fan', picked: [] })
  })

  it('locks card selection and assigns positions by selection order', () => {
    const fan = {
      stage: 'fan' as const,
      question: '问题',
      spread: 'triple' as const,
      candidates: candidates(),
      picked: [7],
      flyingCard: 2,
    }

    expect(tarotFlowReducer(fan, { type: 'pick-card', index: 3 })).toBe(fan)
    expect(tarotFlowReducer(fan, { type: 'finish-pick', index: 3 })).toBe(fan)

    const settled = tarotFlowReducer(fan, { type: 'finish-pick', index: 2 })
    const secondFlying = tarotFlowReducer(settled, { type: 'pick-card', index: 5 })
    const secondSettled = tarotFlowReducer(secondFlying, { type: 'finish-pick', index: 5 })
    const reveal = tarotFlowReducer(
      tarotFlowReducer(secondSettled, { type: 'pick-card', index: 1 }),
      { type: 'finish-pick', index: 1 },
    )
    const ready = tarotFlowReducer(reveal, { type: 'enter-reveal' })

    expect(ready).toMatchObject({
      stage: 'reveal',
      drawn: [
        { card: MAJOR_ARCANA[7], position: '过去' },
        { card: MAJOR_ARCANA[2], position: '现在' },
        { card: MAJOR_ARCANA[5], position: '未来' },
      ],
      flipped: [false, false, false],
    })
  })

  it('requires all cards to be flipped before entering reading', () => {
    const reveal = {
      stage: 'reveal' as const,
      question: '问题',
      spread: 'single' as const,
      drawn: [{
        card: MAJOR_ARCANA[0],
        reversed: false,
        position: '核心指引',
      }],
      flipped: [false],
    }
    const reading = {} as TarotReading

    expect(tarotFlowReducer(reveal, { type: 'finish-reading', reading })).toBe(reveal)
    const flipped = tarotFlowReducer(reveal, { type: 'flip-card', index: 0 })
    expect(tarotFlowReducer(flipped, { type: 'finish-reading', reading })).toMatchObject({
      stage: 'reading',
      shared: false,
      reading,
    })
  })

  it('supports skipping directly from shuffle to card selection', () => {
    const shuffle = {
      stage: 'shuffle' as const,
      question: '问题',
      spread: 'decision' as const,
      progress: 20,
    }
    const fan = tarotFlowReducer(shuffle, {
      type: 'skip-ritual',
      candidates: candidates(),
    })

    expect(fan).toMatchObject({
      stage: 'fan',
      spread: 'decision',
      picked: [],
    })
  })
})
