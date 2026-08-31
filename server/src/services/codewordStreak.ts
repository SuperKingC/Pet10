import type { CodewordRepository } from '../repositories/contracts.js'
import { codewordStreakFromFlags, dayBefore } from '../domain/codewordStreak.js'

/** 服务端自然日口径与暗号功能一致：上海时区 YYYY-MM-DD */
export function shanghaiDayKey(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now)
}

/** 从今天往回统计「双方都答上」的连续天数（封顶 60 天，防止空房间长期扫描） */
export async function computeBothAnsweredStreak(
  codewords: CodewordRepository,
  roomId: string,
  today: string,
  maxDays = 60
): Promise<number> {
  const flags: boolean[] = []
  for (let offset = 0; offset < maxDays; offset += 1) {
    const answers = await codewords.listForDay(roomId, dayBefore(today, offset))
    // 双人都作答才算一天；遇到断档立即停止
    if (answers.length < 2) break
    flags.push(true)
  }
  return codewordStreakFromFlags(flags)
}
