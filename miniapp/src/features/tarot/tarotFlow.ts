import type { MiniappTarotSpread } from './tarotSpreads'

interface QuestionState {
  stage: 'question'
  question: string
  promptOffset: number
  spread: MiniappTarotSpread
}

interface SpreadState {
  stage: 'spread'
  question: string
  spread: MiniappTarotSpread
}

interface ShuffleState {
  stage: 'shuffle'
  question: string
  spread: MiniappTarotSpread
  progress: number
}

export type MiniappTarotFlowState = QuestionState | SpreadState | ShuffleState

export type MiniappTarotFlowEvent =
  | { type: 'set-question'; question: string }
  | { type: 'set-spread'; spread: MiniappTarotSpread }
  | { type: 'continue' }
  | { type: 'restart' }

export function createInitialTarotFlow(): MiniappTarotFlowState {
  return {
    stage: 'question',
    question: '',
    promptOffset: 0,
    spread: 'single',
  }
}

export function tarotFlowReducer(
  state: MiniappTarotFlowState,
  event: MiniappTarotFlowEvent,
): MiniappTarotFlowState {
  if (event.type === 'restart') return createInitialTarotFlow()

  switch (state.stage) {
    case 'question':
      if (event.type === 'set-question') return { ...state, question: event.question }
      if (event.type === 'set-spread') return { ...state, spread: event.spread }
      if (event.type === 'continue' && state.question.trim()) {
        return {
          stage: 'spread',
          question: state.question.trim(),
          spread: state.spread,
        }
      }
      return state

    case 'spread':
      if (event.type === 'set-spread') return { ...state, spread: event.spread }
      if (event.type === 'continue') {
        return {
          stage: 'shuffle',
          question: state.question,
          spread: state.spread,
          progress: 0,
        }
      }
      return state

    case 'shuffle':
      return state
  }
}
