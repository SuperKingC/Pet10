import { diaryApi } from '../../services/diaryApi'
import { getAccessToken } from '../../services/apiClient'

/**
 * 周日记内存缓存（单槽）：小记 tab 每次切换都会重挂载视图，
 * 没有这层缓存时每次都要重新请求整周 base64 照片的大包并重播骨架动画。
 * 只缓存最后一次请求窗口与结果，跨周翻页直接回退网络加载。
 */
let cachedFrom = ''
let cachedTo = ''
let cachedEntries: MiniappDiary[] = []
let prefetchInFlight = false

export function getCachedWeekDiaries(from: string, to: string): MiniappDiary[] | null {
  if (cachedFrom !== from || cachedTo !== to) return null
  return cachedEntries
}

export function setCachedWeekDiaries(from: string, to: string, entries: MiniappDiary[]) {
  cachedFrom = from
  cachedTo = to
  cachedEntries = entries
}

export function clearCachedWeekDiaries() {
  cachedFrom = ''
  cachedTo = ''
  cachedEntries = []
}

/**
 * 登录状态下后台预取本周日记写入缓存：
 * 用户第一次进小记时多数情况也能直接命中缓存，不再等待网络。
 */
export function prefetchCurrentWeekDiaries() {
  if (!getAccessToken() || prefetchInFlight) return
  const start = new Date()
  const lead = (start.getDay() + 6) % 7
  const monday = new Date(start.getFullYear(), start.getMonth(), start.getDate() - lead)
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)
  const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  const from = dayKey(monday)
  const to = dayKey(sunday)
  if (getCachedWeekDiaries(from, to) !== null) return
  prefetchInFlight = true
  void diaryApi.list(from, to)
    .then((items) => {
      // 仅当缓存仍为空或属于同一窗口时写入，避免覆盖用户翻周后的新缓存
      if (cachedFrom === '' || (cachedFrom === from && cachedTo === to)) {
        setCachedWeekDiaries(from, to, items)
      }
    })
    .catch(() => undefined)
    .finally(() => {
      prefetchInFlight = false
    })
}
