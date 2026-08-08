import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Conversation, Fortune, Message, MoodEntry } from '../domain/types'
import { socialApi } from '../services/socialApi'

interface CalendarTabProps {
  pairRoom?: Conversation
  messages: Message[]
  myUserId: string
  friendId?: string
  friendName: string
  onMoodSet(entry: MoodEntry): void
  onOpenFortune(fortune: Fortune): void
  onSetBirthday(): void
  active?: boolean
  birthday?: string | null
}

const MOOD_LEVELS = [
  { level: 1, emoji: '🙁', label: '低落', color: '#9aa7c7' },
  { level: 2, emoji: '😐', label: '一般', color: '#c9b792' },
  { level: 3, emoji: '🙂', label: '好', color: '#7fc6a4' },
  { level: 4, emoji: '😄', label: '特别好', color: '#f2a15c' }
]

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

type FortuneEntryState = 'loading' | 'ready' | 'error' | 'birthday-required'

interface FortuneEntryProps {
  state: FortuneEntryState
  fortune?: Fortune
  onOpen(): void
  onRetry(): void
  onSetBirthday(): void
}

export function FortuneEntry({ state, fortune, onOpen, onRetry, onSetBirthday }: FortuneEntryProps) {
  if (state === 'birthday-required') {
    return <button type="button" className="fortune-entry fortune-entry--action" onClick={onSetBirthday}><span>今日运势</span><strong>设置生日，查看今日运势</strong><em>›</em></button>
  }
  if (state === 'error') {
    return <button type="button" className="fortune-entry fortune-entry--action" onClick={onRetry}><span>今日运势</span><strong>暂时无法加载，点此重试</strong><em>↻</em></button>
  }
  if (state === 'loading' || !fortune) {
    return <div className="fortune-entry fortune-entry--loading" aria-live="polite"><span>今日运势</span><strong>正在加载今日运势</strong><em aria-hidden="true" /></div>
  }
  return (
    <button type="button" className="fortune-entry" onClick={onOpen}>
      <span>今日运势 · {fortune.content.zodiac}</span>
      <strong>{fortune.content.overall.summary}</strong>
      <span className="fortune-entry__rating" aria-label={`综合 ${fortune.content.overall.rating} 星`}>{'★'.repeat(fortune.content.overall.rating)}{'☆'.repeat(5 - fortune.content.overall.rating)}</span>
      <em>›</em>
    </button>
  )
}

export function CalendarTab({ pairRoom, messages, myUserId, friendId, friendName, onMoodSet, onOpenFortune, onSetBirthday, active = true, birthday }: CalendarTabProps) {
  const today = useMemo(() => new Date(), [])
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [moods, setMoods] = useState<MoodEntry[]>([])
  const [fortune, setFortune] = useState<Fortune>()
  const [fortuneState, setFortuneState] = useState<FortuneEntryState>('loading')
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

  const refreshFortune = useCallback(async () => {
    setFortuneState('loading')
    try {
      const next = await socialApi.getFortune()
      setFortune(next)
      setFortuneState('ready')
    } catch (error) {
      setFortune(undefined)
      setFortuneState(error instanceof Error && error.message === 'birthday_required' ? 'birthday-required' : 'error')
    }
  }, [])

  useEffect(() => {
    if (active) void refreshFortune()
  }, [active, birthday, refreshFortune])

  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden && fortune?.day.slice(0, 10) !== dayKey(new Date())) void refreshFortune()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [fortune?.day, refreshFortune])

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
        <h2>日常</h2>
        <p>记录每一天的心情与片刻</p>
      </header>

      <FortuneEntry
        state={fortuneState}
        fortune={fortune}
        onOpen={() => { if (fortune) onOpenFortune(fortune) }}
        onRetry={() => void refreshFortune()}
        onSetBirthday={onSetBirthday}
      />

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
