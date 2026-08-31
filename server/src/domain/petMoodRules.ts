export type PetMoodKey = 'happy' | 'content' | 'bored' | 'sulky' | 'angry'

export interface PetMoodState {
  key: PetMoodKey
  /** 小窝状态卡上的一句心情文案 */
  caption: string
  /** 喂给 persona 的腔调提示 */
  toneHint: string
}

const MOOD_STATES: Record<PetMoodKey, { caption: string; toneHint: string }> = {
  happy: {
    caption: '开心得冒泡',
    toneHint: '你现在心情很好，活蹦乱跳、话多爱分享，偶尔小小得瑟一下。'
  },
  content: {
    caption: '满足地陪着你们',
    toneHint: '你现在心情不错，温柔黏人，偶尔撒个娇讨吃的。'
  },
  bored: {
    caption: '无聊得直叹气',
    toneHint: '你现在有点无聊没劲，说话蔫蔫的，会小声抱怨没人陪你玩。'
  },
  sulky: {
    caption: '委屈巴巴等着你',
    toneHint: '你现在很委屈，说话带点坏坏的阴阳怪气（比如「哦～终于想起我啦？」），但没有恶意，主人一哄就好。'
  },
  angry: {
    caption: '气鼓鼓（其实想被哄）',
    toneHint: '你现在在赌气，哼哼唧唧爱答不理，其实特别想被关注，一哄就绷不住笑。'
  }
}

/** 闲置满多少小时后，无论数值心情如何，至少表现为无聊（被冷落的下限档） */
export const IDLE_BORED_HOURS = 24
/** 闲置满多少小时后，至少表现为委屈 */
export const IDLE_SULKY_HOURS = 48

export function computeMoodState(input: { mood: number; idleHours?: number }): PetMoodState {
  const idleHours = Math.max(0, input.idleHours ?? 0)
  let key: PetMoodKey
  if (input.mood >= 75) key = 'happy'
  else if (input.mood >= 55) key = 'content'
  else if (input.mood >= 35) key = 'bored'
  else if (input.mood >= 15) key = 'sulky'
  else key = 'angry'
  if (idleHours >= IDLE_SULKY_HOURS) {
    if (key !== 'angry') key = 'sulky'
  } else if (idleHours >= IDLE_BORED_HOURS && (key === 'happy' || key === 'content')) {
    key = 'bored'
  }
  return { key, ...MOOD_STATES[key] }
}

/** 衰减节奏：闲置超过 12 小时扣 5 点，之后每 12 小时再扣（宠物行更新时间即检查点） */
export const MOOD_DECAY_AFTER_MS = 12 * 60 * 60 * 1000
export const MOOD_DECAY_STEP = 5
export const MOOD_FLOOR = 10

export function decayMood(mood: number, idleMs: number): number {
  if (idleMs < MOOD_DECAY_AFTER_MS) return mood
  return Math.max(MOOD_FLOOR, mood - MOOD_DECAY_STEP)
}

const PRAISE_PATTERN = /夸|厉害|真棒|好棒|喜欢你|爱你|贴贴|摸摸|谢谢|抱抱|最好了|真乖|真可爱|好可爱|想你/
const SCOLD_PATTERN = /笨|蠢|好烦|讨厌|滚|不理你|凶我|坏狗|揍你|再也不要/

/** 聊天关键词情绪：被嫌弃 -3、被夸 +2（同句既有夸又嫌弃时嫌弃优先），夹在 0-100 */
export function adjustMoodForChat(mood: number, text: string): number {
  let next = mood
  if (SCOLD_PATTERN.test(text)) next -= 3
  else if (PRAISE_PATTERN.test(text)) next += 2
  return Math.min(100, Math.max(0, next))
}
