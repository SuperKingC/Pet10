import { Button, Image, Text, View } from '@tarojs/components'
import type { MiniappAnniversary } from '../../services/socialApi'
import { anniversaryIcons, type AnniversaryIconKey } from './anniversaryAssets'
import { anniversaryStats, sortAnniversaries } from './anniversaryModel'
import './anniversary.scss'

interface AnniversaryListViewProps {
  items: MiniappAnniversary[]
  loading?: boolean
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

function formatWeekday(day: string): string {
  return ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][new Date(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10))).getDay()]
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

export function AnniversaryListView({ items, loading = false, today, onAdd, onEdit }: AnniversaryListViewProps) {
  const sorted = sortAnniversaries(items, today)
  return (
    <View className="anniv-list">
      {loading && <View className="anniv-list__skeleton" />}
      {loading && <View className="anniv-list__skeleton anniv-list__skeleton--short" />}
      {!loading && sorted.length === 0 && (
        <View className="anniv-list__empty">
          <Image className="anniv-list__empty-icon" src={anniversaryIcons.balloon} mode="aspectFit" />
          <Text className="anniv-list__empty-title">还没有纪念日</Text>
          <Text className="anniv-list__empty-hint">和小多利一起，把重要的日子记下来吧。</Text>
        </View>
      )}
      {!loading && sorted.map((item) => {
        const countdown = countdownOf(item, today)
        if (item.photo) {
          return (
            <View
              key={item.id}
              className="anniv-list__photo-card"
              onClick={() => onEdit(item.id)}
            >
              <Image className="anniv-list__photo-bg" src={item.photo} mode="aspectFill" />
              <View className="anniv-list__photo-mask" />
              <Text className="anniv-list__photo-lead">{item.name} · {countdown.isToday ? '就是今天' : (countdown.unit === '天后' ? '还有' : '已经')}</Text>
              <View className="anniv-list__photo-count">
                <Text className="anniv-list__photo-num">{countdown.count}</Text>
                {countdown.unit ? <Text className="anniv-list__photo-unit">{countdown.unit}</Text> : null}
              </View>
              <Text className="anniv-list__photo-day">{formatDay(item.day)} {formatWeekday(item.day)}</Text>
            </View>
          )
        }
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
      {!loading && <Button className="anniv-list__add" onClick={onAdd}>+ 添加纪念日</Button>}
    </View>
  )
}
