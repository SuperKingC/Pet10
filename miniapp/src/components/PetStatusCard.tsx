import { Image, Text, View } from '@tarojs/components'
import { useEffect, useState } from 'react'
import type { PetState } from '../domain/types'
import { MiniappOutfitPortrait } from '../features/main/MiniappOutfitPortrait'
import { getXiaoduoliSpeech } from '../features/main/xiaoduoliSpeech'
import './PetStatusCard.scss'

type Props = {
  pet: PetState
  onOpenMemories?: () => void
  /** 衣柜当前套装 key（空/default 显示原装小多利） */
  suitKey?: string | null
  /** 点「小多利」名片打开名片弹窗 */
  onOpenCard?: () => void
}
const roomBackground = require('../assets/room-background-v2.jpg')
// 四项状态各自同色系渐变（深→浅），与经验条同一质感语言
const statuses = [
  ['饱食', 'hunger', '#f3a85d', '#f8c48d'],
  ['心情', 'mood', '#ed7e9a', '#f4aabd'],
  ['精力', 'energy', '#66b9ad', '#93d0c6'],
  ['健康', 'health', '#82a9e9', '#adc7f0'],
] as const

// 闲聊飘字轮播间隔：与气泡动画节奏错开，读得完再换下一句
const SPEECH_ROTATE_MS = 6000

export function PetStatusCard({ pet, onOpenMemories, suitKey, onOpenCard }: Props) {
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
        {/* 背景通栏铺满宽度、顶部对齐，底部超出部分裁掉 */}
        <Image className="pet-card-background" src={roomBackground} mode="widthFix" />
        <Text className="pet-level">Lv.{pet.level}</Text>
        <View className="pet-avatar-image">
          <MiniappOutfitPortrait suitKey={suitKey} />
        </View>
        <View className="pet-speech" key={speech}>
          <Text className="pet-speech__text">{speech}</Text>
        </View>
        <View
          className="pet-name-card"
          hoverClass="pet-name-card--hover"
          hoverStayTime={80}
          onClick={onOpenCard}
        >
          <Text className="pet-name-card__name">{pet.name}</Text>
          <Text className="pet-name-card__hint">名片</Text>
        </View>
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
          {statuses.map(([label, key, tone, toneLight]) => (
            <View className="status-item" key={key}>
              <View className="status-meta"><Text>{label}</Text><Text>{pet[key]}</Text></View>
              <View className="status-track"><View style={{ width: `${pet[key]}%`, background: `linear-gradient(90deg, ${tone}, ${toneLight})` }} /></View>
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}
