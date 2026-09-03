import { Image, View } from '@tarojs/components'
import { useState } from 'react'
import { suitAssets } from '../../services/wardrobeSuitAssets'
import {
  isOverlaySuit,
  OUTFIT_LAYER_STYLE,
  resolveBodyLayerStyle,
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
 * - pieces 模式：底图恒为原装立绘，主体服装以切件层（BODY_LAYER_STYLE）叠加、配饰按标定叠加
 *   （OUTFIT_LAYER_STYLE，所有主体同一套——画布对齐后定位不再随主体换算）；切件未下载时先显示原装。
 *   容器宽度由调用方按 suitDisplayWidth('default', flowHeight) 给定、高度传 flowHeight，
 *   保证图盒=容器盒且尺寸恒定。
 * - suitKey 模式（兼容，照片墙套装卡）：单套装整套立绘展示；配饰套装仍叠在原装立绘上
 *   （容器非 436/700 比例、静态卡无行为幕 setData，保留 widthFix 免改照片墙观感）。
 * 叠层加载完成前透明（微信 image 未定高按默认尺寸铺开=拉伸闪现），onLoad 后淡入。
 * flow 叠层一律 aspectFit+显式宽高（widthFix 在睡觉/闲逛等行为幕 setData 时被微信重测量，
 * 衣服拉伸一下后闪没——2026-09-03 用户实测；显式高与 width 同源换算，见 wardrobeModel 层定位元数据）。
 * layerLoaded 按 src 累积、不随换装重置：换配饰时主体层 src 未变、onLoad 不会再触发，
 * 整体清空会让主体层永远停在透明态（点配饰身上衣服消失的根因，2026-09-03 用户实测）。
 */
export function MiniappOutfitPortrait({ suitKey, pieces, flowHeight, className }: MiniappOutfitPortraitProps) {
  const [layerLoaded, setLayerLoaded] = useState<Record<string, boolean>>({})
  const markLayerLoaded = (src: string) =>
    setLayerLoaded((current) => (current[src] ? current : { ...current, [src]: true }))

  if (pieces) {
    if (!flowHeight) throw new Error('MiniappOutfitPortrait flow 模式必须传 flowHeight')
    const body = pieces.body && suitCategory(pieces.body) === 'body' ? pieces.body : 'default'
    const baseDisplay = suitAssets.resolveSuitDisplay('default')
    const bodyLayerSrc = body === 'default' ? null : suitAssets.resolveSuitLayer(body)
    const bodyLayerStyle = body === 'default' ? undefined : resolveBodyLayerStyle(body)
    const accessories = (['hat', 'scarf', 'bag'] as const).flatMap((slot) => {
      const key = pieces[slot]
      if (!key) return []
      const style = resolveOverlayStyle(key as SuitKey)
      if (!style) return []
      return [{ slot, key, style, src: suitAssets.resolveSuitDisplay(key) }]
    })
    return (
      <View
        className={`outfit-portrait outfit-portrait--flow ${className ?? ''}`}
        style={{ height: `${flowHeight}rpx` }}
      >
        <Image className="outfit-portrait__image outfit-portrait__image--flow" src={baseDisplay} mode="aspectFill" />
        {bodyLayerSrc && bodyLayerStyle && (
          <Image
            className={`outfit-portrait__layer${layerLoaded[bodyLayerSrc] ? ' outfit-portrait__layer--ready' : ''}`}
            src={bodyLayerSrc}
            mode="aspectFit"
            style={bodyLayerStyle}
            onLoad={() => markLayerLoaded(bodyLayerSrc)}
          />
        )}
        {accessories.map((layer) => (
          <Image
            key={layer.key}
            className={`outfit-portrait__layer${layerLoaded[layer.src] ? ' outfit-portrait__layer--ready' : ''}`}
            src={layer.src}
            mode="aspectFit"
            style={layer.style}
            onLoad={() => markLayerLoaded(layer.src)}
          />
        ))}
      </View>
    )
  }

  const base = suitAssets.resolveSuitDisplay('default')
  if (suitKey && isOverlaySuit(suitKey)) {
    const display = suitAssets.resolveSuitDisplay(suitKey)
    const style = OUTFIT_LAYER_STYLE[suitKey as SuitKey]
    return (
      <View className={`outfit-portrait ${className ?? ''}`}>
        <Image className="outfit-portrait__image" src={base} mode="aspectFit" />
        <Image
          className={`outfit-portrait__layer${layerLoaded[display] ? ' outfit-portrait__layer--ready' : ''}`}
          src={display}
          mode="widthFix"
          style={style && { left: style.left, top: style.top, width: style.width }}
          onLoad={() => markLayerLoaded(display)}
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
