import { useEffect, useMemo, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import { socialApi, type MiniappFortune, type MiniappMood } from '../../services/socialApi'
import './MiniappCalendarView.scss'

function daysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

interface MiniappCalendarViewProps {
  roomId: string
}

export function MiniappCalendarView({ roomId }: MiniappCalendarViewProps) {
  const today = new Date()
  const days = Array.from({ length: daysInMonth(today) }, (_, index) => index + 1)
  const [moods, setMoods] = useState<MiniappMood[]>([])
  const [fortune, setFortune] = useState<MiniappFortune | null>(null)
  const [selectedMood, setSelectedMood] = useState(0)
  const [loading, setLoading] = useState(false)
  const from = useMemo(() => new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10), [today])
  const to = useMemo(() => new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10), [today])

  useEffect(() => {
    void socialApi.getFortune().then(setFortune).catch(() => setFortune(null))
    if (roomId) void socialApi.listMoods(roomId, from, to).then(setMoods).catch(() => setMoods([]))
  }, [from, roomId, to])

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

  const moodDays = new Set(moods.map((mood) => mood.day.slice(0, 10)))
  return (
    <View className="miniapp-calendar">
      <View className="miniapp-calendar__header">
        <Text className="miniapp-calendar__title">小记</Text>
        <Text className="miniapp-calendar__caption">记录你们一起度过的每一天。</Text>
      </View>
      <View className="miniapp-calendar__month">
        <Text>{today.getFullYear()}年{today.getMonth() + 1}月</Text>
      </View>
      <View className="miniapp-calendar__grid">
        {days.map((day) => (
            <View key={day} className={day === today.getDate() ? 'miniapp-calendar__day miniapp-calendar__day--today' : 'miniapp-calendar__day'}>
            <Text>{day}</Text>
            {moodDays.has(new Date(today.getFullYear(), today.getMonth(), day).toISOString().slice(0, 10)) && <View className="miniapp-calendar__dot" />}
          </View>
        ))}
      </View>
      <View className="miniapp-calendar__fortune">
        <Text className="miniapp-calendar__fortune-label">今日运势</Text>
        <Text className="miniapp-calendar__fortune-title">
          {fortune ? `${fortune.content.overall.summary} · ${'★'.repeat(fortune.content.overall.rating)}` : '今日运势加载中'}
        </Text>
        {fortune && <Text className="miniapp-calendar__fortune-meta">幸运色 {fortune.content.luckyColor.name} · 幸运数字 {fortune.content.luckyNumber}</Text>}
      </View>
      {roomId && <View className="miniapp-calendar__mood">
        <Text className="miniapp-calendar__fortune-label">今天的心情</Text>
        <View className="miniapp-calendar__mood-row">
          {[1, 2, 3, 4].map((level) => (
            <Button
              key={level}
              className={selectedMood === level ? 'miniapp-calendar__mood-button miniapp-calendar__mood-button--active' : 'miniapp-calendar__mood-button'}
              loading={loading && selectedMood === level}
              onClick={() => void saveMood(level)}
            >
              {['低落', '一般', '不错', '特别好'][level - 1]}
            </Button>
          ))}
        </View>
      </View>}
    </View>
  )
}
