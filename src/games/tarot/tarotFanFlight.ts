export interface TarotFlightRect {
  left: number
  top: number
  width: number
  height: number
}

export interface TarotFanFlight {
  overlay: TarotFlightRect
  keyframes: Keyframe[]
  options: KeyframeAnimationOptions
}

function formatNumber(value: number): string {
  return `${Math.round(value * 10000) / 10000}`
}

function pixels(value: number): string {
  return `${formatNumber(value)}px`
}

export function createTarotFanFlight(
  source: TarotFlightRect,
  target: TarotFlightRect,
  sourceAngle: number
): TarotFanFlight {
  const deltaX = target.left + target.width / 2 - (source.left + source.width / 2)
  const deltaY = target.top + target.height / 2 - (source.top + source.height / 2)
  const targetScaleX = target.width / source.width
  const targetScaleY = target.height / source.height
  const targetTransform = `translate3d(${pixels(deltaX)}, ${pixels(deltaY)}, 0) rotate(0deg) scale(${targetScaleX}, ${targetScaleY})`

  return {
    overlay: {
      left: source.left,
      top: source.top,
      width: source.width,
      height: source.height
    },
    keyframes: [
      {
        offset: 0,
        transform: `translate3d(0px, 0px, 0) rotate(${formatNumber(sourceAngle)}deg) scale(1)`,
        opacity: 1,
        borderColor: 'rgba(218, 184, 105, .58)',
        boxShadow: '-2px 4px 0 rgba(8, 5, 14, .5), 0 10px 20px rgba(0, 0, 0, .35)'
      },
      {
        offset: 0.16,
        transform: `translate3d(${pixels(deltaX * 0.4)}, ${pixels(deltaY * 0.36 - 18)}, 0) rotate(${formatNumber(sourceAngle * 0.55)}deg) scale(1.035)`,
        opacity: 1,
        borderColor: 'rgba(218, 184, 105, .66)',
        boxShadow: '-2px 4px 0 rgba(8, 5, 14, .49), 0 11px 20px rgba(0, 0, 0, .34)'
      },
      {
        offset: 0.5,
        transform: `translate3d(${pixels(deltaX * 0.82)}, ${pixels(deltaY * 0.82 - 8)}, 0) rotate(${formatNumber(sourceAngle * 0.13)}deg) scale(1.012)`,
        opacity: 1,
        borderColor: 'rgba(211, 178, 98, .82)',
        boxShadow: '-2px 4px 0 rgba(8, 5, 14, .48), 0 11px 19px rgba(0, 0, 0, .32)'
      },
      {
        offset: 0.82,
        transform: `translate3d(${pixels(deltaX * 0.98)}, ${pixels(deltaY * 0.98 - 1)}, 0) rotate(${formatNumber(sourceAngle * 0.02)}deg) scale(1.002)`,
        opacity: 1,
        borderColor: 'rgba(202, 169, 86, .96)',
        boxShadow: '-2px 4px 0 rgba(8, 5, 14, .48), 0 10px 18px rgba(0, 0, 0, .3)'
      },
      {
        offset: 1,
        transform: targetTransform,
        opacity: 1,
        borderColor: '#c8a654',
        boxShadow: '-2px 4px 0 rgba(8, 5, 14, .48), 0 10px 18px rgba(0, 0, 0, .3)'
      }
    ],
    options: {
      duration: 900,
      easing: 'cubic-bezier(.18, .82, .26, 1)',
      fill: 'forwards'
    }
  }
}
