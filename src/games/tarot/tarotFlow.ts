import { SPREADS, type DrawnCard, type TarotSpreadKey } from './tarotDeck'
import type { TarotAnimationRun } from './tarotAnimation'
import type { TarotReading } from './tarotReading'

interface QuestionState {
  stage: 'question'
  question: string
  promptOffset: number
  spread: TarotSpreadKey
}

interface SpreadState {
  stage: 'spread'
  question: string
  spread: TarotSpreadKey
}

interface ShuffleState {
  stage: 'shuffle'
  question: string
  spread: TarotSpreadKey
  progress: number
}

interface CutState {
  stage: 'cut'
  question: string
  spread: TarotSpreadKey
  cutCount: number
  activeAnimation?: TarotAnimationRun
}

interface FanState {
  stage: 'fan'
  question: string
  spread: TarotSpreadKey
  drawn: DrawnCard[]
  picked: number[]
  flyingCard?: number
}

interface RevealState {
  stage: 'reveal'
  question: string
  spread: TarotSpreadKey
  drawn: DrawnCard[]
  flipped: boolean[]
}

interface ReadingState {
  stage: 'reading'
  question: string
  spread: TarotSpreadKey
  drawn: DrawnCard[]
  reading: TarotReading
  shared: boolean
}

export type TarotFlowState =
  | QuestionState
  | SpreadState
  | ShuffleState
  | CutState
  | FanState
  | RevealState
  | ReadingState

export type TarotFlowEvent =
  | { type: 'set-question'; question: string }
  | { type: 'set-spread'; spread: TarotSpreadKey }
  | { type: 'continue' }
  | { type: 'set-shuffle-progress'; progress: number }
  | { type: 'start-cut'; token: number }
  | { type: 'finish-cut'; token?: number }
  | { type: 'enter-fan'; drawn: DrawnCard[] }
  | { type: 'skip-ritual'; drawn: DrawnCard[] }
  | { type: 'pick-card'; index: number }
  | { type: 'finish-pick'; index: number }
  | { type: 'enter-reveal' }
  | { type: 'flip-card'; index: number }
  | { type: 'finish-reading'; reading: TarotReading }
  | { type: 'mark-shared' }
  | { type: 'restart' }

export function createInitialTarotFlow(): TarotFlowState {
  return {
    stage: 'question',
    question: '',
    promptOffset: 0,
    spread: 'single'
  }
}

function spreadCount(spread: TarotSpreadKey): number {
  return SPREADS.find((item) => item.key === spread)?.count ?? 1
}

export function tarotFlowReducer(state: TarotFlowState, event: TarotFlowEvent): TarotFlowState {
  if (event.type === 'restart') return createInitialTarotFlow()

  switch (state.stage) {
    case 'question':
      if (event.type === 'set-question') return { ...state, question: event.question }
      if (event.type === 'set-spread') return { ...state, spread: event.spread }
      if (event.type === 'continue' && state.question.trim()) {
        return { stage: 'spread', question: state.question.trim(), spread: state.spread }
      }
      return state

    case 'spread':
      if (event.type === 'set-spread') return { ...state, spread: event.spread }
      if (event.type === 'continue') {
        return { stage: 'shuffle', question: state.question, spread: state.spread, progress: 0 }
      }
      return state

    case 'shuffle':
      if (event.type === 'set-shuffle-progress') {
        return { ...state, progress: Math.max(0, Math.min(100, event.progress)) }
      }
      if (event.type === 'continue' && state.progress >= 100) {
        return { stage: 'cut', question: state.question, spread: state.spread, cutCount: 0 }
      }
      if (event.type === 'skip-ritual') {
        return {
          stage: 'fan',
          question: state.question,
          spread: state.spread,
          drawn: event.drawn,
          picked: []
        }
      }
      return state

    case 'cut':
      if (event.type === 'start-cut' && !state.activeAnimation) {
        return { ...state, activeAnimation: { name: 'cut-upper', token: event.token } }
      }
      if (
        event.type === 'finish-cut' &&
        state.activeAnimation &&
        (event.token === undefined || event.token === state.activeAnimation.token)
      ) {
        return { ...state, cutCount: state.cutCount + 1, activeAnimation: undefined }
      }
      if (event.type === 'enter-fan' && state.cutCount > 0 && !state.activeAnimation) {
        return {
          stage: 'fan',
          question: state.question,
          spread: state.spread,
          drawn: event.drawn,
          picked: []
        }
      }
      return state

    case 'fan':
      if (
        event.type === 'pick-card' &&
        state.flyingCard === undefined &&
        !state.picked.includes(event.index) &&
        state.picked.length < spreadCount(state.spread) &&
        event.index >= 0 &&
        event.index < state.drawn.length
      ) {
        return { ...state, flyingCard: event.index }
      }
      if (event.type === 'finish-pick' && state.flyingCard === event.index) {
        return {
          ...state,
          picked: [...state.picked, event.index],
          flyingCard: undefined
        }
      }
      if (
        event.type === 'enter-reveal' &&
        state.flyingCard === undefined &&
        state.picked.length === spreadCount(state.spread)
      ) {
        const drawn = state.picked.map((index) => state.drawn[index])
        return {
          stage: 'reveal',
          question: state.question,
          spread: state.spread,
          drawn,
          flipped: drawn.map(() => false)
        }
      }
      return state

    case 'reveal':
      if (
        event.type === 'flip-card' &&
        event.index >= 0 &&
        event.index < state.flipped.length &&
        !state.flipped[event.index]
      ) {
        return {
          ...state,
          flipped: state.flipped.map((flipped, index) => index === event.index ? true : flipped)
        }
      }
      if (event.type === 'finish-reading' && state.flipped.every(Boolean)) {
        return {
          stage: 'reading',
          question: state.question,
          spread: state.spread,
          drawn: state.drawn,
          reading: event.reading,
          shared: false
        }
      }
      return state

    case 'reading':
      if (event.type === 'mark-shared') return { ...state, shared: true }
      return state
  }
}
