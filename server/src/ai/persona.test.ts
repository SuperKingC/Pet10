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

  it('keeps the mischievous-child persona with bounded sassiness', () => {
    const prompt = buildSystemPrompt({
      pet,
      memories: [],
      owners: [],
      roomType: 'pair',
      hour: 12
    })

    expect(prompt).toContain('机灵调皮')
    expect(prompt).toContain('阴阳怪气')
    expect(prompt).toContain('没有恶意')
    // 阴阳怪气必须被限定在心情/被惹到时，防止日常一直阴阳
    expect(prompt).toContain('只在')
  })

  it('injects the pet mood tone hint when provided', () => {
    const prompt = buildSystemPrompt({
      pet,
      memories: [],
      owners: [],
      moodText: '你现在很委屈，说话带点坏坏的阴阳怪气',
      roomType: 'pair',
      hour: 12
    })

    expect(prompt).toContain('小多利现在的心情：你现在很委屈')
  })
})
