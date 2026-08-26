import { Button, Image, Text, View } from '@tarojs/components'
import type { MiniappAnniversary } from '../../services/socialApi'
import { anniversaryIcons, type AnniversaryIconKey } from './anniversaryAssets'
import { sortAnniversaries, statsLines } from './anniversaryModel'
import './anniversary.scss'

interface AnniversaryListViewProps {
  items: MiniappAnniversary[]
  today: Date
  onAdd(): void
  onEdit(id: string): void
}

export function AnniversaryListView({ items, today, onAdd, onEdit }: AnniversaryListViewProps) {
  const sorted = sortAnniversaries(items, today)
  return (
    <View className="anniv-list">
      {sorted.length === 0 && (
        <View className="anniv-list__empty">
          <Text>还没有纪念日，把重要的日子记下来吧。</Text>
        </View>
      )}
      {sorted.map((item) => (
        <View key={item.id} className="anniv-list__card" onClick={() => onEdit(item.id)}>
          <Image className="anniv-list__icon" src={anniversaryIcons[item.icon as AnniversaryIconKey] ?? anniversaryIcons.heart} mode="aspectFit" />
          <View className="anniv-list__body">
            <View className="anniv-list__head">
              <Text className="anniv-list__name">{item.name}</Text>
              <Text className="anniv-list__day">{item.day}</Text>
            </View>
            {item.note ? <Text className="anniv-list__note">{item.note}</Text> : null}
            {statsLines(item, today).map((line) => (
              <Text key={line} className="anniv-list__stats">{line}</Text>
            ))}
          </View>
        </View>
      ))}
      <Button className="anniv-list__add" onClick={onAdd}>+ 添加纪念日</Button>
    </View>
  )
}
