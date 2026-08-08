import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Conversation, Fortune, Message, MoodEntry } from '../domain/types'
import { socialApi } from '../services/socialApi'
import type { PetAction } from '../domain/petRules'

interface CalendarTabProps {
  pairRoom?: Conversation
  messages: Message[]
  myUserId: string
  friendId?: string
  myName: string
  friendName: string
  onMoodSet(entry: MoodEntry): void
}

const MOOD_LEVELS = [
  { level: 1, emoji: '🙁', label: '低落', color: '#9aa7c7' },
  { level: 2, emoji: '😐', label: '一般', color: '#c9b792' },
  { level: 3, emoji: '🙂', label: '好', color: '#7fc6a4' },
  { level: 4, emoji: '😄', label: '特别好', color: '#f2a15c' }
]

const LUCKY_ACTION_LABEL: Record<PetAction, string> = { feed: '喂食', play: '玩耍', clean: '清洁', sleep: '睡觉' }

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function CalendarTab({ pairRoom, messages, myUserId, friendId, myName, friendName, onMoodSet }: CalendarTabProps) {
  const today = useMemo(() => new Date(), [])
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [moods, setMoods] = useState<MoodEntry[]>([])
  const [fortune, setFortune] = useState<Fortune>()
  const [fortuneLoading, setFortuneLoading] = useState(false)
  const [moodPickerOpen, setMoodPickerOpen] = useState(false)

  const roomId = pairRoom?.roomId

  const refreshMoods = useCallback(async () => {
    if (!roomId) return
    const first = new Date(viewYear, viewMonth, 1)
    const last = new Date(viewYear, viewMonth + 1, 0)
    try {
      setMoods(await socialApi.listMoods(roomId, dayKey(first), dayKey(last)))
    } catch { /* 静默 */ }
  }, [roomId, viewYear, viewMonth])

  useEffect(() => {
    void refreshMoods()
  }, [refreshMoods])

  useEffect(() => {
    if (!roomId) return
    setFortuneLoading(true)
    socialApi.getFortune(roomId)
      .then(setFortune)
      .catch(() => setFortune(undefined))
      .finally(() => setFortuneLoading(false))
  }, [roomId])

  // 每天的消息活跃度（爪印）
  const activeDays = useMemo(() => {
    const set = new Set<string>()
    for (const message of messages) {
      if (!message.rawCreatedAt) continue
      const date = new Date(message.rawCreatedAt)
      if (!Number.isNaN(date.getTime())) set.add(dayKey(date))
    }
    return set
  }, [messages])

  const moodByDay = useMemo(() => {
    const map = new Map<string, MoodEntry[]>()
    for (const entry of moods) {
      const day = typeof entry.day === 'string' ? entry.day.slice(0, 10) : ''
      const list = map.get(day) ?? []
      list.push(entry)
      map.set(day, list)
    }
    return map
  }, [moods])

  const cells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1)
    const startWeekday = (firstDay.getDay() + 6) % 7 // 周一开头
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const result: Array<{ date: Date; key: string } | null> = []
    for (let i = 0; i < startWeekday; i += 1) result.push(null)
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(viewYear, viewMonth, day)
      result.push({ date, key: dayKey(date) })
    }
    return result
  }, [viewYear, viewMonth])

  const myTodayMood = moods.find((entry) => entry.userId === myUserId && String(entry.day).slice(0, 10) === dayKey(today))

  function changeMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1)
    setViewYear(next.getFullYear())
    setViewMonth(next.getMonth())
  }

  async function chooseMood(level: number) {
    if (!roomId) return
    try {
      const entry = await socialApi.setMood(roomId, level)
      onMoodSet(entry)
      await refreshMoods()
    } finally {
      setMoodPickerOpen(false)
    }
  }

  return (
    <section className="calendar-tab">
      <header className="calendar-tab__header">
        <h2>日历</h2>
        <p>你们一起走过的每一天</p>
      </header>

      {roomId && (
        <section className="fortune-card">
          {fortuneLoading && <p className="fortune-card__loading">小多利正在翻星盘…</p>}
          {fortune && (
            <>
              <h3>今日共养运势 <em>{fortune.day.slice(0, 10)}</em></h3>
              <p className="fortune-card__line"><span className="fortune-card__tag fortune-card__tag--me">{myName}</span>{fortune.content.mine}</p>
              <p className="fortune-card__line"><span className="fortune-card__tag fortune-card__tag--friend">{friendName || '好友'}</span>{fortune.content.friend}</p>
              <p className="fortune-card__line fortune-card__pair">🐾 {fortune.content.pair}</p>
              <div className="fortune-card__meta">
                <span>幸运互动：{LUCKY_ACTION_LABEL[fortune.content.luckyAction]}</span>
                <span>幸运色：{fortune.content.luckyColor}</span>
                <span>幸运数字：{fortune.content.luckyNumber}</span>
              </div>
            </>
          )}
        </section>
      )}

      <section className="month-calendar">
        <div className="month-calendar__nav">
          <button onClick={() => changeMonth(-1)} aria-label="上一月">‹</button>
          <strong>{viewYear} 年 {viewMonth + 1} 月</strong>
          <button onClick={() => changeMonth(1)} aria-label="下一月">›</button>
        </div>
        <div className="month-calendar__weekdays">
          {['一', '二', '三', '四', '五', '六', '日'].map((weekday) => <span key={weekday}>{weekday}</span>)}
        </div>
        <div className="month-calendar__grid">
          {cells.map((cell, index) => {
            if (!cell) return <span key={`blank-${index}`} className="month-calendar__cell month-calendar__cell--blank" />
            const isToday = cell.key === dayKey(today)
            const dayMoods = moodByDay.get(cell.key) ?? []
            const myMood = dayMoods.find((entry) => entry.userId === myUserId)
            const friendMood = dayMoods.find((entry) => entry.userId !== myUserId)
            return (
              <button
                key={cell.key}
                className={`month-calendar__cell ${isToday ? 'month-calendar__cell--today' : ''}`}
                onClick={() => { if (isToday) setMoodPickerOpen((open) => !open) }}
                aria-label={`${cell.date.getMonth() + 1}月${cell.date.getDate()}日`}
              >
                <span className="month-calendar__day">{cell.date.getDate()}</span>
                <span className="month-calendar__marks">
                  {myMood && <i className="mood-dot mood-dot--me" title={`我：${MOOD_LEVELS[myMood.level - 1]?.label}`} style={{ background: MOOD_LEVELS[myMood.level - 1]?.color }} />}
                  {friendMood && friendId && <i className="mood-dot mood-dot--friend" title={`${friendName}：${MOOD_LEVELS[friendMood.level - 1]?.label}`} style={{ background: MOOD_LEVELS[friendMood.level - 1]?.color }} />}
                  {activeDays.has(cell.key) && <span className="paw-mark">🐾</span>}
                </span>
              </button>
            )
          })}
        </div>
        <p className="month-calendar__legend">
          <span><i className="mood-dot mood-dot--me" />我</span>
          <span><i className="mood-dot mood-dot--friend" />{friendName || '好友'}</span>
          <span>🐾 有聊天/互动</span>
        </p>
      </section>

      <section className="mood-today">
        <h3>今天的心情</h3>
        {myTodayMood
          ? <p>今天已打卡：{MOOD_LEVELS[myTodayMood.level - 1]?.emoji} {MOOD_LEVELS[myTodayMood.level - 1]?.label}（可点日历「今天」重新选择）</p>
          : <p>还没记录心情，点上面日历里的「今天」选一档吧</p>}
        {moodPickerOpen && (
          <div className="mood-picker">
            {MOOD_LEVELS.map((mood) => (
              <button key={mood.level} onClick={() => void chooseMood(mood.level)} style={{ borderColor: mood.color }}>
                <span>{mood.emoji}</span>
                {mood.label}
              </button>
            ))}
          </div>
        )}
      </section>
    </section>
  )
}
