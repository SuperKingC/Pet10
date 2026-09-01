import { Image, Text, View } from '@tarojs/components'
import { useEffect, useState } from 'react'
import type { PetMood, PetState } from '../../domain/types'
import { MiniappModal } from '../../components/MiniappModal'
import { resolveAssetBaseUrl } from '../../services/assetBaseUrl'
import { suitAssets } from '../../services/wardrobeSuitAssets'
import { splitProfileLine, XIAODUOLI_PROFILE_LINES } from './xiaoduoliProfile'
import './MiniappPetCardModal.scss'

// 名片底图走 COS 按需下载（竖版水彩大图不占包体），加载失败回退同色系渐变卡面；
// ensureFile 的下载链路在部分环境会失败（系统代理拦截 localhost 等），回退 image 直连 URL
const PET_CARD_FILE = 'pet-card-v2.jpg'
const petCardUrl = () => `${resolveAssetBaseUrl()}/wardrobe/${PET_CARD_FILE}`

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

/** 小多利名片弹窗：竖版名片卡面（上立绘下档案），档案全文案参考「关于小多利」整行展示不省略。 */
export function MiniappPetCardModal({ open, pet, owners, onClose }: Props) {
  const [cardSrc, setCardSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!open || cardSrc) return
    let cancelled = false
    void suitAssets.ensureFile(PET_CARD_FILE)
      .then((path) => { if (!cancelled) setCardSrc(path ?? petCardUrl()) })
      .catch(() => { if (!cancelled) setCardSrc(petCardUrl()) })
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
            {/* 服务端心情引擎的动态文案优先（含被冷落推导），缺省退回本地昵称 */}
            <Text className="pet-card__mood">今天的心情：{pet.moodCaption ?? moodTitles[pet.moodLabel]}</Text>
            <View className="pet-card__divider" />
            {XIAODUOLI_PROFILE_LINES.map((line) => {
              const { label, content } = splitProfileLine(line)
              return (
                <Text className="pet-card__line" key={line}>
                  {label && <Text className="pet-card__line-label">{label}</Text>}
                  {content}
                </Text>
              )
            })}
            <View className="pet-card__footer">
              <Text className="pet-card__line pet-card__owners">
                <Text className="pet-card__line-label">铲屎官：</Text>
                {ownerLine}
              </Text>
              <Text className="pet-card__signature">汪！很高兴认识你们</Text>
            </View>
          </View>
        </View>
      </View>
    </MiniappModal>
  )
}
