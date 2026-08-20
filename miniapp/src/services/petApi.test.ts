import { describe, expect, it } from 'vitest'
import { mapRoomPet } from './petMapper'

describe('mapRoomPet', () => {
  it('maps the server pet into the miniapp pet shape', () => {
    expect(mapRoomPet({
      id: 'pet-1',
      name: '小多利',
      level: 2,
      experience: 8,
      experienceToNextLevel: 20,
      hunger: 70,
      mood: 80,
      energy: 60,
      health: 90,
      intimacy: 44,
      updatedAt: '2026-08-20T00:00:00.000Z'
    })).toEqual({
      id: 'pet-1',
      name: '小多利',
      level: 2,
      experience: 8,
      experienceToNextLevel: 20,
      hunger: 70,
      mood: 80,
      energy: 60,
      health: 90,
      intimacy: 44,
      moodLabel: 'happy'
    })
  })
})
