import { useEffect, useMemo, useState } from 'react'
import { Button, Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { diaryApi, type MiniappDiary } from '../../services/diaryApi'
import { socialApi, type MiniappFortune } from '../../services/socialApi'
import { getFortuneAvailability } from './miniappViewModel'
import { MiniappFortuneView } from './MiniappFortuneView'
import { JournalEditorForm } from './JournalEditorForm'
import { JournalAnniversaryPanel } from './JournalAnniversaryPanel'
import { getWeekDays, groupByDay, journalDisplayPhotos, localDayKey, shiftWeek, weekMonthLabel } from './journalModel'
import './MiniappJournalView.scss'

interface EditorSession {
  day: string
  entry?: MiniappDiary
  photo?: string
}

const polaroidSit = require('../../assets/journal/polaroid-sit.png')
const actionWrite = require('../../assets/journal/action-write.png')
const actionPhoto = require('../../assets/journal/action-photo.png')

interface MiniappJournalViewProps {
  roomId: string
  refreshKey: number
}

const weekdayLabels = ['一', '二', '三', '四', '五', '六', '日']

function weekdayChar(dayKey: string) {
  const [year, month, day] = dayKey.split('-').map(Number)
  return weekdayLabels[(new Date(year, month - 1, day).getDay() + 6) % 7]
}

export function MiniappJournalView({ roomId, refreshKey }: MiniappJournalViewProps) {
  const today = new Date()
  const todayKey = localDayKey(today.getFullYear(), today.getMonth(), today.getDate())
  const [anchor, setAnchor] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState(todayKey)
  const [diaries, setDiaries] = useState<MiniappDiary[]>([])
  const [diariesLoading, setDiariesLoading] = useState(true)
  const [fortune, setFortune] = useState<MiniappFortune | null>(null)
  const [fortuneOverlayOpen, setFortuneOverlayOpen] = useState(false)
  const [fortuneMessage, setFortuneMessage] = useState('')
  const [editor, setEditor] = useState<EditorSession | null>(null)
  const [anniversaryOpen, setAnniversaryOpen] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [listTick, setListTick] = useState(0)
  const week = useMemo(() => getWeekDays(anchor), [anchor])
  const weekFrom = week[0].key
  const weekTo = week[6].key
  const diariesByDay = useMemo(() => groupByDay(diaries), [diaries])
  const selectedEntries = diariesByDay.get(selectedDay) ?? []
  const extraEntries = selectedEntries.slice(1)
  const featured = selectedEntries[0]
  const featuredPhoto = journalDisplayPhotos(featured?.photos ?? [], polaroidSit)

  useEffect(() => {
    setShowMore(false)
  }, [selectedDay])

  useEffect(() => {
    let cancelled = false
    setDiariesLoading(true)
    void diaryApi.list(weekFrom, weekTo)
      .then((items) => {
        if (!cancelled) {
          setDiaries(items)
          setDiariesLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDiaries([])
          setDiariesLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [weekFrom, weekTo, refreshKey, listTick])

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

  const writeDiary = (entry?: MiniappDiary) => {
    setEditor({ day: entry?.day ?? selectedDay, entry })
  }

  const pickPhoto = async (entry?: MiniappDiary) => {
    try {
      const result = await Taro.chooseMedia({ count: 1, mediaType: ['image'], sourceType: ['album', 'camera'], sizeType: ['compressed'] })
      const file = result.tempFiles[0]
      if (!file?.tempFilePath) return
      setEditor({
        day: entry?.day ?? selectedDay,
        entry,
        photo: file.tempFilePath,
      })
    } catch {
      // 用户取消选择
    }
  }

  const closeEditor = () => setEditor(null)

  const finishEditor = () => {
    setEditor(null)
    setListTick((tick) => tick + 1)
  }

  const replaceTodayPhoto = () => {
    void pickPhoto(featured)
  }

  const openEdit = (entry: MiniappDiary) => {
    writeDiary(entry)
  }

  const openFortune = () => {
    if (fortune) setFortuneOverlayOpen(true)
    else Taro.showToast({ title: fortuneMessage || '今日运势暂时无法加载', icon: 'none' })
  }

  const toggleMore = () => {
    if (extraEntries.length === 0) {
      Taro.showToast({ title: '暂无更多日记', icon: 'none' })
      return
    }
    setShowMore((open) => !open)
  }

  // 写日记/纪念日/运势覆盖层都在本层内部，被封在 z-index 19 的层级上下文里，
  // 会被爪印菜单（z-index 30）压住底部；覆盖层打开时把整层抬到菜单之上
  const overlayOpen = editor !== null || anniversaryOpen || fortuneOverlayOpen

  return (
    <View className={overlayOpen ? 'miniapp-journal miniapp-journal--overlay-open' : 'miniapp-journal'}>
      <View className="miniapp-journal__body">
        <View className="miniapp-page-header miniapp-journal__top">
          <Text className="miniapp-page-title miniapp-journal__title">小记</Text>
          <Text className="miniapp-page-caption miniapp-journal__caption">记录和小多利的每一天。</Text>
          <View className="miniapp-journal__tabs">
            <Button className="miniapp-journal__tab miniapp-journal__tab--active">日记</Button>
            <Button className="miniapp-journal__tab" onClick={() => setAnniversaryOpen(true)}>纪念日</Button>
          </View>
        </View>

        <View className="miniapp-journal__week-card">
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
                <Text className={[
                  'miniapp-journal__day-num',
                  day.key === selectedDay ? 'miniapp-journal__day-num--selected' : '',
                  day.key === todayKey ? 'miniapp-journal__day-num--today' : '',
                ].filter(Boolean).join(' ')}
                >{day.date}</Text>
                <View className="miniapp-journal__day-dot">{(diariesByDay.get(day.key)?.length ?? 0) > 0 && <Text className="miniapp-journal__dot" />}</View>
              </View>
            ))}
          </View>
        </View>

        <View className="miniapp-journal__today-block">
        <View className="miniapp-journal__section-row">
          <Text className="miniapp-journal__section">{selectedDay === todayKey ? '今日日记' : '当日日记'}</Text>
          <Text className="miniapp-journal__more" onClick={toggleMore}>{showMore ? '收起' : '查看 >'}</Text>
        </View>

        <View className="journal-today">
          <View className="journal-today__stage">
            <View
              className={featuredPhoto.isDefault ? 'journal-today__polaroid journal-today__polaroid--default' : 'journal-today__polaroid'}
              onClick={replaceTodayPhoto}
            >
              <Image
                className="journal-today__polaroid-image"
                src={featuredPhoto.src}
                mode={featuredPhoto.isDefault ? 'aspectFit' : 'aspectFill'}
              />
            </View>
            <View className="journal-today__snippet" onClick={() => featured ? openEdit(featured) : writeDiary()}>
              {diariesLoading ? (
                <View className="journal-today__loading">
                  <View className="journal-today__skeleton journal-today__skeleton--title" />
                  <View className="journal-today__skeleton journal-today__skeleton--line" />
                  <View className="journal-today__skeleton journal-today__skeleton--short" />
                </View>
              ) : (
                <>
                  {featured?.title ? <Text className="journal-today__title">{featured.title}</Text> : null}
                  <View className="journal-today__text">
                    {featured?.body || '还没有日记，点左边的小狗照片或下方按钮，记下今天吧。'}
                  </View>
                </>
              )}
            </View>
          </View>
          <View className="journal-today__actions">
            <Button className="journal-today__action" onClick={() => writeDiary()}>
              <Image className="journal-today__action-art" src={actionWrite} mode="aspectFit" />
              <Text>写日记</Text>
            </Button>
            <Button className="journal-today__action" onClick={() => void pickPhoto()}>
              <Image className="journal-today__action-art" src={actionPhoto} mode="aspectFit" />
              <Text>拍照记录</Text>
            </Button>
          </View>
        </View>

        {showMore && extraEntries.map((entry) => (
          <View key={entry.id} className="journal-card" onClick={() => openEdit(entry)}>
            <View className="journal-card__body">
              <Text className="journal-card__date">{entry.day.slice(0, 10).replace(/-/g, '.')} 周{weekdayChar(entry.day)}</Text>
              {entry.title ? <Text className="journal-card__title">{entry.title}</Text> : null}
              {entry.body ? <Text className="journal-card__text">{entry.body}</Text> : null}
              {entry.location ? <Text className="journal-card__location">📍 {entry.location}</Text> : null}
            </View>
          </View>
        ))}
        </View>
      </View>

      <View className="miniapp-journal__fortune" onClick={openFortune}>
        <View className="miniapp-journal__fortune-copy">
          <Text className="miniapp-journal__fortune-label">今日运势</Text>
          <Text className="miniapp-journal__fortune-title">
            {fortune ? `${fortune.content.overall.summary} ${'★'.repeat(fortune.content.overall.rating)}` : (fortuneMessage || '运势加载中~')}
          </Text>
        </View>
        <Text className="miniapp-journal__fortune-go">去看看 →</Text>
      </View>

      {fortuneOverlayOpen && fortune && (
        <MiniappFortuneView fortune={fortune} onClose={() => setFortuneOverlayOpen(false)} />
      )}

      {editor && (
        <View className="journal-editor-overlay">
          <JournalEditorForm
            day={editor.day}
            edit={editor.entry}
            photo={editor.photo}
            onClose={closeEditor}
            onSaved={finishEditor}
          />
        </View>
      )}

      {anniversaryOpen && (
        <View className="journal-anniv-overlay">
          <JournalAnniversaryPanel roomId={roomId} onClose={() => setAnniversaryOpen(false)} />
        </View>
      )}
    </View>
  )
}
