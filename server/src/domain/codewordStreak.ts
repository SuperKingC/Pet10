/**
 * 每日暗号连胜：一天「双方都答上」记 1 天，从今天往前连续计数。
 * days 为从今天往回逐日取到的「双方都答上」标记（index 0 = 今天）。
 */
export function codewordStreakFromFlags(flags: boolean[]): number {
  let streak = 0
  for (const flag of flags) {
    if (!flag) break
    streak += 1
  }
  return streak
}

/** 暗号连胜卡冷却：每满 7 天发 1 张（7、14、21…） */
export function isCodewordStreakCardDue(streak: number): boolean {
  return streak >= 7 && streak % 7 === 0
}

/** 从某天往前推 n 天的 YYYY-MM-DD（UTC 口径，与服务端 todayKey 的自然日字符串一致） */
export function dayBefore(day: string, offset: number): string {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - offset)
  return date.toISOString().slice(0, 10)
}
