import { useEffect, useMemo, useState } from 'react'
import { Button, Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { MiniappModal } from '../../components/MiniappModal'
import { socialApi, type MiniappFortune, type MiniappMood } from '../../services/socialApi'
import { buildMoodByDay, getCalendarMonth, getMondayLead, localDayKey, resolveMoodRoomId, shiftMonth, type DayMoods } from './calendarModel'
import { getFortuneAvailability } from './miniappViewModel'
import { MiniappFortuneView } from './MiniappFortuneView'
import './MiniappCalendarView.scss'

interface MiniappCalendarViewProps {
  roomId: string
  myUserId: string
  friendId: string
  friendName: string
}

const moodIcons = [
  require('../../assets/moods/mood-1.png'),
  require('../../assets/moods/mood-2.png'),
  require('../../assets/moods/mood-3.png'),
  require('../../assets/moods/mood-4.png'),
]
const moodLabels = ['低落', '一般', '不错', '特别好']
const weekdays = ['一', '二', '三', '四', '五', '六', '日']

type MoodModalState = { mode: 'pick' } | { mode: 'view'; day: string } | null

function MoodDayRows({ dayMoods, friendName }: { dayMoods?: DayMoods; friendName: string }) {
  if (!dayMoods?.mine && !dayMoods?.friend) {
    return <Text className="mood-modal__empty">这天还没有心情记录</Text>
  }
  return (
    <View className="mood-modal__rows">
      <View className="mood-modal__row">
        <Text className="mood-modal__who">我</Text>
        {dayMoods?.mine
          ? <><Image className="mood-modal__row-icon" src={moodIcons[dayMoods.mine.level - 1]} mode="aspectFill" /><Text className="mood-modal__row-label">{moodLabels[dayMoods.mine.level - 1]}</Text></>
          : <Text className="mood-modal__row-label mood-modal__row-label--none">未记录</Text>}
      </View>
      <View className="mood-modal__row">
        <Text className="mood-modal__who">{friendName || '好友'}</Text>
        {dayMoods?.friend
          ? <><Image className="mood-modal__row-icon" src={moodIcons[dayMoods.friend.level - 1]} mode="aspectFill" /><Text className="mood-modal__row-label">{moodLabels[dayMoods.friend.level - 1]}</Text></>
          : <Text className="mood-modal__row-label mood-modal__row-label--none">未记录</Text>}
      </View>
    </View>
  )
}

export function MiniappCalendarView({ roomId, myUserId, friendId, friendName }: MiniappCalendarViewProps) {
  const [cursor, setCursor] = useState(() => new Date())
  const [moods, setMoods] = useState<MiniappMood[]>([])
  const [fortune, setFortune] = useState<MiniappFortune | null>(null)
  const [fortuneOverlayOpen, setFortuneOverlayOpen] = useState(false)
  const [fortuneMessage, setFortuneMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState<MoodModalState>(null)
  const [soloRoomId, setSoloRoomId] = useState('')
  const month = useMemo(() => getCalendarMonth(cursor), [cursor])
  const lead = useMemo(() => getMondayLead(cursor), [cursor])
  const today = new Date()
  const currentDay = localDayKey(today.getFullYear(), today.getMonth(), today.getDate())
  const from = localDayKey(month.year, month.month, 1)
  const to = localDayKey(month.year, month.month, month.days)
  const moodByDay = useMemo(() => buildMoodByDay(moods, myUserId), [moods, myUserId])
  const moodRoomId = roomId || soloRoomId

  useEffect(() => {
    if (roomId) return
    let cancelled = false
    void socialApi.listConversations()
      .then((conversations) => {
        if (!cancelled) setSoloRoomId(resolveMoodRoomId('', conversations))
      })
      .catch(() => undefined)
    return () => { cancelled = true }
  }, [roomId])

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
    if (!moodRoomId) {
      setMoods([])
      return
    }
    void socialApi.listMoods(moodRoomId, from, to).then((items) => {
      setMoods(items)
    }).catch(() => setMoods([]))
  }, [from, moodRoomId, to])

  const saveMood = async (level: number) => {
    if (!moodRoomId || saving) return
    setSaving(true)
    try {
      const entry = await socialApi.setMood(moodRoomId, level)
      setMoods((current) => [...current.filter((item) => item.id !== entry.id), entry])
      setModal(null)
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '记录失败', icon: 'none' })
    } finally {
      setSaving(false)
    }
  }

  const openDay = (key: string) => {
    if (key === currentDay) setModal({ mode: 'pick' })
    else if (key < currentDay) setModal({ mode: 'view', day: key })
  }

  const cells: Array<number | null> = [
    ...Array.from({ length: lead }, () => null),
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
        <Text className="miniapp-calendar__month-text">{month.year}年 {month.month + 1}月</Text>
        <Button onClick={() => setCursor((value) => shiftMonth(value, 1))}>›</Button>
      </View>

      <View className="miniapp-calendar__weekdays">
        {weekdays.map((weekday) => <Text key={weekday}>{weekday}</Text>)}
      </View>

      <View className="miniapp-calendar__grid">
        {cells.map((day, index) => {
          if (!day) return <View key={`empty-${index}`} className="miniapp-calendar__cell" />
          const key = localDayKey(month.year, month.month, day)
          const isToday = key === currentDay
          const dayMoods = moodByDay.get(key)
          return (
            <View key={key} className="miniapp-calendar__cell" onClick={() => openDay(key)}>
              {isToday
                ? <Text className="miniapp-calendar__num miniapp-calendar__num--today">今天</Text>
                : <Text className="miniapp-calendar__num">{day}</Text>}
              <View className="miniapp-calendar__slot">
                {dayMoods?.mine && <Image className="miniapp-calendar__mood-icon" src={moodIcons[dayMoods.mine.level - 1]} mode="aspectFill" />}
              </View>
              <View className="miniapp-calendar__slot">
                {dayMoods?.friend && friendId && <Image className="miniapp-calendar__mood-icon" src={moodIcons[dayMoods.friend.level - 1]} mode="aspectFill" />}
              </View>
            </View>
          )
        })}
      </View>

      <View className="miniapp-calendar__legend">
        <View className="miniapp-calendar__legend-item">
          <Image className="miniapp-calendar__legend-icon" src={moodIcons[3]} mode="aspectFill" />
          <Text>我</Text>
        </View>
        <View className="miniapp-calendar__legend-item">
          <Image className="miniapp-calendar__legend-icon" src={moodIcons[2]} mode="aspectFill" />
          <Text>{friendName || '好友'}</Text>
        </View>
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

      {modal && (
        <MiniappModal onClose={() => setModal(null)}>
          {modal.mode === 'pick' ? (
            <View className="mood-modal">
              <Text className="mood-modal__title">今天的心情</Text>
              <View className="mood-modal__grid">
                {moodLabels.map((label, index) => (
                  <Button
                    key={label}
                    className="mood-modal__item"
                    disabled={saving}
                    onClick={() => void saveMood(index + 1)}
                  >
                    <Image className="mood-modal__icon" src={moodIcons[index]} mode="aspectFill" />
                    <Text className="mood-modal__label">{label}</Text>
                  </Button>
                ))}
              </View>
              <Text className="mood-modal__tip">记录后，{friendName || '好友'}也能在日历上看到你的心情</Text>
            </View>
          ) : (
            <View className="mood-modal">
              <Text className="mood-modal__title">{Number(modal.day.slice(5, 7))}月{Number(modal.day.slice(8, 10))}日的心情</Text>
              <MoodDayRows dayMoods={moodByDay.get(modal.day)} friendName={friendName} />
            </View>
          )}
        </MiniappModal>
      )}
    </View>
  )
}
