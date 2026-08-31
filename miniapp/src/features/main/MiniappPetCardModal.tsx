import { Image, Text, View } from '@tarojs/components'
import { useEffect, useState } from 'react'
import type { PetMood, PetState } from '../../domain/types'
import { MiniappModal } from '../../components/MiniappModal'
import { suitAssets } from '../../services/wardrobeSuitAssets'
import './MiniappPetCardModal.scss'

// 名片底图走 COS 按需下载（水彩大图不占包体），加载失败回退同色系渐变卡面
const PET_CARD_FILE = 'pet-card-v1.jpg'

const moodTitles: Record<PetMood, string> = {
  happy: '开心果',
  hungry: '小馋狗',
  sleepy: '瞌睡虫',
  clingy: '粘人精',
}

type Props = {
  open: boolean
  pet: PetState
  /** 铲屎官署名（当前账号 + 共养好友），空数组时兜底文案 */
  owners: string[]
  onClose(): void
}

/** 小多利名片弹窗：水彩名片底图 + 右侧留白区排版真实资料，点小窝里的名牌打开。 */
export function MiniappPetCardModal({ open, pet, owners, onClose }: Props) {
  const [cardSrc, setCardSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!open || cardSrc) return
    let cancelled = false
    void suitAssets.ensureFile(PET_CARD_FILE)
      .then((path) => { if (!cancelled && path) setCardSrc(path) })
      .catch(() => undefined)
    return () => { cancelled = true }
  }, [open, cardSrc])

  if (!open) return null
  const ownerLine = owners.length > 0 ? owners.join(' · ') : '最喜欢的人们'

  return (
    <MiniappModal onClose={onClose}>
      <View className="pet-card" aria-label="小多利名片">
        <View className="pet-card__face">
          {cardSrc && <Image className="pet-card__art" src={cardSrc} mode="aspectFill" fadeIn={false} />}
          <View className="pet-card__body">
            <View className="pet-card__name-row">
              <Text className="pet-card__name">{pet.name}</Text>
              <Text className="pet-card__level">Lv.{pet.level}</Text>
            </View>
            <View className="pet-card__divider" />
            <View className="pet-card__field">
              <Text className="pet-card__label">今天的心情</Text>
              <Text className="pet-card__value">{moodTitles[pet.moodLabel]}</Text>
            </View>
            <View className="pet-card__field">
              <Text className="pet-card__label">品种</Text>
              <Text className="pet-card__value">全球限定一只的小狗</Text>
            </View>
            <View className="pet-card__field">
              <Text className="pet-card__label">铲屎官</Text>
              <Text className="pet-card__value pet-card__value--owners">{ownerLine}</Text>
            </View>
            <Text className="pet-card__signature">汪！很高兴认识你们</Text>
          </View>
        </View>
        <Text className="pet-card__hint">小多利独一无二的身份名片</Text>
      </View>
    </MiniappModal>
  )
}
