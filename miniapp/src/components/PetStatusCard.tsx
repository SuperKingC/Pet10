import { Image, Text, View } from '@tarojs/components'
import { useEffect, useState } from 'react'
import type { PetState } from '../domain/types'
import { MiniappOutfitPortrait } from '../features/main/MiniappOutfitPortrait'
import { getXiaoduoliSpeech } from '../features/main/xiaoduoliSpeech'
import './PetStatusCard.scss'

type Props = { pet: PetState; onOpenMemories?: () => void; /** 衣柜当前套装 key（空/default 显示原装小多利） */ suitKey?: string | null }
const roomBackground = require('../assets/room-background.jpg')
const statuses = [
  ['饱食', 'hunger', '#f3a85d'],
  ['心情', 'mood', '#ed7e9a'],
  ['精力', 'energy', '#66b9ad'],
  ['健康', 'health', '#82a9e9'],
] as const

// 闲聊飘字轮播间隔：与气泡动画节奏错开，读得完再换下一句
const SPEECH_ROTATE_MS = 6000

export function PetStatusCard({ pet, onOpenMemories, suitKey }: Props) {
  const experiencePercent = Math.min(100, (pet.experience / pet.experienceToNextLevel) * 100)
  const [speechIndex, setSpeechIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setSpeechIndex((index) => index + 1), SPEECH_ROTATE_MS)
    return () => clearInterval(timer)
  }, [])
  const speech = getXiaoduoliSpeech(pet, speechIndex)

  return (
    <View className="pet-status-card">
      <View className="pet-card-scene">
        {/* 整图宽适配、底部锚定：完整露出地毯与光影，小多利踩在地毯阴影上 */}
        <Image className="pet-card-background" src={roomBackground} mode="widthFix" />
        <Text className="pet-level">Lv.{pet.level}</Text>
        <View className="pet-avatar-image">
          <MiniappOutfitPortrait suitKey={suitKey} />
        </View>
        <View className="pet-speech" key={speech}>
          <Text className="pet-speech__text">{speech}</Text>
        </View>
        <Text className="pet-name-badge">{pet.name}</Text>
        {onOpenMemories && (
          <View className="pet-memory-button" onClick={onOpenMemories}>
            <Text>记忆</Text>
          </View>
        )}
      </View>
      <View className="pet-card-experience">
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
