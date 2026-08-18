import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { PetState } from '../domain/types'
import { PetActionBar } from './PetActionBar'
import { PetStatusCard } from './PetStatusCard'

const pet: PetState = {
  name: '小多利',
  level: 2,
  experience: 38,
  experienceToNextLevel: 100,
  hunger: 68,
  mood: 82,
  energy: 71,
  health: 94,
  intimacy: 76,
  moodLabel: 'happy'
}

describe('PetStatusLayout', () => {
  it('keeps the scene and experience content in the compact nest card', () => {
    const markup = renderToStaticMarkup(<PetStatusCard pet={pet} onOpenMemories={vi.fn()} />)

    expect(markup).toContain('pet-card__scene')
    expect(markup).toContain('pet-card__experience')
    expect(markup).toContain('/nest/wardrobe.png')
    expect(markup).toContain('/nest/photo-wall.png')
    expect(markup).toContain('/nest/tasks.png')
  })

  it('renders care actions inside a compact panel', () => {
    const markup = renderToStaticMarkup(<PetActionBar onAction={vi.fn()} />)

    expect(markup).toContain('pet-actions-panel')
    expect(markup).toContain('pet-action-button')
    expect(markup).toContain('/nest/action-feed.png')
    expect(markup).toContain('/nest/action-play.png')
    expect(markup).toContain('/nest/action-clean.png')
    expect(markup).toContain('/nest/action-sleep.png')
    expect(markup).toContain('aria-label="喂食"')
    expect(markup).not.toContain('>喂食</button>')
  })
})
