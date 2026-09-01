import type { PetState } from '../../domain/types'

type DanmakuPet = Pick<PetState, 'hunger' | 'mood' | 'energy' | 'health' | 'moodLabel' | 'moodState'>

/** 弹幕计划：是否活跃、平时多久飘一条、状态刷新（喂食/玩耍等）时连发几条 */
export interface DanmakuPlan {
  active: boolean
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

function rotate(list: string[], index: number): string {
  return list[((index % list.length) + list.length) % list.length]
}

function isLowNeeds(pet: DanmakuPet): boolean {
  return pet.hunger <= 20 || pet.energy <= 20 || pet.health <= 20 || pet.moodLabel === 'sleepy'
}

/**
 * 弹幕触发规则：情绪激动（心情引擎 happy 档或 mood ≥ 75）时高频飘（7s 一条，
 * 状态刷新时连发 3 条）；平稳档（content 或 mood ≥ 45）低频偶尔飘（12s 一条）；
 * 无聊/委屈/生气或需求告急（饿/累/病/困）时安静趴着不飘。
 */
export function getDanmakuPlan(pet: DanmakuPet): DanmakuPlan {
  if (isLowNeeds(pet)) return { active: false, intervalMs: 0, burst: 0 }
  if (pet.moodState === 'bored' || pet.moodState === 'sulky' || pet.moodState === 'angry') {
    return { active: false, intervalMs: 0, burst: 0 }
  }
  if (pet.moodState === 'happy' || pet.mood >= 75) return { active: true, intervalMs: 7000, burst: 3 }
  if (pet.moodState === 'content' || pet.mood >= 45) return { active: true, intervalMs: 12000, burst: 1 }
  return { active: false, intervalMs: 0, burst: 0 }
}

/** 按当前情绪选弹幕文案：激动档用高频兴奋池，平稳档用低频悠闲池；index 驱动轮播 */
export function pickDanmakuText(pet: DanmakuPet, index: number): string {
  const excited = pet.moodState === 'happy' || pet.mood >= 75
  return rotate(excited ? excitedPool : calmPool, index)
}
