export type PetAction = 'feed' | 'play' | 'clean' | 'sleep'

export type MockPet = {
  id: string
  name: string
  hunger: number
  mood: number
  energy: number
  health: number
}

export type PetMood = 'happy' | 'hungry' | 'sleepy' | 'clingy'
export type PetState = MockPet & {
  level: number
  experience: number
  experienceToNextLevel: number
  intimacy: number
  moodLabel: PetMood
}
