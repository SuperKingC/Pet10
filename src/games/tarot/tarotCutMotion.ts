export const TAROT_CUT_DURATION_MS = 1350

interface TarotCutPileFrame {
  x: number
  y: number
  z: number
  rotateX: number
  rotateZ: number
  brightness: number
  zIndex: number
}

interface TarotCutShadowFrame {
  x: number
  scale: number
  opacity: number
}

export interface TarotCutFrame {
  upper: TarotCutPileFrame
  lower: TarotCutPileFrame
  shadow: TarotCutShadowFrame
}

function clampProgress(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function smootherStep(value: number): number {
  const progress = clampProgress(value)
  return progress * progress * progress * (progress * (progress * 6 - 15) + 10)
}

function mix(from: number, to: number, progress: number): number {
  return from + (to - from) * progress
}

function normalizeZero(value: number): number {
  return Object.is(value, -0) ? 0 : value
}

export function getTarotCutFrame(progress: number, compact: boolean, settled = false): TarotCutFrame {
  const easedProgress = smootherStep(progress)
  const horizontalDistance = compact ? 76 : 112
  const outward = smootherStep(easedProgress / .53)
  const inward = smootherStep((easedProgress - .61) / .39)
  const upperX = horizontalDistance * outward * (1 - inward)
  const lift = Math.sin(Math.PI * clampProgress(easedProgress / .76))
  const landing = smootherStep((easedProgress - .69) / .31)
  const lowerRise = smootherStep((easedProgress - .43) / .43)
  const upperStartY = settled ? -13 : 0
  const upperStartZ = settled ? 20 : 0
  const upperStartBrightness = settled ? 1.13 : 1
  const lowerStartY = settled ? -5 : 22
  const lowerStartZ = settled ? -126 : -20
  const lowerStartBrightness = settled ? .78 : .88

  return {
    upper: {
      x: upperX,
      y: normalizeZero(mix(upperStartY, -5, landing) - 58 * lift),
      z: normalizeZero(mix(upperStartZ, -126, landing) + 88 * lift),
      rotateX: -11 * lift + 10 * landing,
      rotateZ: 5 * Math.sin(Math.PI * easedProgress),
      brightness: mix(upperStartBrightness, .78, landing) + lift * .17,
      zIndex: easedProgress < .7 ? 3 : 0
    },
    lower: {
      x: 0,
      y: mix(lowerStartY, -13, lowerRise),
      z: mix(lowerStartZ, 20, lowerRise),
      rotateX: -2.8 * Math.sin(Math.PI * lowerRise),
      rotateZ: 0,
      brightness: mix(lowerStartBrightness, 1.13, lowerRise),
      zIndex: easedProgress < .7 ? 1 : 2
    },
    shadow: {
      x: upperX * .52,
      scale: 1 - lift * .23 + landing * .04,
      opacity: .7 - lift * .4 + landing * .36
    }
  }
}
