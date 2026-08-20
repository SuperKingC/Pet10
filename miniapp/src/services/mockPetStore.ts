import Taro from '@tarojs/taro'
import { applyPetAction } from '../domain/petRules'
import type { MockPet, PetAction } from '../domain/types'

const storageKey = 'pet10_mock_pet'

export const initialMockPet: MockPet = {
  id: 'pet-test-1',
  name: '小多利',
  hunger: 60,
  mood: 80,
  energy: 70,
  health: 90,
}

export function getMockPet(): MockPet {
  return Taro.getStorageSync<MockPet>(storageKey) || initialMockPet
}

export function saveMockPet(pet: MockPet): MockPet {
  Taro.setStorageSync(storageKey, pet)
  return pet
}

export function performMockPetAction(action: PetAction): MockPet {
  return saveMockPet(applyPetAction(getMockPet(), action))
}

export function resetMockPet(): MockPet {
  Taro.removeStorageSync(storageKey)
  return initialMockPet
}
