import type { NestTask, NestTaskRepeat, NestTaskRewardItem } from './models.js'

/** 上海时区自然日（与服务器其他按天结算功能一致用 `toISOString().slice(0,10)` 的简化口径，
 *  客户端传今天，服务端只做字符串比较，不自行取时区） */
export function isDoneToday(task: Pick<NestTask, 'repeatRule' | 'lastCompletedDay'>, today: string): boolean {
  if (!task.lastCompletedDay) return false
  if (task.repeatRule === 'none') return true
  if (task.repeatRule === 'daily') return task.lastCompletedDay === today
  return task.lastCompletedDay >= weekStart(today)
}

function weekStart(day: string): string {
  const date = new Date(`${day}T00:00:00Z`)
  const weekday = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() - (weekday - 1))
  return date.toISOString().slice(0, 10)
}

export function validateReward(
  repeatRule: NestTaskRepeat,
  rewardItems: NestTaskRewardItem[],
  rewardExp: number,
  limits: { maxPerItem: number; maxExp: number },
): boolean {
  if (rewardExp < 0 || rewardExp > limits.maxExp) return false
  return rewardItems.every((item) => item.count >= 1 && item.count <= limits.maxPerItem)
}

export function applyTaskReward(
  pet: { level: number; experience: number; experienceToNextLevel: number },
  exp: number,
): { level: number; experience: number; experienceToNextLevel: number; leveledUp: boolean } {
  let level = pet.level
  let experience = pet.experience + exp
  let experienceToNextLevel = pet.experienceToNextLevel
  let leveledUp = false
  while (experience >= experienceToNextLevel) {
    experience -= experienceToNextLevel
    level += 1
    leveledUp = true
    experienceToNextLevel = Math.round(experienceToNextLevel * 1.25)
  }
  return { level, experience, experienceToNextLevel, leveledUp }
}
