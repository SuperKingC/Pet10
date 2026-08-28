import { Image, Text, View } from '@tarojs/components'
import type { PetState } from '../domain/types'
import './PetStatusCard.scss'

type Props = { pet: PetState; onOpenMemories?: () => void }
const roomBackground = require('../assets/room-background.webp')
const statuses = [
  ['饱食', 'hunger', '#f3a85d'],
  ['心情', 'mood', '#ed7e9a'],
  ['精力', 'energy', '#66b9ad'],
  ['健康', 'health', '#82a9e9'],
] as const

export function PetStatusCard({ pet, onOpenMemories }: Props) {
  const experiencePercent = Math.min(100, (pet.experience / pet.experienceToNextLevel) * 100)
  return (
    <View className="pet-status-card">
      <View className="pet-card-scene">
        <Image className="pet-card-background" src={roomBackground} mode="aspectFill" />
        <Text className="pet-level">Lv.{pet.level}</Text>
        <Image className="pet-avatar-image" src={require('../assets/xiaoduoli.webp')} mode="aspectFit" />
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
