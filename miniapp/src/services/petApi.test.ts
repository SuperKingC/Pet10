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

  it('passes through the server mood engine fields when present', () => {
    expect(mapRoomPet({
      id: 'pet-1',
      name: '小多利',
      level: 1,
      experience: 0,
      experienceToNextLevel: 100,
      hunger: 80,
      mood: 20,
      energy: 80,
      health: 100,
      intimacy: 10,
      moodState: 'sulky',
      moodCaption: '委屈巴巴等着你'
    })).toMatchObject({ moodState: 'sulky', moodCaption: '委屈巴巴等着你' })
  })
})
