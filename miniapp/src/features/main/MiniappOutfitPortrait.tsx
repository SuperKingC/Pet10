import { Image, View } from '@tarojs/components'
import { suitAssets } from '../../services/wardrobeSuitAssets'
import { isOverlaySuit, OUTFIT_LAYER_STYLE } from '../../domain/wardrobeModel'
import './MiniappOutfitPortrait.scss'

interface MiniappOutfitPortraitProps {
  /** 当前套装 key；空/default 显示原装小多利 */
  suitKey?: string | null
  className?: string
}

/**
 * 小多利立绘（衣柜版）：叠穿件（帽/巾/包）= 原装立绘 + 服装图按定位元数据绝对定位叠加；
 * 主体服装 = 整套穿装立绘（素材中衣服与狗身融合，无法拆件）。素材未就绪时兜底原装。
 */
export function MiniappOutfitPortrait({ suitKey, className }: MiniappOutfitPortraitProps) {
  const base = suitAssets.resolveSuitDisplay('default')
  const layerStyle = suitKey ? OUTFIT_LAYER_STYLE[suitKey as keyof typeof OUTFIT_LAYER_STYLE] : undefined

  if (suitKey && !isOverlaySuit(suitKey)) {
    const display = suitAssets.resolveSuitDisplay(suitKey)
    return (
      <View className={`outfit-portrait ${className ?? ''}`}>
        <Image className="outfit-portrait__image" src={display} mode="aspectFit" />
      </View>
    )
  }

  return (
    <View className={`outfit-portrait ${className ?? ''}`}>
      <Image className="outfit-portrait__image" src={base} mode="aspectFit" />
      {suitKey && layerStyle && (
        <Image
          className="outfit-portrait__layer"
          src={suitAssets.resolveSuitDisplay(suitKey)}
          mode="widthFix"
          style={layerStyle}
        />
      )}
    </View>
  )
}
