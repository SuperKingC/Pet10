import { describe, expect, it } from 'vitest'
import { MAJOR_ARCANA, type DrawnCard } from './tarotDeck'
import { createInitialTarotFlow, tarotFlowReducer } from './tarotFlow'
import type { TarotReading } from './tarotReading'

function drawnCard(index: number): DrawnCard {
  return {
    card: MAJOR_ARCANA[index],
    reversed: false,
    position: ['过去', '现在', '未来'][index] ?? '指引'
  }
}

describe('tarot flow', () => {
  it('rejects attempts to skip required ritual stages', () => {
    const initial = createInitialTarotFlow()

    expect(tarotFlowReducer(initial, { type: 'continue' })).toBe(initial)
    expect(tarotFlowReducer(initial, { type: 'finish-cut' })).toBe(initial)
    expect(tarotFlowReducer(initial, { type: 'enter-reveal' })).toBe(initial)
  })

  it('requires completed shuffle and one completed cut before entering the fan', () => {
    const question = tarotFlowReducer(createInitialTarotFlow(), {
      type: 'set-question',
      question: '我应该怎样重新找到自己的节奏？'
    })
    const spread = tarotFlowReducer(question, { type: 'continue' })
    const shuffle = tarotFlowReducer(spread, { type: 'continue' })

    expect(shuffle.stage).toBe('shuffle')
    expect(tarotFlowReducer(shuffle, { type: 'continue' })).toBe(shuffle)

    const completedShuffle = tarotFlowReducer(shuffle, { type: 'set-shuffle-progress', progress: 100 })
    const cut = tarotFlowReducer(completedShuffle, { type: 'continue' })
    expect(cut.stage).toBe('cut')
    expect(tarotFlowReducer(cut, { type: 'enter-fan', drawn: [drawnCard(0)] })).toBe(cut)

    const cutting = tarotFlowReducer(cut, { type: 'start-cut', token: 1 })
    const cutComplete = tarotFlowReducer(cutting, { type: 'finish-cut', token: 1 })
    const fan = tarotFlowReducer(cutComplete, { type: 'enter-fan', drawn: [drawnCard(0)] })

    expect(fan.stage).toBe('fan')
  })

  it('ignores stale animation completions and locks card selection while one card flies', () => {
    const cut = {
      stage: 'cut' as const,
      question: '问题',
      spread: 'triple' as const,
      cutCount: 0,
      activeAnimation: { name: 'cut-upper' as const, token: 4 }
    }
    expect(tarotFlowReducer(cut, { type: 'finish-cut', token: 3 })).toBe(cut)

    const fan = {
      stage: 'fan' as const,
      question: '问题',
      spread: 'triple' as const,
      drawn: [drawnCard(0), drawnCard(1), drawnCard(2)],
      picked: [0],
      flyingCard: 1
    }

    expect(tarotFlowReducer(fan, { type: 'pick-card', index: 2 })).toBe(fan)
    expect(tarotFlowReducer(fan, { type: 'finish-pick', index: 2 })).toBe(fan)

    const settled = tarotFlowReducer(fan, { type: 'finish-pick', index: 1 })
    expect(settled).toMatchObject({ stage: 'fan', picked: [0, 1], flyingCard: undefined })
  })

  it('requires exactly the spread card count before reveal and all cards before reading', () => {
    const cards = [drawnCard(0), drawnCard(1), drawnCard(2)]
    const incompleteFan = {
      stage: 'fan' as const,
      question: '问题',
      spread: 'triple' as const,
      drawn: cards,
      picked: [0, 1]
    }
    expect(tarotFlowReducer(incompleteFan, { type: 'enter-reveal' })).toBe(incompleteFan)

    const fan = { ...incompleteFan, picked: [0, 1, 2] }
    const reveal = tarotFlowReducer(fan, { type: 'enter-reveal' })
    expect(reveal).toMatchObject({ stage: 'reveal', flipped: [false, false, false] })

    const reading = {} as TarotReading
    expect(tarotFlowReducer(reveal, { type: 'finish-reading', reading })).toBe(reveal)
    const oneFlipped = tarotFlowReducer(reveal, { type: 'flip-card', index: 0 })
    expect(tarotFlowReducer(oneFlipped, { type: 'finish-reading', reading })).toBe(oneFlipped)
  })

  it('resets the complete flow to a clean initial state', () => {
    const reading = {
      stage: 'reading' as const,
      question: '旧问题',
      spread: 'single' as const,
      drawn: [drawnCard(0)],
      reading: {} as TarotReading,
      shared: true
    }

    expect(tarotFlowReducer(reading, { type: 'restart' })).toEqual(createInitialTarotFlow())
  })
})
