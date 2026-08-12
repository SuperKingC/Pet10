import { describe, expect, it } from 'vitest'
import type { Pet } from '../domain/models.js'
import { buildSystemPrompt } from './persona.js'

const pet: Pet = {
  id: 'pet-1',
  relationshipId: 'relationship-1',
  roomId: 'room-1',
  name: '小多利',
  level: 1,
  experience: 0,
  experienceToNextLevel: 100,
  hunger: 80,
  mood: 80,
  energy: 80,
  health: 100,
  intimacy: 30,
  updatedAt: new Date('2026-08-12T08:00:00.000Z')
}

describe('buildSystemPrompt', () => {
  it('allows clear structured answers for professional and researched questions', () => {
    const prompt = buildSystemPrompt({
      pet,
      memories: [],
      owners: [],
      roomType: 'pet_dm',
      hour: 12
    })

    expect(prompt).toContain('专业、价格、攻略或检索资料')
    expect(prompt).toContain('可以分点')
    expect(prompt).toContain('准确和清楚优先')
  })
})
