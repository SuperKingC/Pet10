export type TarotAnimationName =
  | 'cut-upper'
  | 'cut-upper-reverse'
  | 'cut-lower'
  | 'pick-card'
  | 'reveal-card'

export interface TarotAnimationRun {
  name: TarotAnimationName
  token: number
}

const MOTION_DURATIONS: Record<TarotAnimationName, number> = {
  'cut-upper': 1150,
  'cut-upper-reverse': 1150,
  'cut-lower': 1150,
  'pick-card': 820,
  'reveal-card': 1250
}

export function advancePressProgress(progress: number, elapsedMs: number): number {
  if (elapsedMs <= 0) return progress
  return Math.min(100, progress + elapsedMs * 0.072)
}

export function createTarotAnimationRun(name: TarotAnimationName, token: number): TarotAnimationRun {
  return { name, token }
}

export function animationMatches(
  active: TarotAnimationRun | undefined,
  name: TarotAnimationName,
  token: number
): boolean {
  return active?.name === name && active.token === token
}

export function tarotMotionDuration(name: TarotAnimationName, reducedMotion: boolean): number {
  return reducedMotion ? 0 : MOTION_DURATIONS[name]
}
