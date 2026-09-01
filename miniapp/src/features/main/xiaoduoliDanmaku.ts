import type { PetState } from '../../domain/types'

type DanmakuPet = Pick<PetState, 'hunger' | 'mood' | 'energy' | 'health' | 'moodLabel' | 'moodState'>

/** 弹幕计划：所有状态都飘（需求告急/低落时降频并换专属文案），只是频率和语气不同 */
export interface DanmakuPlan {
  intervalMs: number
  burst: number
}

/** 同屏弹幕上限：超过后等旧弹幕漂出再补，避免糊满背景 */
export const DANMAKU_MAX_CONCURRENT = 5

// 激动档弹幕：心情引擎 happy 档或数值心情很高时，像 b 站弹幕一样高频飘
const excitedPool = [
  '汪汪！开心到起飞～',
  '今天也超级幸福！',
  '尾巴要摇断啦！',
  '最幸福的小狗就是我！',
  '开心得想打滚！',
  '汪！你们最好啦！',
  '转圈圈！再转圈圈！',
  '撒花✨撒花✨',
]

// 平稳档弹幕：content 时低频飘，保持一点活泼
const calmPool = [
  '唔，晒太阳真舒服',
  '偷偷打个哈欠…',
  '今天也风平浪静',
  '耳朵在听你们说话哦',
  '地毯软软的，好踩',
]

// 需求告急档弹幕：饿了/累/病/困时用抱怨文案提醒照顾，频率居中
const needyPool = [
  '狗盆空空，汪！',
  '饿扁了…闻到饭香了吗',
  '肚子咕咕抗议中！',
  '体力见底啦，走不动了…',
  '眼皮在打架，好困…',
  '有点不舒服，呜…',
]

// 心情引擎低落档弹幕：无聊/委屈/生气的小脾气
const gloomyPool = [
  '好无聊呀——陪我玩！',
  '哼，都不理我…',
  '气鼓鼓！要抱抱才好',
  '委屈巴巴，揉揉头嘛',
  '玩具都咬腻了…',
]

function rotate(list: string[], index: number): string {
  return list[((index % list.length) + list.length) % list.length]
}

function lowNeedsKind(pet: DanmakuPet): 'hungry' | 'tired' | 'sick' | 'sleepy' | null {
  if (pet.hunger <= 20) return 'hungry'
  if (pet.energy <= 20) return 'tired'
  if (pet.health <= 20) return 'sick'
  if (pet.moodLabel === 'sleepy') return 'sleepy'
  return null
}

/**
 * 弹幕触发规则：任何状态都飘，情绪决定频率与语气——
 * 激动（心情引擎 happy 档或 mood ≥ 75）7s 一条、状态刷新连发 3 条；
 * 平稳（content 或 mood ≥ 45）12s 一条；需求告急（饿/累/病/困）10s 一条抱怨文案；
 * 心情引擎低落档（bored/sulky/angry）14s 一条小脾气。
 */
export function getDanmakuPlan(pet: DanmakuPet): DanmakuPlan {
  if (pet.moodState === 'bored' || pet.moodState === 'sulky' || pet.moodState === 'angry') {
    return { intervalMs: 14000, burst: 1 }
  }
  if (lowNeedsKind(pet)) return { intervalMs: 10000, burst: 1 }
  if (pet.moodState === 'happy' || pet.mood >= 75) return { intervalMs: 7000, burst: 3 }
  return { intervalMs: 12000, burst: 1 }
}

/** 按当前情绪选弹幕文案：激动/平稳/需求告急/低落各有专属池；index 驱动轮播 */
export function pickDanmakuText(pet: DanmakuPet, index: number): string {
  const needy = lowNeedsKind(pet)
  if (pet.moodState === 'bored' || pet.moodState === 'sulky' || pet.moodState === 'angry') {
    return rotate(gloomyPool, index)
  }
  if (needy === 'sleepy') return 'Zzz……呼噜…'
  if (needy === 'sick') return '有点不舒服，呜…'
  if (needy === 'tired') return rotate(['跑累啦，趴一会…', '体力见底啦，走不动了…'], index)
  if (needy) return rotate(['狗盆空空，汪！', '饿扁了…闻到饭香了吗', '肚子咕咕抗议中！'], index)
  const excited = pet.moodState === 'happy' || pet.mood >= 75
  return rotate(excited ? excitedPool : calmPool, index)
}
