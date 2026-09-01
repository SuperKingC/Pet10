import { Image, View } from '@tarojs/components'
import { useEffect, useState } from 'react'
import { suitAssets } from '../../services/wardrobeSuitAssets'
import {
  isOverlaySuit,
  OUTFIT_LAYER_STYLE,
  resolveOverlayStyle,
  suitCategory,
  type OutfitPieces,
  type SuitKey
} from '../../domain/wardrobeModel'
import './MiniappOutfitPortrait.scss'

interface MiniappOutfitPortraitProps {
  /** 当前套装 key；空/default 显示原装小多利（旧用法：单套装，主体与配饰二选一） */
  suitKey?: string | null
  /** 按类别的完整穿戴；传入时进入多层叠加模式（flow：立绘满盒，配饰百分比与图对齐） */
  pieces?: OutfitPieces
  /** flow 模式必须给定图盒高度（rpx）：立绘按显式宽高渲染，不再用 widthFix——
      widthFix 在兄弟节点 setData 时会被微信重测量，立绘闪一下（名片开关/切 tab 反馈的根因） */
  flowHeight?: number
  className?: string
}

/**
 * 小多利立绘（衣柜版）。两种模式：
 * - pieces 模式：主体服装整身立绘 + 每类配饰按标定叠加（原装用 OUTFIT_LAYER_STYLE，其余主体用 BODY_OVERLAY_STYLE）；
 *   容器宽度由调用方按 suitDisplayWidth(key, flowHeight) 给定、高度传 flowHeight，保证图盒=容器盒且尺寸恒定。
 * - suitKey 模式（兼容）：单套装展示；配饰套装仍叠在原装立绘上。
 * 叠穿层加载完成前微信 image 会按默认尺寸铺开盖在小多利身上（拉伸闪现），
 * 因此叠穿层 onLoad 前保持透明，加载后 180ms 淡入。
 */
export function MiniappOutfitPortrait({ suitKey, pieces, flowHeight, className }: MiniappOutfitPortraitProps) {
  const [layerLoaded, setLayerLoaded] = useState<Record<string, boolean>>({})
  const piecesKey = pieces ? `${pieces.body}|${pieces.hat}|${pieces.scarf}|${pieces.bag}` : ''
  useEffect(() => {
    setLayerLoaded({})
  }, [piecesKey])

  if (pieces) {
    if (!flowHeight) throw new Error('MiniappOutfitPortrait flow 模式必须传 flowHeight')
    const body = pieces.body && suitCategory(pieces.body) === 'body' ? pieces.body : 'default'
    const baseDisplay = suitAssets.resolveSuitDisplay(body)
    const accessories = (['hat', 'scarf', 'bag'] as const).flatMap((slot) => {
      const key = pieces[slot]
      if (!key) return []
      const style = resolveOverlayStyle(body, key as SuitKey)
      if (!style) return []
      return [{ slot, key, style, src: suitAssets.resolveSuitDisplay(key) }]
    })
    return (
      <View
        className={`outfit-portrait outfit-portrait--flow ${className ?? ''}`}
        style={{ height: `${flowHeight}rpx` }}
      >
        <Image className="outfit-portrait__image outfit-portrait__image--flow" src={baseDisplay} mode="aspectFill" />
        {accessories.map((layer) => (
          <Image
            key={layer.key}
            className={`outfit-portrait__layer${layerLoaded[layer.slot] ? ' outfit-portrait__layer--ready' : ''}`}
            src={layer.src}
            mode="widthFix"
            style={layer.style}
            onLoad={() => setLayerLoaded((current) => ({ ...current, [layer.slot]: true }))}
          />
        ))}
      </View>
    )
  }

  const base = suitAssets.resolveSuitDisplay('default')
  if (suitKey && isOverlaySuit(suitKey)) {
    const display = suitAssets.resolveSuitDisplay(suitKey)
    return (
      <View className={`outfit-portrait ${className ?? ''}`}>
        <Image className="outfit-portrait__image" src={base} mode="aspectFit" />
        <Image
          className={`outfit-portrait__layer${layerLoaded.suit ? ' outfit-portrait__layer--ready' : ''}`}
          src={display}
          mode="widthFix"
          style={OUTFIT_LAYER_STYLE[suitKey as SuitKey]}
          onLoad={() => setLayerLoaded((current) => ({ ...current, suit: true }))}
        />
      </View>
    )
  }

  const display = suitKey ? suitAssets.resolveSuitDisplay(suitKey) : base
  return (
    <View className={`outfit-portrait ${className ?? ''}`}>
      <Image className="outfit-portrait__image" src={display} mode="aspectFit" />
    </View>
  )
}
