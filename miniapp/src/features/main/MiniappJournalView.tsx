import { useEffect, useMemo, useState } from 'react'
import { Button, Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { diaryApi, type MiniappDiary } from '../../services/diaryApi'
import { socialApi, type MiniappFortune } from '../../services/socialApi'
import { getFortuneAvailability } from './miniappViewModel'
import { MiniappFortuneView } from './MiniappFortuneView'
import { getWeekDays, groupByDay, localDayKey, shiftWeek, weekMonthLabel } from './journalModel'
import { setJournalDraft } from './journalDraft'
import './MiniappJournalView.scss'

interface MiniappJournalViewProps {
  roomId: string
  refreshKey: number
  onShareTitleChange?(title: string): void
}

const weekdayLabels = ['一', '二', '三', '四', '五', '六', '日']

function weekdayChar(dayKey: string) {
  const [year, month, day] = dayKey.split('-').map(Number)
  return weekdayLabels[(new Date(year, month - 1, day).getDay() + 6) % 7]
}

export function MiniappJournalView({ roomId, refreshKey, onShareTitleChange }: MiniappJournalViewProps) {
  const today = new Date()
  const todayKey = localDayKey(today.getFullYear(), today.getMonth(), today.getDate())
  const [anchor, setAnchor] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState(todayKey)
  const [diaries, setDiaries] = useState<MiniappDiary[]>([])
  const [fortune, setFortune] = useState<MiniappFortune | null>(null)
  const [fortuneOverlayOpen, setFortuneOverlayOpen] = useState(false)
  const [fortuneMessage, setFortuneMessage] = useState('')
  const week = useMemo(() => getWeekDays(anchor), [anchor])
  const weekFrom = week[0].key
  const weekTo = week[6].key
  const diariesByDay = useMemo(() => groupByDay(diaries), [diaries])
  const selectedEntries = diariesByDay.get(selectedDay) ?? []

  useEffect(() => {
    let cancelled = false
    void diaryApi.list(weekFrom, weekTo)
      .then((items) => { if (!cancelled) setDiaries(items) })
      .catch(() => { if (!cancelled) setDiaries([]) })
    return () => { cancelled = true }
  }, [weekFrom, weekTo, refreshKey])

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

  const shift = (offset: number) => {
    setAnchor((current) => {
      const next = shiftWeek(current, offset)
      const days = getWeekDays(next)
      setSelectedDay((day) => (days.some((item) => item.key === day) ? day : days[6].key === todayKey ? todayKey : days[0].key))
      return next
    })
  }

  const openAnniversary = () => {
    void Taro.navigateTo({ url: `/pages/journal-anniversary/journal-anniversary?roomId=${encodeURIComponent(roomId)}` })
  }

  const writeDiary = () => {
    setJournalDraft({})
    void Taro.navigateTo({ url: `/pages/journal-editor/journal-editor?day=${selectedDay}` })
  }

  const photoDiary = async () => {
    try {
      const result = await Taro.chooseMedia({ count: 1, mediaType: ['image'], sourceType: ['album', 'camera'], sizeType: ['compressed'] })
      const file = result.tempFiles[0]
      if (!file?.tempFilePath) return
      setJournalDraft({ photo: file.tempFilePath })
      void Taro.navigateTo({ url: `/pages/journal-editor/journal-editor?day=${selectedDay}` })
    } catch {
      // 用户取消选择
    }
  }

  const openEdit = (entry: MiniappDiary) => {
    setJournalDraft({ edit: entry })
    void Taro.navigateTo({ url: `/pages/journal-editor/journal-editor?id=${encodeURIComponent(entry.id)}&day=${entry.day}` })
  }

  const toggleLike = async (entry: MiniappDiary) => {
    try {
      const updated = await diaryApi.toggleLike(entry.id)
      setDiaries((current) => current.map((item) => (item.id === updated.id ? updated : item)))
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '操作失败', icon: 'none' })
    }
  }

  return (
    <View className="miniapp-journal">
      <View className="miniapp-page-header miniapp-journal__header">
        <Text className="miniapp-page-title miniapp-journal__title">小记</Text>
        <Text className="miniapp-page-caption miniapp-journal__caption">记录和小多利的每一天。</Text>
      </View>

      <View className="miniapp-journal__tabs">
        <Button className="miniapp-journal__tab miniapp-journal__tab--active">日记</Button>
        <Button className="miniapp-journal__tab" onClick={openAnniversary}>纪念日</Button>
      </View>

      <View className="miniapp-journal__week-bar">
        <Button onClick={() => shift(-1)}>‹</Button>
        <Text className="miniapp-journal__month-text">{weekMonthLabel(anchor)}</Text>
        <Button onClick={() => shift(1)}>›</Button>
      </View>

      <View className="miniapp-journal__week">
        {week.map((day, index) => (
          <View
            key={day.key}
            className={day.key === selectedDay ? 'miniapp-journal__day miniapp-journal__day--active' : 'miniapp-journal__day'}
            onClick={() => setSelectedDay(day.key)}
          >
            <Text className="miniapp-journal__day-label">{weekdayLabels[index]}</Text>
            <Text className={day.key === todayKey ? 'miniapp-journal__day-num miniapp-journal__day-num--today' : 'miniapp-journal__day-num'}>{day.date}</Text>
            <View className="miniapp-journal__day-dot">{(diariesByDay.get(day.key)?.length ?? 0) > 0 && <Text className="miniapp-journal__dot" />}</View>
          </View>
        ))}
      </View>

      <Text className="miniapp-journal__section">{selectedDay === todayKey ? '今日日记' : '当日日记'}</Text>

      {selectedEntries.length === 0 ? (
        <View className="miniapp-journal__empty">
          <Text>还没有日记，记录今天的生活吧。</Text>
        </View>
      ) : selectedEntries.map((entry) => (
        <View key={entry.id} className="journal-card" onClick={() => openEdit(entry)}>
          {entry.photos[0] && <Image className="journal-card__cover" src={entry.photos[0]} mode="aspectFill" />}
          <View className="journal-card__body">
            <Text className="journal-card__date">{entry.day.slice(0, 10).replace(/-/g, '.')} 周{weekdayChar(entry.day)}</Text>
            {entry.title ? <Text className="journal-card__title">{entry.title}</Text> : null}
            {entry.body ? <Text className="journal-card__text">{entry.body}</Text> : null}
            {entry.photos.length > 0 && (
              <View className="journal-card__photos">
                {entry.photos.map((photo, index) => (
                  <Image key={`${entry.id}-${index}`} className="journal-card__photo" src={photo} mode="aspectFill" />
                ))}
              </View>
            )}
            <View className="journal-card__foot">
              <Text className="journal-card__location">{entry.location ? `📍 ${entry.location}` : ''}</Text>
              <View className="journal-card__actions">
                <Button
                  className={entry.liked ? 'journal-card__like journal-card__like--active' : 'journal-card__like'}
                  onClick={(event) => {
                    event.stopPropagation()
                    void toggleLike(entry)
                  }}
                >♥</Button>
                <Button
                  className="journal-card__share"
                  openType="share"
                  onClick={() => onShareTitleChange?.(entry.title || '我在小多利记了一篇日记')}
                >↗</Button>
              </View>
            </View>
          </View>
        </View>
      ))}

      <View className="miniapp-journal__actions">
        <Button className="miniapp-journal__action" onClick={writeDiary}>
          <Text className="miniapp-journal__action-icon">✎</Text>
          <Text>写日记</Text>
        </Button>
        <Button className="miniapp-journal__action" onClick={() => void photoDiary()}>
          <Text className="miniapp-journal__action-icon">📷</Text>
          <Text>拍照记录</Text>
        </Button>
      </View>

      <View className="miniapp-journal__fortune">
        <View className="miniapp-journal__fortune-header">
          <View>
            <Text className="miniapp-journal__fortune-label">今日运势</Text>
            <Text className="miniapp-journal__fortune-title">
              {fortune ? `${fortune.content.overall.summary} ${'★'.repeat(fortune.content.overall.rating)}` : (fortuneMessage || '今日运势加载中')}
            </Text>
          </View>
          <Button onClick={() => {
            if (fortune) setFortuneOverlayOpen(true)
            else Taro.showToast({ title: fortuneMessage || '今日运势暂时无法加载', icon: 'none' })
          }}>查看详情 ›</Button>
        </View>
        {fortune && <Text className="miniapp-journal__fortune-meta">幸运色：{fortune.content.luckyColor.name} · 幸运数字：{fortune.content.luckyNumber}</Text>}
      </View>

      {fortuneOverlayOpen && fortune && (
        <MiniappFortuneView fortune={fortune} onClose={() => setFortuneOverlayOpen(false)} />
      )}
    </View>
  )
}
