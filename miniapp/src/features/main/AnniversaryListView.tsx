import { Button, Image, Text, View } from '@tarojs/components'
import type { MiniappAnniversary } from '../../services/socialApi'
import { anniversaryIcons, type AnniversaryIconKey } from './anniversaryAssets'
import { anniversaryStats, sortAnniversaries } from './anniversaryModel'
import './anniversary.scss'

interface AnniversaryListViewProps {
  items: MiniappAnniversary[]
  today: Date
  onAdd(): void
  onEdit(id: string): void
}

interface AnniversaryCountdown {
  count: string
  unit: string
  sub: string
  isToday: boolean
}

function formatDay(day: string): string {
  return `${Number(day.slice(0, 4))}年${Number(day.slice(5, 7))}月${Number(day.slice(8, 10))}日`
}

function countdownOf(item: MiniappAnniversary, today: Date): AnniversaryCountdown {
  const stats = anniversaryStats(item, today)
  if (stats.isAnniversaryToday) {
    return {
      count: '今天',
      unit: '',
      sub: item.repeatRule === 'yearly' ? `第 ${stats.nextAnniversaryYear} 周年 🎉` : '就是今天 🎉',
      isToday: true,
    }
  }
  if (stats.daysUntilNext > 0) {
    return {
      count: String(stats.daysUntilNext),
      unit: '天后',
      sub: stats.daysSince >= 0 ? `已走过 ${stats.daysSince} 天` : '期待中 ✨',
      isToday: false,
    }
  }
  return { count: String(-stats.daysUntilNext), unit: '天前', sub: '', isToday: false }
}

export function AnniversaryListView({ items, today, onAdd, onEdit }: AnniversaryListViewProps) {
  const sorted = sortAnniversaries(items, today)
  return (
    <View className="anniv-list">
      {sorted.length === 0 && (
        <View className="anniv-list__empty">
          <Image className="anniv-list__empty-icon" src={anniversaryIcons.balloon} mode="aspectFit" />
          <Text className="anniv-list__empty-title">还没有纪念日</Text>
          <Text className="anniv-list__empty-hint">和小多利一起，把重要的日子记下来吧。</Text>
        </View>
      )}
      {sorted.map((item) => {
        const countdown = countdownOf(item, today)
        return (
          <View
            key={item.id}
            className={`anniv-list__card${countdown.isToday ? ' anniv-list__card--today' : ''}`}
            onClick={() => onEdit(item.id)}
          >
            <View className="anniv-list__icon-ring">
              <Image
                className="anniv-list__icon"
                src={anniversaryIcons[item.icon as AnniversaryIconKey] ?? anniversaryIcons.heart}
                mode="aspectFit"
              />
            </View>
            <View className="anniv-list__body">
              <Text className="anniv-list__name">{item.name}</Text>
              <Text className="anniv-list__meta">
                {formatDay(item.day)} · {item.repeatRule === 'yearly' ? '每年' : '单次'}
              </Text>
              {item.note ? <Text className="anniv-list__note">{item.note}</Text> : null}
              {countdown.sub ? <Text className="anniv-list__sub">{countdown.sub}</Text> : null}
            </View>
            <View className={`anniv-list__count${countdown.isToday ? ' anniv-list__count--today' : ''}`}>
              <Text className="anniv-list__count-num">{countdown.count}</Text>
              {countdown.unit ? <Text className="anniv-list__count-unit">{countdown.unit}</Text> : null}
            </View>
          </View>
        )
      })}
      <Button className="anniv-list__add" onClick={onAdd}>+ 添加纪念日</Button>
    </View>
  )
}
