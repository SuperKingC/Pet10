import { useEffect, useMemo, useState } from 'react'
import { Button, Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { MiniappModal } from '../../components/MiniappModal'
import { socialApi, type AnniversaryInput, type MiniappAnniversary, type MiniappFortune, type MiniappMood } from '../../services/socialApi'
import { AnniversaryForm } from './AnniversaryForm'
import { AnniversaryListView } from './AnniversaryListView'
import { anniversaryIcons, type AnniversaryIconKey } from './anniversaryAssets'
import { matchesDay } from './anniversaryModel'
import { buildMoodByDay, getCalendarMonth, getMondayLead, localDayKey, resolveMoodRoomId, shiftMonth } from './calendarModel'
import { DayModal } from './DayModal'
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

export function MiniappCalendarView({ roomId, myUserId, friendId, friendName }: MiniappCalendarViewProps) {
  const [cursor, setCursor] = useState(() => new Date())
  const [moods, setMoods] = useState<MiniappMood[]>([])
  const [fortune, setFortune] = useState<MiniappFortune | null>(null)
  const [fortuneOverlayOpen, setFortuneOverlayOpen] = useState(false)
  const [fortuneMessage, setFortuneMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'calendar' | 'anniversary'>('calendar')
  const [anniversaries, setAnniversaries] = useState<MiniappAnniversary[]>([])
  const [dayModal, setDayModal] = useState<string | null>(null)
  const [annivForm, setAnnivForm] = useState<{ day: string; edit?: MiniappAnniversary; pickDay?: boolean } | null>(null)
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

  useEffect(() => {
    if (!moodRoomId) {
      setAnniversaries([])
      return
    }
    void socialApi.listAnniversaries(moodRoomId).then(setAnniversaries).catch(() => setAnniversaries([]))
  }, [moodRoomId])

  const saveMood = async (level: number) => {
    if (!moodRoomId || saving) return
    setSaving(true)
    try {
      const entry = await socialApi.setMood(moodRoomId, level)
      setMoods((current) => [...current.filter((item) => item.id !== entry.id), entry])
      setDayModal(null)
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '记录失败', icon: 'none' })
    } finally {
      setSaving(false)
    }
  }

  const openDay = (key: string) => setDayModal(key)

  const submitAnniversary = async (input: AnniversaryInput) => {
    if (!moodRoomId || saving) return
    setSaving(true)
    try {
      if (annivForm?.edit) {
        const updated = await socialApi.updateAnniversary(moodRoomId, annivForm.edit.id, input)
        setAnniversaries((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      } else {
        const created = await socialApi.createAnniversary(moodRoomId, input)
        setAnniversaries((current) => [...current, created])
      }
      setAnnivForm(null)
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '保存失败', icon: 'none' })
    } finally { setSaving(false) }
  }

  const removeAnniversary = async () => {
    if (!moodRoomId || !annivForm?.edit || saving) return
    setSaving(true)
    try {
      await socialApi.deleteAnniversary(moodRoomId, annivForm.edit.id)
      setAnniversaries((current) => current.filter((item) => item.id !== annivForm.edit?.id))
      setAnnivForm(null)
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '删除失败', icon: 'none' })
    } finally { setSaving(false) }
  }

  const cells: Array<number | null> = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: month.days }, (_, index) => index + 1),
  ]

  return (
    <View className="miniapp-calendar">
      <View className="miniapp-page-header miniapp-calendar__header">
        <Text className="miniapp-page-title miniapp-calendar__title">小记</Text>
        <Text className="miniapp-page-caption miniapp-calendar__caption">记录你们一起度过的每一天。</Text>
      </View>

      <View className="miniapp-calendar__tabs">
        <Button className={tab === 'calendar' ? 'miniapp-calendar__tab miniapp-calendar__tab--active' : 'miniapp-calendar__tab'} onClick={() => setTab('calendar')}>日历</Button>
        <Button className={tab === 'anniversary' ? 'miniapp-calendar__tab miniapp-calendar__tab--active' : 'miniapp-calendar__tab'} onClick={() => setTab('anniversary')}>纪念日</Button>
      </View>

      {tab === 'anniversary' ? (
        <AnniversaryListView
          items={anniversaries}
          today={today}
          onAdd={() => setAnnivForm({ day: currentDay, pickDay: true })}
          onEdit={(id) => {
            const item = anniversaries.find((entry) => entry.id === id)
            if (item) setAnnivForm({ day: item.day, edit: item })
          }}
        />
      ) : (
        <>
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
          const dayAnniversary = anniversaries.find((item) => matchesDay(item, key))
          return (
            <View key={key} className="miniapp-calendar__cell" onClick={() => openDay(key)}>
              <View className="miniapp-calendar__num-wrap">
                {isToday
                  ? <Text className="miniapp-calendar__num miniapp-calendar__num--today">今天</Text>
                  : <Text className="miniapp-calendar__num">{day}</Text>}
                {dayAnniversary && <Image className="miniapp-calendar__anniv-badge" src={anniversaryIcons[dayAnniversary.icon as AnniversaryIconKey] ?? anniversaryIcons.heart} mode="aspectFit" />}
              </View>
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
        </>
      )}
      {fortuneOverlayOpen && fortune && (
        <MiniappFortuneView fortune={fortune} onClose={() => setFortuneOverlayOpen(false)} />
      )}

      {dayModal && (
        <DayModal
          day={dayModal}
          phase={dayModal === currentDay ? 'today' : dayModal < currentDay ? 'past' : 'future'}
          dayMoods={moodByDay.get(dayModal)}
          friendName={friendName}
          anniversaries={anniversaries.filter((item) => matchesDay(item, dayModal))}
          saving={saving}
          onPickMood={(level) => void saveMood(level)}
          onCreateAnniversary={() => { setAnnivForm({ day: dayModal }); setDayModal(null) }}
          onEditAnniversary={(item) => { setAnnivForm({ day: item.day, edit: item }); setDayModal(null) }}
          onClose={() => setDayModal(null)}
        />
      )}
      {annivForm && (
        <MiniappModal onClose={() => setAnnivForm(null)}>
          <AnniversaryForm
            defaultDay={annivForm.day}
            withDatePicker={annivForm.pickDay}
            initial={annivForm.edit}
            saving={saving}
            onSubmit={(input) => void submitAnniversary(input)}
            onCancel={() => setAnnivForm(null)}
            onDelete={annivForm.edit ? () => void removeAnniversary() : undefined}
          />
        </MiniappModal>
      )}
    </View>
  )
}
