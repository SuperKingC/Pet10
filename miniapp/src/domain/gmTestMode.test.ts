import { describe, expect, it } from 'vitest'
import {
  MOCK_INVENTORY,
  MOCK_WARDROBE_CATALOG,
  applyMockPetAction,
  buildMockWardrobeView
} from './gmTestMode'
import { EMPTY_OUTFIT, outfitPiecesFromView, type OutfitPieces } from './wardrobeModel'
import type { PetState } from './types'

const basePet: PetState = {
  id: 'pet-1',
  name: '小多利',
  hunger: 20,
  mood: 30,
  energy: 40,
  health: 50,
  level: 1,
  experience: 95,
  experienceToNextLevel: 100,
  intimacy: 0,
  moodLabel: 'happy',
  moodState: 'sulky'
}

describe('gm test mode', () => {
  it('maps each action to its restored stat and clamps at 100', () => {
    expect(applyMockPetAction(basePet, 'feed')).toMatchObject({ hunger: 38, mood: 30, energy: 40, health: 50 })
    expect(applyMockPetAction(basePet, 'play')).toMatchObject({ hunger: 20, mood: 48 })
    expect(applyMockPetAction(basePet, 'clean')).toMatchObject({ hunger: 20, health: 68 })
    expect(applyMockPetAction(basePet, 'sleep')).toMatchObject({ hunger: 20, energy: 58 })
    const full = applyMockPetAction({ ...basePet, hunger: 90 }, 'feed')
    expect(full.hunger).toBe(100)
    // 原状态不被修改
    expect(basePet.hunger).toBe(20)
  })

  it('gains experience, levels up on rollover and drops the server mood caption', () => {
    const next = applyMockPetAction(basePet, 'play')
    expect(next).toMatchObject({ experience: 5, level: 2, experienceToNextLevel: 100 })
    expect(next.moodState).toBeUndefined()
    expect(next.moodCaption).toBeUndefined()
  })

  it('keeps the mock catalog in sync with the suit key union and all unlocked', () => {
    expect(MOCK_WARDROBE_CATALOG.map((item) => item.key)).toEqual([
      'default', 'scarf', 'hoodie', 'overalls', 'dress', 'raincoat', 'pajamas', 'bag', 'hat'
    ])
    const view = buildMockWardrobeView()
    expect(view.items.every((item) => item.unlocked)).toBe(true)
    expect(view.match).toEqual({ myPick: null, partnerPicked: false, matchedToday: false, streak: 0, bestStreak: 0 })
  })

  it('round-trips a full outfit through the mock view', () => {
    const pieces: OutfitPieces = { body: 'pajamas', hat: 'hat', scarf: 'scarf', bag: 'bag' }
    const view = buildMockWardrobeView(pieces)
    expect(view.equipped).toBe('pajamas')
    expect(outfitPiecesFromView(view)).toEqual(pieces)
    expect(outfitPiecesFromView(buildMockWardrobeView())).toEqual(EMPTY_OUTFIT)
  })

  it('mocks a plentiful inventory (with bone) so every care action stays tappable', () => {
    expect(MOCK_INVENTORY.items.map((item) => item.itemId)).toEqual(['dog_food', 'ball', 'soap', 'bone'])
    expect(MOCK_INVENTORY.items.every((item) => item.count > 0)).toBe(true)
    // 展示名与改名后的道具目录一致
    expect(MOCK_INVENTORY.items.find((item) => item.itemId === 'dog_food')?.name).toBe('牛奶')
  })
})
