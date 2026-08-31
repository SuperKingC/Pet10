import { useState } from 'react'
import { Button, Image, Text, View } from '@tarojs/components'
import type { MiniappAnniversary } from '../../services/socialApi'
import { anniversaryIcons, type AnniversaryIconKey } from './anniversaryAssets'
import { anniversaryPhotoBoxHeight, anniversaryStats, sortAnniversaries } from './anniversaryModel'
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
  // 照片展示区高度按原图宽高比换算：onLoad 实测比例写入状态，更换照片后由下一次 onLoad 覆盖
  const [photoAspects, setPhotoAspects] = useState<Record<string, number>>({})
  const rememberPhotoAspect = (id: string, event: { detail?: { width?: number | string; height?: number | string } }) => {
    // Taro 的 onLoadEventDetail 把宽高声明为 string | number，统一强转后再用
    const width = Number(event.detail?.width ?? 0)
    const height = Number(event.detail?.height ?? 0)
    if (width > 0 && height > 0) {
      const aspect = height / width
      setPhotoAspects((current) => (current[id] === aspect ? current : { ...current, [id]: aspect }))
    }
  }
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
          // 照片完整展示：宽度铺满、高度按实测比例换算（夹在 360–640rpx），
          // 倒计时信息放下方实底信息条——不再把照片裁切铺底当背景
          const boxHeight = anniversaryPhotoBoxHeight(photoAspects[item.id])
          return (
            <View
              key={item.id}
              className={`anniv-list__photo-card${countdown.isToday ? ' anniv-list__photo-card--today' : ''}`}
              onClick={() => onEdit(item.id)}
            >
              <View className="anniv-list__photo-stage" style={{ height: `${boxHeight}rpx` }}>
                <Image
                  className="anniv-list__photo-img"
                  src={item.photo}
                  mode="aspectFit"
                  onLoad={(event) => rememberPhotoAspect(item.id, event)}
                />
              </View>
              <View className="anniv-list__photo-info">
                <Text className="anniv-list__photo-lead">{item.name} · {countdown.isToday ? '就是今天' : (countdown.unit === '天后' ? '还有' : '已经')}</Text>
                <View className="anniv-list__photo-count">
                  <Text className="anniv-list__photo-num">{countdown.count}</Text>
                  {countdown.unit ? <Text className="anniv-list__photo-unit">{countdown.unit}</Text> : null}
                </View>
                <Text className="anniv-list__photo-day">{formatDay(item.day)} {formatWeekday(item.day)}</Text>
              </View>
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
