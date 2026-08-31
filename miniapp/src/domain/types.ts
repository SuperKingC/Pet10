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
/** 服务端心情引擎的五档心情（含被冷落推导；客户端本地推导只看数值） */
export type PetMoodState = 'happy' | 'content' | 'bored' | 'sulky' | 'angry'
export type PetState = MockPet & {
  level: number
  experience: number
  experienceToNextLevel: number
  intimacy: number
  moodLabel: PetMood
  moodState?: PetMoodState
  moodCaption?: string
}
