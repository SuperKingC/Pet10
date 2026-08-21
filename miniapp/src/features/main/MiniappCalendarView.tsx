import { useEffect, useMemo, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import { socialApi, type MiniappFortune, type MiniappMood } from '../../services/socialApi'
import { getCalendarMonth, localDayKey, shiftMonth } from './calendarModel'
import './MiniappCalendarView.scss'

interface MiniappCalendarViewProps {
  roomId: string
}

const moodLabels = ['低落', '一般', '不错', '特别好']
const weekdays = ['日', '一', '二', '三', '四', '五', '六']
const fortuneSections = [
  ['love', '感情'],
  ['study', '学习'],
  ['work', '工作'],
  ['wealth', '财富'],
  ['health', '健康'],
] as const

export function MiniappCalendarView({ roomId }: MiniappCalendarViewProps) {
  const [cursor, setCursor] = useState(() => new Date())
  const [moods, setMoods] = useState<MiniappMood[]>([])
  const [fortune, setFortune] = useState<MiniappFortune | null>(null)
  const [selectedMood, setSelectedMood] = useState(0)
  const [fortuneOpen, setFortuneOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const month = useMemo(() => getCalendarMonth(cursor), [cursor])
  const today = new Date()
  const currentDay = localDayKey(today.getFullYear(), today.getMonth(), today.getDate())
  const from = localDayKey(month.year, month.month, 1)
  const to = localDayKey(month.year, month.month, month.days)
  const moodDays = new Set(moods.map((mood) => mood.day.slice(0, 10)))

  useEffect(() => {
    void socialApi.getFortune().then(setFortune).catch(() => setFortune(null))
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
      <View className="miniapp-calendar__header">
        <Text className="miniapp-calendar__title">小记</Text>
        <Text className="miniapp-calendar__caption">记录你们一起度过的每一天</Text>
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
              {fortune ? `${fortune.content.overall.summary} ${'★'.repeat(fortune.content.overall.rating)}` : '今日运势加载中'}
            </Text>
          </View>
          {fortune && <Button onClick={() => setFortuneOpen((value) => !value)}>{fortuneOpen ? '收起' : '详情'}</Button>}
        </View>
        {fortune && <Text className="miniapp-calendar__fortune-meta">幸运色：{fortune.content.luckyColor.name} · 幸运数字：{fortune.content.luckyNumber}</Text>}
        {fortuneOpen && fortune && (
          <View className="miniapp-calendar__fortune-details">
            {fortuneSections.map(([key, label]) => {
              const section = fortune.content[key]
              if (!section) return null
              return (
                <View key={key} className="miniapp-calendar__fortune-detail">
                  <View>
                    <Text>{label}</Text>
                    <Text>{'★'.repeat(section.rating)}</Text>
                  </View>
                  <Text>{'text' in section ? section.text : section.partnered}</Text>
                </View>
              )
            })}
          </View>
        )}
      </View>

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
