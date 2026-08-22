import { useEffect, useMemo, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { socialApi, type MiniappFortune, type MiniappMood } from '../../services/socialApi'
import { getCalendarMonth, localDayKey, shiftMonth } from './calendarModel'
import { getFortuneAvailability } from './miniappViewModel'
import { MiniappFortuneView } from './MiniappFortuneView'
import './MiniappCalendarView.scss'

interface MiniappCalendarViewProps {
  roomId: string
}

const moodLabels = ['低落', '一般', '不错', '特别好']
const weekdays = ['日', '一', '二', '三', '四', '五', '六']

export function MiniappCalendarView({ roomId }: MiniappCalendarViewProps) {
  const [cursor, setCursor] = useState(() => new Date())
  const [moods, setMoods] = useState<MiniappMood[]>([])
  const [fortune, setFortune] = useState<MiniappFortune | null>(null)
  const [selectedMood, setSelectedMood] = useState(0)
  const [fortuneOverlayOpen, setFortuneOverlayOpen] = useState(false)
  const [fortuneMessage, setFortuneMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const month = useMemo(() => getCalendarMonth(cursor), [cursor])
  const today = new Date()
  const currentDay = localDayKey(today.getFullYear(), today.getMonth(), today.getDate())
  const from = localDayKey(month.year, month.month, 1)
  const to = localDayKey(month.year, month.month, month.days)
  const moodDays = new Set(moods.map((mood) => mood.day.slice(0, 10)))

  useEffect(() => {
    let cancelled = false
    void socialApi.getProfile()
      .then((profile) => {
        const availability = getFortuneAvailability(profile.birthday)
        if (!availability.ready) {
          if (!cancelled) {
            setFortune(null)
            setFortuneMessage(availability.message)
          }
          return
        }
        return socialApi.getFortune()
          .then((result) => {
            if (!cancelled) {
              setFortune(result)
              setFortuneMessage('')
            }
          })
          .catch(() => {
            if (!cancelled) {
              setFortune(null)
              setFortuneMessage('今日运势暂时无法加载')
            }
          })
      })
      .catch(() => {
        if (!cancelled) {
          setFortune(null)
          setFortuneMessage('今日运势暂时无法加载')
        }
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!roomId) {
      setMoods([])
      return
    }
    void socialApi.listMoods(roomId, from, to).then((items) => {
      setMoods(items)
      const todayMood = items.find((item) => item.day.slice(0, 10) === currentDay)
      if (todayMood) setSelectedMood(todayMood.level)
    }).catch(() => setMoods([]))
  }, [currentDay, from, roomId, to])

  const saveMood = async (level: number) => {
    if (!roomId || loading) return
    setLoading(true)
    try {
      const entry = await socialApi.setMood(roomId, level)
      setMoods((current) => [...current.filter((item) => item.id !== entry.id), entry])
      setSelectedMood(level)
    } finally {
      setLoading(false)
    }
  }

  const cells = [
    ...Array.from({ length: month.firstWeekday }, () => null),
    ...Array.from({ length: month.days }, (_, index) => index + 1),
  ]

  return (
    <View className="miniapp-calendar">
      <View className="miniapp-page-header miniapp-calendar__header">
        <Text className="miniapp-page-title miniapp-calendar__title">小记</Text>
        <Text className="miniapp-page-caption miniapp-calendar__caption">记录你们一起度过的每一天</Text>
      </View>

      <View className="miniapp-calendar__month-bar">
        <Button onClick={() => setCursor((value) => shiftMonth(value, -1))}>‹</Button>
        <Text>{month.year}年 {month.month + 1}月</Text>
        <Button onClick={() => setCursor((value) => shiftMonth(value, 1))}>›</Button>
      </View>

      <View className="miniapp-calendar__weekdays">
        {weekdays.map((weekday) => <Text key={weekday}>{weekday}</Text>)}
      </View>
      <View className="miniapp-calendar__grid">
        {cells.map((day, index) => {
          const key = day ? localDayKey(month.year, month.month, day) : `empty-${index}`
          const isToday = key === currentDay
          return (
            <View key={key} className={isToday ? 'miniapp-calendar__day miniapp-calendar__day--today' : 'miniapp-calendar__day'}>
              {day && <Text>{day}</Text>}
              {day && moodDays.has(key) && <View className="miniapp-calendar__dot" />}
            </View>
          )
        })}
      </View>

      <View className="miniapp-calendar__fortune">
        <View className="miniapp-calendar__fortune-header">
          <View>
            <Text className="miniapp-calendar__fortune-label">今日运势</Text>
            <Text className="miniapp-calendar__fortune-title">
              {fortune ? `${fortune.content.overall.summary} ${'★'.repeat(fortune.content.overall.rating)}` : (fortuneMessage || '今日运势加载中')}
            </Text>
          </View>
          <Button onClick={() => {
            if (fortune) setFortuneOverlayOpen(true)
            else Taro.showToast({ title: fortuneMessage || '今日运势暂时无法加载', icon: 'none' })
          }}>查看详情 ›</Button>
        </View>
        {fortune && <Text className="miniapp-calendar__fortune-meta">幸运色：{fortune.content.luckyColor.name} · 幸运数字：{fortune.content.luckyNumber}</Text>}
      </View>
      {fortuneOverlayOpen && fortune && (
        <MiniappFortuneView fortune={fortune} onClose={() => setFortuneOverlayOpen(false)} />
      )}

      {roomId && (
        <View className="miniapp-calendar__mood">
          <Text className="miniapp-calendar__fortune-label">今天的心情</Text>
          <View className="miniapp-calendar__mood-row">
            {moodLabels.map((label, index) => {
              const level = index + 1
              return (
                <Button
                  key={label}
                  className={selectedMood === level ? 'miniapp-calendar__mood-button miniapp-calendar__mood-button--active' : 'miniapp-calendar__mood-button'}
                  loading={loading && selectedMood === level}
                  onClick={() => void saveMood(level)}
                >
                  {label}
                </Button>
              )
            })}
          </View>
        </View>
      )}
    </View>
  )
}
