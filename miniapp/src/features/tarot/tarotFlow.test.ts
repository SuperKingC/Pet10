import { describe, expect, it } from 'vitest'
import { createInitialTarotFlow, tarotFlowReducer } from './tarotFlow'

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
})
