import { createRoot } from 'react-dom/client'
import { act } from 'react'
import { describe, expect, it } from 'vitest'
import { TarotCard } from './TarotCard'
import { MAJOR_ARCANA, type DrawnCard } from './tarotDeck'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('TarotCard reversal', () => {
  it('rotates only the artwork while keeping labels upright', async () => {
    const host = document.createElement('div')
    const root = createRoot(host)
    const drawn: DrawnCard = { card: MAJOR_ARCANA[13], reversed: true, position: '核心指引' }

    await act(async () => root.render(<TarotCard drawn={drawn} flipped />))

    expect(host.querySelector('.tarot-card__art--reversed')).not.toBeNull()
    expect(host.querySelector('.tarot-card__labels')?.textContent).toContain('逆位')
    expect(host.querySelector('.tarot-card__labels')?.closest('.tarot-card__art--reversed')).toBeNull()
    expect(host.querySelector('.tarot-card__labels')?.parentElement).toBe(host.querySelector('.tarot-card'))
    expect(host.querySelector('.tarot-card__body')).not.toBeNull()
    expect(host.querySelector('.tarot-card--flipped')?.getAttribute('style')).toBeNull()
    expect(host.querySelector('.tarot-card__art--crop')).not.toBeNull()
    await act(async () => root.unmount())
  })
})
