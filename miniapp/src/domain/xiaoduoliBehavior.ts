export type XiaoduoliFaceAction = 'blink' | 'blinkTwice' | 'glanceLeft' | 'glanceRight'
export type XiaoduoliBodyAction = 'lookLeft' | 'lookRight' | 'hop'

export type XiaoduoliBehaviorStep = {
  delayMs: number
  durationMs: number
  face: XiaoduoliFaceAction | null
  body: XiaoduoliBodyAction | null
}

export const XIAODUOLI_BLINK_MS = 200
export const XIAODUOLI_DOUBLE_BLINK_MS = 380
export const XIAODUOLI_GLANCE_MS = 750
export const XIAODUOLI_LOOK_MS = 1700
export const XIAODUOLI_HOP_MS = 900
export const XIAODUOLI_IDLE_DELAY_MIN_MS = 1800
export const XIAODUOLI_IDLE_DELAY_MAX_MS = 6000

export function hashXiaoduoliSeed(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function createXiaoduoliRng(seed: number) {
  let t = seed
  return () => {
    t += 0x6d2b79f5
    let result = Math.imul(t ^ (t >>> 15), 1 | t)
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result)
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296
  }
}

export function nextXiaoduoliStep(random: () => number): XiaoduoliBehaviorStep {
  const roll = random()
  const delayMs = Math.round(
    XIAODUOLI_IDLE_DELAY_MIN_MS + random() * (XIAODUOLI_IDLE_DELAY_MAX_MS - XIAODUOLI_IDLE_DELAY_MIN_MS),
  )
  if (roll < 0.4) return step(delayMs, XIAODUOLI_BLINK_MS, 'blink', null)
  if (roll < 0.5) return step(delayMs, XIAODUOLI_DOUBLE_BLINK_MS, 'blinkTwice', null)
  if (roll < 0.58) return step(delayMs, XIAODUOLI_GLANCE_MS, 'glanceLeft', null)
  if (roll < 0.66) return step(delayMs, XIAODUOLI_GLANCE_MS, 'glanceRight', null)
  if (roll < 0.75) return step(delayMs, XIAODUOLI_LOOK_MS, 'glanceLeft', 'lookLeft')
  if (roll < 0.84) return step(delayMs, XIAODUOLI_LOOK_MS, 'glanceRight', 'lookRight')
  if (roll < 0.92) return step(delayMs + 600, XIAODUOLI_HOP_MS, null, 'hop')
  return step(delayMs, XIAODUOLI_LOOK_MS, null, random() < 0.5 ? 'lookLeft' : 'lookRight')
}

function step(
  delayMs: number,
  durationMs: number,
  face: XiaoduoliFaceAction | null,
  body: XiaoduoliBodyAction | null,
): XiaoduoliBehaviorStep {
  return { delayMs, durationMs, face, body }
}
