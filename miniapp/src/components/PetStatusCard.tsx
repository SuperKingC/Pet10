import { Image, Text, View } from '@tarojs/components'
import type { PetState } from '../domain/types'
import { MiniappOutfitPortrait } from '../features/main/MiniappOutfitPortrait'
import './PetStatusCard.scss'

type Props = { pet: PetState; onOpenMemories?: () => void; /** 衣柜当前套装 key（空/default 显示原装小多利） */ suitKey?: string | null }
const roomBackground = require('../assets/room-background.jpg')
const statuses = [
  ['饱食', 'hunger', '#f3a85d'],
  ['心情', 'mood', '#ed7e9a'],
  ['精力', 'energy', '#66b9ad'],
  ['健康', 'health', '#82a9e9'],
] as const

export function PetStatusCard({ pet, onOpenMemories, suitKey }: Props) {
  const experiencePercent = Math.min(100, (pet.experience / pet.experienceToNextLevel) * 100)
  return (
    <View className="pet-status-card">
      <View className="pet-card-scene">
        <Image className="pet-card-background" src={roomBackground} mode="aspectFill" />
        <Text className="pet-level">Lv.{pet.level}</Text>
        <View className="pet-avatar-image">
          <MiniappOutfitPortrait suitKey={suitKey} />
        </View>
        <Text className="pet-name-badge">{pet.name}</Text>
        {onOpenMemories && (
          <View className="pet-memory-button" onClick={onOpenMemories}>
            <Text>记忆</Text>
          </View>
        )}
      </View>
      <View className="pet-card-experience">
        <Text className="pet-caption">{pet.moodLabel === 'sleepy' ? '困困的想休息' : '开心地陪着你们'}</Text>
        <View className="experience-meta"><Text>成长经验</Text><Text>{pet.experience}/{pet.experienceToNextLevel}</Text></View>
        <View className="experience-track"><View style={{ width: `${experiencePercent}%` }} /></View>
        <View className="status-grid">
          {statuses.map(([label, key, tone]) => (
            <View className="status-item" key={key}>
              <View className="status-meta"><Text>{label}</Text><Text>{pet[key]}</Text></View>
              <View className="status-track"><View style={{ width: `${pet[key]}%`, backgroundColor: tone }} /></View>
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}
