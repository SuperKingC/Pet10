import { describe, expect, it } from 'vitest'
import { createTarotFanFlight } from './tarotFanFlight'

describe('tarot fan card flight geometry', () => {
  it('preserves the source pose and lands exactly on the picked slot', () => {
    const flight = createTarotFanFlight(
      { left: 120, top: 420, width: 70, height: 112 },
      { left: 210, top: 120, width: 56, height: 88 },
      -15
    )

    expect(flight.overlay).toEqual({
      left: 120,
      top: 420,
      width: 70,
      height: 112
    })
    expect(flight.keyframes[0]).toMatchObject({
      transform: 'translate3d(0px, 0px, 0) rotate(-15deg) scale(1)',
      borderColor: 'rgba(218, 184, 105, .58)',
      boxShadow: '-2px 4px 0 rgba(8, 5, 14, .5), 0 10px 20px rgba(0, 0, 0, .35)'
    })
    expect(flight.keyframes).toHaveLength(5)
    expect(flight.keyframes[1]).toMatchObject({
      offset: 0.16,
      transform: 'translate3d(33.2px, -130.32px, 0) rotate(-8.25deg) scale(1.035)'
    })
    expect(flight.keyframes[2]).toMatchObject({
      offset: 0.5,
      transform: 'translate3d(68.06px, -263.84px, 0) rotate(-1.95deg) scale(1.012)'
    })
    expect(flight.keyframes[3]).toMatchObject({
      offset: 0.82,
      transform: 'translate3d(81.34px, -306.76px, 0) rotate(-0.3deg) scale(1.002)'
    })
    expect(flight.keyframes.at(-1)).toMatchObject({
      transform: 'translate3d(83px, -312px, 0) rotate(0deg) scale(0.8, 0.7857142857142857)',
      opacity: 1,
      borderColor: '#c8a654',
      boxShadow: '-2px 4px 0 rgba(8, 5, 14, .48), 0 10px 18px rgba(0, 0, 0, .3)'
    })
    expect(flight.options).toEqual({
      duration: 900,
      easing: 'cubic-bezier(.18, .82, .26, 1)',
      fill: 'forwards'
    })
  })

  it('bows away from the straight path before settling into the slot', () => {
    const flight = createTarotFanFlight(
      { left: 300, top: 400, width: 70, height: 112 },
      { left: 100, top: 100, width: 70, height: 112 },
      18
    )

    expect(flight.keyframes[1]).toMatchObject({
      offset: 0.16,
      transform: 'translate3d(-80px, -126px, 0) rotate(9.9deg) scale(1.035)'
    })
    expect(flight.keyframes[2]).toMatchObject({
      offset: 0.5,
      transform: 'translate3d(-164px, -254px, 0) rotate(2.34deg) scale(1.012)'
    })
  })
})
