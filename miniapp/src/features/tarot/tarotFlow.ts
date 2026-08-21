export type MiniappTarotSpread = 'single' | 'three'

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

export type MiniappTarotFlowState = QuestionState | SpreadState

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

  if (state.stage !== 'question') return state
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
}
