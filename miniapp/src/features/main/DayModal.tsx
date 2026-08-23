import { Button, Image, Text, View } from '@tarojs/components'
import { MiniappModal } from '../../components/MiniappModal'
import type { MiniappAnniversary } from '../../services/socialApi'
import { anniversaryIcons, type AnniversaryIconKey } from './anniversaryAssets'
import type { DayMoods } from './calendarModel'
import './MiniappCalendarView.scss'

const moodIcons = [
  require('../../assets/moods/mood-1.png'),
  require('../../assets/moods/mood-2.png'),
  require('../../assets/moods/mood-3.png'),
  require('../../assets/moods/mood-4.png'),
]
const moodLabels = ['低落', '一般', '不错', '特别好']

interface DayModalProps {
  day: string
  phase: 'today' | 'past' | 'future'
  dayMoods?: DayMoods
  friendName: string
  anniversaries: MiniappAnniversary[]
  saving: boolean
  onPickMood(level: number): void
  onCreateAnniversary(): void
  onEditAnniversary(item: MiniappAnniversary): void
  onClose(): void
}

export function DayModal({ day, phase, dayMoods, friendName, anniversaries, saving, onPickMood, onCreateAnniversary, onEditAnniversary, onClose }: DayModalProps) {
  const title = phase === 'today' ? '今天' : `${Number(day.slice(5, 7))}月${Number(day.slice(8, 10))}日`
  return (
    <MiniappModal onClose={onClose}>
      <View className="mood-modal">
        <Text className="mood-modal__title">{title}</Text>
        {phase === 'today' && (
          <View className="mood-modal__grid">
            {moodLabels.map((label, index) => (
              <Button key={label} className="mood-modal__item" disabled={saving} onClick={() => onPickMood(index + 1)}>
                <Image className="mood-modal__icon" src={moodIcons[index]} mode="aspectFill" />
                <Text className="mood-modal__label">{label}</Text>
              </Button>
            ))}
          </View>
        )}
        {phase === 'past' && (
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
        )}
        {phase === 'today' && <Text className="mood-modal__tip">记录后，{friendName || '好友'}也能在日历上看到你的心情</Text>}

        <View className="day-modal__anniv">
          <Text className="day-modal__anniv-title">纪念日</Text>
          {anniversaries.length === 0
            ? <Button className="day-modal__anniv-add" onClick={onCreateAnniversary}>为这一天设置纪念日</Button>
            : anniversaries.map((item) => (
              <View key={item.id} className="day-modal__anniv-row" onClick={() => onEditAnniversary(item)}>
                <Image className="day-modal__anniv-icon" src={anniversaryIcons[item.icon as AnniversaryIconKey] ?? anniversaryIcons.heart} mode="aspectFit" />
                <View className="day-modal__anniv-text">
                  <Text className="day-modal__anniv-name">{item.name}</Text>
                  {item.note ? <Text className="day-modal__anniv-note">{item.note}</Text> : null}
                </View>
              </View>
            ))}
          {anniversaries.length > 0 && <Button className="day-modal__anniv-add day-modal__anniv-add--ghost" onClick={onCreateAnniversary}>再加一个</Button>}
        </View>
      </View>
    </MiniappModal>
  )
}
