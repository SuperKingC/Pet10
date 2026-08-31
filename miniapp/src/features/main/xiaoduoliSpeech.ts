import type { PetState } from '../../domain/types'

type SpeechPet = Pick<PetState, 'hunger' | 'mood' | 'energy' | 'health' | 'moodLabel'>

// 默认闲聊池：轮播用，覆盖原状态栏「开心地陪着你们」一类的日常台词
const idlePhrases = [
  '开心地陪着你们',
  '最喜欢和你们待在一起啦',
  '要不要摸摸我呀',
  '今天也要一起玩哦',
  '嘿嘿，你们回来啦',
]

/**
 * 小多利场景飘字：需求状态优先（饿了/累/不舒服/困），其余按序轮播闲聊池。
 * index 由调用方随时间递增，保证同一时刻各处文案一致且可测试。
 */
export function getXiaoduoliSpeech(pet: SpeechPet, index: number): string {
  if (pet.hunger <= 20) return '肚子咕咕叫了，想吃东西…'
  if (pet.energy <= 20) return '跑累啦，让我歇一会儿'
  if (pet.health <= 20) return '有点不舒服，多陪陪我'
  if (pet.moodLabel === 'sleepy') return '困困的，想打个盹'
  if (pet.mood <= 20) return '有点小情绪，哄哄我嘛'
  return idlePhrases[((index % idlePhrases.length) + idlePhrases.length) % idlePhrases.length]
}
