import type { MiniappTarotSpread } from './tarotSpreads'
import {
  materializeDrawnCards,
  type DrawnTarotCard,
  type TarotCandidate,
} from './tarotCards'
import type { TarotReading } from './tarotReading'

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

interface CutState {
  stage: 'cut'
  question: string
  spread: MiniappTarotSpread
  cutCount: number
  cutting: boolean
}

interface FanState {
  stage: 'fan'
  question: string
  spread: MiniappTarotSpread
  candidates: TarotCandidate[]
  picked: number[]
  flyingCard?: number
}

interface RevealState {
  stage: 'reveal'
  question: string
  spread: MiniappTarotSpread
  drawn: DrawnTarotCard[]
  flipped: boolean[]
}

interface ReadingState {
  stage: 'reading'
  question: string
  spread: MiniappTarotSpread
  drawn: DrawnTarotCard[]
  reading: TarotReading
  shared: boolean
}

export type MiniappTarotFlowState =
  | QuestionState
  | SpreadState
  | ShuffleState
  | CutState
  | FanState
  | RevealState
  | ReadingState

export type MiniappTarotFlowEvent =
  | { type: 'set-question'; question: string }
  | { type: 'set-spread'; spread: MiniappTarotSpread }
  | { type: 'continue' }
  | { type: 'set-shuffle-progress'; progress: number }
  | { type: 'skip-ritual'; candidates: TarotCandidate[] }
  | { type: 'start-cut' }
  | { type: 'finish-cut' }
  | { type: 'enter-fan'; candidates: TarotCandidate[] }
  | { type: 'pick-card'; index: number }
  | { type: 'finish-pick'; index: number }
  | { type: 'enter-reveal' }
  | { type: 'flip-card'; index: number }
  | { type: 'finish-reading'; reading: TarotReading }
  | { type: 'mark-shared' }
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
      if (event.type === 'set-shuffle-progress') {
        return { ...state, progress: Math.max(0, Math.min(100, event.progress)) }
      }
      if (event.type === 'continue' && state.progress >= 100) {
        return {
          stage: 'cut',
          question: state.question,
          spread: state.spread,
          cutCount: 0,
          cutting: false,
        }
      }
      if (event.type === 'skip-ritual') {
        return {
          stage: 'fan',
          question: state.question,
          spread: state.spread,
          candidates: event.candidates,
          picked: [],
        }
      }
      return state

    case 'cut':
      if (event.type === 'start-cut' && !state.cutting) {
        return { ...state, cutting: true }
      }
      if (event.type === 'finish-cut' && state.cutting) {
        return { ...state, cutting: false, cutCount: state.cutCount + 1 }
      }
      if (event.type === 'enter-fan' && state.cutCount > 0 && !state.cutting) {
        return {
          stage: 'fan',
          question: state.question,
          spread: state.spread,
          candidates: event.candidates,
          picked: [],
        }
      }
      return state

    case 'fan':
      if (
        event.type === 'pick-card' &&
        state.flyingCard === undefined &&
        !state.picked.includes(event.index) &&
        event.index >= 0 &&
        event.index < state.candidates.length &&
        state.picked.length < spreadCount(state.spread)
      ) {
        return { ...state, flyingCard: event.index }
      }
      if (event.type === 'finish-pick' && state.flyingCard === event.index) {
        return {
          ...state,
          picked: [...state.picked, event.index],
          flyingCard: undefined,
        }
      }
      if (
        event.type === 'enter-reveal' &&
        state.flyingCard === undefined &&
        state.picked.length === spreadCount(state.spread)
      ) {
        const drawn = materializeDrawnCards(state.candidates, state.picked, state.spread)
        return {
          stage: 'reveal',
          question: state.question,
          spread: state.spread,
          drawn,
          flipped: drawn.map(() => false),
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
          flipped: state.flipped.map((flipped, index) => index === event.index || flipped),
        }
      }
      if (event.type === 'finish-reading' && state.flipped.every(Boolean)) {
        return {
          stage: 'reading',
          question: state.question,
          spread: state.spread,
          drawn: state.drawn,
          reading: event.reading,
          shared: false,
        }
      }
      return state

    case 'reading':
      if (event.type === 'mark-shared') return { ...state, shared: true }
      return state
  }
}

function spreadCount(spread: MiniappTarotSpread): number {
  if (spread === 'decision') return 5
  if (spread === 'single') return 1
  return 3
}
