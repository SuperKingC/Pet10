import type { PetState } from '../../domain/types'

type SpeechPet = Pick<PetState, 'hunger' | 'mood' | 'energy' | 'health' | 'moodLabel' | 'moodState'>

// 默认闲聊池：轮播用，心情好/平稳时的日常台词
const idlePhrases = [
  '开心地陪着你们',
  '最喜欢和你们待在一起啦',
  '要不要摸摸我呀',
  '今天也要一起玩哦',
  '嘿嘿，你们回来啦',
]

// 心情引擎低落档专属台词：无聊/委屈/生气（带点坏坏的小脾气，绝无恶意）
const moodPhrases: Record<Exclude<NonNullable<PetState['moodState']>, 'happy' | 'content'>, string[]> = {
  bored: ['好无聊呀，陪我玩玩嘛', '玩具都咬腻了…', '趴着数天花板呢'],
  sulky: ['哼，才不是在等你呢…', '哦～终于想起我啦？', '委屈巴巴，抱抱才好'],
  angry: ['气鼓鼓！要抱抱才能好', '哼！不理你了（尾巴却摇了摇）'],
}

function rotate(list: string[], index: number): string {
  return list[((index % list.length) + list.length) % list.length]
}

/**
 * 小多利场景飘字：需求状态优先（饿了/累/不舒服/困），其次心情引擎的低落档
 * （无聊/委屈/生气专属台词），再退回数值心情兜底，最后轮播闲聊池。
 * index 由调用方随时间递增，保证同一时刻各处文案一致且可测试。
 */
export function getXiaoduoliSpeech(pet: SpeechPet, index: number): string {
  if (pet.hunger <= 20) return '肚子咕咕叫了，想吃东西…'
  if (pet.energy <= 20) return '跑累啦，让我歇一会儿'
  if (pet.health <= 20) return '有点不舒服，多陪陪我'
  if (pet.moodLabel === 'sleepy') return '困困的，想打个盹'
  if (pet.moodState && pet.moodState in moodPhrases) return rotate(moodPhrases[pet.moodState], index)
  if (pet.mood <= 20) return '有点小情绪，哄哄我嘛'
  return rotate(idlePhrases, index)
}
