import { useReducer, useRef } from 'react'
import { drawCards, type TarotSpreadKey } from './tarotDeck'
import { createInitialTarotFlow, tarotFlowReducer } from './tarotFlow'
import { buildProfessionalReading } from './tarotReading'
import { saveReading } from './tarotHistory'

export function useTarotFlow() {
  const [state, dispatch] = useReducer(tarotFlowReducer, undefined, createInitialTarotFlow)
  const animationToken = useRef(0)

  function setQuestion(question: string) {
    dispatch({ type: 'set-question', question })
  }

  function setSpread(spread: TarotSpreadKey) {
    dispatch({ type: 'set-spread', spread })
  }

  function continueFlow() {
    dispatch({ type: 'continue' })
  }

  function setShuffleProgress(progress: number) {
    dispatch({ type: 'set-shuffle-progress', progress })
  }

  function startCut(reducedMotion: boolean) {
    animationToken.current += 1
    const token = animationToken.current
    dispatch({ type: 'start-cut', token })
    if (reducedMotion) dispatch({ type: 'finish-cut', token })
    return token
  }

  function finishCut(token: number) {
    dispatch({ type: 'finish-cut', token })
  }

  function enterFan() {
    if (state.stage !== 'cut') return
    dispatch({ type: 'enter-fan', drawn: drawCards(state.spread, 10) })
  }

  function skipRitual() {
    if (state.stage !== 'shuffle') return
    dispatch({ type: 'skip-ritual', drawn: drawCards(state.spread, 10) })
  }

  function pickCard(index: number, reducedMotion: boolean) {
    dispatch({ type: 'pick-card', index })
    if (reducedMotion) dispatch({ type: 'finish-pick', index })
  }

  function finishPick(index: number) {
    dispatch({ type: 'finish-pick', index })
  }

  function enterReveal() {
    dispatch({ type: 'enter-reveal' })
  }

  function flipCard(index: number) {
    dispatch({ type: 'flip-card', index })
  }

  function finishReading() {
    if (state.stage !== 'reveal' || !state.flipped.every(Boolean)) return
    const reading = buildProfessionalReading(state.question, state.spread, state.drawn)
    saveReading(reading)
    dispatch({ type: 'finish-reading', reading })
  }

  function markShared() {
    dispatch({ type: 'mark-shared' })
  }

  function restart() {
    dispatch({ type: 'restart' })
  }

  return {
    state,
    setQuestion,
    setSpread,
    continueFlow,
    setShuffleProgress,
    startCut,
    finishCut,
    enterFan,
    skipRitual,
    pickCard,
    finishPick,
    enterReveal,
    flipCard,
    finishReading,
    markShared,
    restart
  }
}
