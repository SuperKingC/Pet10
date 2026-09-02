import type { NestTaskDef } from './models.js'

/**
 * 系统预设任务目录：用户只能完成，不能创建。
 * - daily：每天刷新（periodKey = 当天日期），进度由当天事件派生；
 * - achievement：长期成就（periodKey 恒为 ''），累计事件计数，首次达成可领取。
 * metric 对应 pet_events 的 action（checkin/outfit_match 由对应功能写入同一事件表）。
 * 「行为上报类」每日任务（gobang/tarot/profile/diary/anniversary）只认当天上报：
 * 事件表里历史累计不能回补当天进度（与照顾类「历史行为当天补记」口径不同）。
 */
export const NEST_TASK_DEFS: NestTaskDef[] = [
  // ── 每日固定 ──
  { key: 'daily_checkin', scope: 'daily', title: '连续签到 1 天', icon: 'checkin', metric: 'checkin', target: 1, rewardItems: [{ itemId: 'dog_food', count: 1 }] },
  { key: 'daily_feed', scope: 'daily', title: '给小多利喂食 1 次', icon: 'feed', metric: 'feed', target: 1, rewardItems: [{ itemId: 'dog_food', count: 1 }] },
  { key: 'daily_play', scope: 'daily', title: '陪小多利玩耍 1 次', icon: 'play', metric: 'play', target: 1, rewardItems: [{ itemId: 'ball', count: 1 }] },
  { key: 'daily_clean', scope: 'daily', title: '给小多利洗澡 1 次', icon: 'clean', metric: 'clean', target: 1, rewardItems: [{ itemId: 'soap', count: 1 }] },
  // ── 每日互动（奖励引入骨头：骨头此前只有见面礼 1 根的来源）──
  { key: 'daily_gobang_pet', scope: 'daily', title: '和小多利下一盘五子棋', icon: 'play', metric: 'gobang_pet', target: 1, rewardItems: [{ itemId: 'bone', count: 1 }] },
  { key: 'daily_gobang_friend', scope: 'daily', title: '和好友下一盘五子棋', icon: 'play', metric: 'gobang_friend', target: 1, rewardItems: [{ itemId: 'bone', count: 1 }] },
  { key: 'daily_tarot', scope: 'daily', title: '测一次塔罗', icon: 'match', metric: 'tarot', target: 1, rewardItems: [{ itemId: 'bone', count: 1 }] },
  { key: 'daily_profile', scope: 'daily', title: '设置姓名和头像', icon: 'checkin', metric: 'profile', target: 1, rewardItems: [{ itemId: 'soap', count: 1 }] },
  { key: 'daily_diary', scope: 'daily', title: '写一次日记', icon: 'feed', metric: 'diary', target: 1, rewardItems: [{ itemId: 'dog_food', count: 1 }] },
  { key: 'daily_anniversary', scope: 'daily', title: '设置一次纪念日', icon: 'match', metric: 'anniversary', target: 1, rewardItems: [{ itemId: 'ball', count: 1 }] },
  // ── 成就型（链式：按 target 升级）──
  { key: 'ach_checkin_3', scope: 'achievement', title: '连续签到 3 天', icon: 'checkin', metric: 'checkin', target: 3, rewardItems: [{ itemId: 'soap', count: 1 }], requires: 'daily_checkin' },
  { key: 'ach_checkin_7', scope: 'achievement', title: '连续签到 7 天', icon: 'checkin', metric: 'checkin', target: 7, rewardItems: [{ itemId: 'ball', count: 1 }, { itemId: 'soap', count: 1 }], requires: 'ach_checkin_3' },
  { key: 'ach_feed_10', scope: 'achievement', title: '累计喂食 10 次', icon: 'feed', metric: 'feed', target: 10, rewardItems: [{ itemId: 'dog_food', count: 2 }] },
  { key: 'ach_feed_50', scope: 'achievement', title: '累计喂食 50 次', icon: 'feed', metric: 'feed', target: 50, rewardItems: [{ itemId: 'dog_food', count: 3 }], requires: 'ach_feed_10' },
  { key: 'ach_clean_10', scope: 'achievement', title: '累计洗澡 10 次', icon: 'clean', metric: 'clean', target: 10, rewardItems: [{ itemId: 'soap', count: 2 }] },
  { key: 'ach_play_20', scope: 'achievement', title: '累计玩耍 20 次', icon: 'play', metric: 'play', target: 20, rewardItems: [{ itemId: 'ball', count: 2 }] },
  { key: 'ach_outfit_match_1', scope: 'achievement', title: '和好友完成默契换装 1 次', icon: 'match', metric: 'outfit_match', target: 1, rewardItems: [{ itemId: 'soap', count: 1 }] }
]

export function findTaskDef(key: string) {
  return NEST_TASK_DEFS.find((def) => def.key === key)
}

/** 每日任务展示顺序固定；成就任务按目录顺序排在每日之后 */
export function taskDefOrder(key: string) {
  return NEST_TASK_DEFS.findIndex((def) => def.key === key)
}

/**
 * 「行为上报类」每日任务的 metric：进度只认当天的上报行（客户端上报 activity 后写 daily 进度），
 * 不像照顾类那样在无进度行时回退「事件总量>0」——否则历史行为会永久补记成今日完成。
 */
export const REPORTED_DAILY_METRICS: ReadonlySet<string> = new Set([
  'gobang_pet', 'gobang_friend', 'tarot', 'profile', 'diary', 'anniversary'
])
