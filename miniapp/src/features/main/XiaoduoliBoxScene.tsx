import { useEffect, useMemo } from 'react'
import { Image, Text, View } from '@tarojs/components'
import { UNLOCK_JUMP_DURATION_MS, createUnlockEffects } from '../../domain/xiaoduoliUnlock'
import type { XiaoduoliFaceAction } from '../../domain/xiaoduoliBehavior'
import { useXiaoduoliIdleBehavior } from './useXiaoduoliIdleBehavior'
import './XiaoduoliBoxScene.scss'

const streetImage = require('../../assets/nest/xiaoduoli-street-v3.webp')
const boxImage = require('../../assets/nest/xiaoduoli-box.png')
const bodyImage = require('../../assets/nest/xiaoduoli-body.png')
const eyesImage = require('../../assets/nest/xiaoduoli-eyes.png')
const pupilsImage = require('../../assets/nest/xiaoduoli-pupils.png')
const lidsImage = require('../../assets/nest/xiaoduoli-lids.png')
const standingImage = require('../../assets/xiaoduoli.png')

// 眨眼 = 眼睑淡入 + 瞳孔压扁；瞟眼 = 瞳孔在眼眶内滑动
const pupilsClassNames: Record<XiaoduoliFaceAction, string> = {
  blink: 'xiaoduoli-box__pupils--blink',
  blinkTwice: 'xiaoduoli-box__pupils--blink-twice',
  glanceLeft: 'xiaoduoli-box__pupils--glance-left',
  glanceRight: 'xiaoduoli-box__pupils--glance-right',
}
const lidsClassNames: Record<XiaoduoliFaceAction, string> = {
  blink: 'xiaoduoli-box__lids--blink',
  blinkTwice: 'xiaoduoli-box__lids--blink-twice',
  glanceLeft: '',
  glanceRight: '',
}

type Props = {
  phase?: 'idle' | 'jumping'
  effectSeed?: string
  onJumpFinished?: () => void
}

export function XiaoduoliBoxScene({ phase = 'idle', effectSeed = 'invite', onJumpFinished }: Props) {
  const effects = useMemo(() => createUnlockEffects(effectSeed), [effectSeed])
  const behavior = useXiaoduoliIdleBehavior({ active: phase === 'idle', seed: effectSeed })

  useEffect(() => {
    if (phase !== 'jumping') return undefined
    const timer = setTimeout(() => onJumpFinished?.(), UNLOCK_JUMP_DURATION_MS)
    return () => clearTimeout(timer)
  }, [phase, onJumpFinished])

  const rootClassName = phase === 'jumping'
    ? 'xiaoduoli-box xiaoduoli-box--jumping'
    : behavior.body === 'hop'
      ? 'xiaoduoli-box xiaoduoli-box--hop'
      : 'xiaoduoli-box'
  const lookClassName = behavior.body === 'lookLeft'
    ? 'xiaoduoli-box__look--left'
    : behavior.body === 'lookRight'
      ? 'xiaoduoli-box__look--right'
      : ''
  const eyesClassName = behavior.face ? pupilsClassNames[behavior.face] : ''
  const lidsClassName = behavior.face ? lidsClassNames[behavior.face] : ''

  return (
    <View className={rootClassName} aria-label="小多利的小窝">
      <View className="xiaoduoli-box__stage">
        <Image className="xiaoduoli-box__street" src={streetImage} mode="aspectFill" fadeIn={false} />
        <View className="xiaoduoli-box__shadow" />
        <View className="xiaoduoli-box__box-wrap">
          <Image className="xiaoduoli-box__box" src={boxImage} mode="aspectFit" fadeIn={false} />
        </View>
        <View className="xiaoduoli-box__puppy-wrap">
          <View className="xiaoduoli-box__puppet">
            <View className="xiaoduoli-box__breathe">
              <View className="xiaoduoli-box__bob">
                <View className={`xiaoduoli-box__look ${lookClassName}`}>
                  <Image className="xiaoduoli-box__body" src={bodyImage} mode="aspectFit" fadeIn={false} />
                  <Image
                    className="xiaoduoli-box__eyes"
                    src={eyesImage}
                    mode="scaleToFill"
                    fadeIn={false}
                  />
                  <Image
                    className={`xiaoduoli-box__pupils ${eyesClassName}`}
                    src={pupilsImage}
                    mode="scaleToFill"
                    fadeIn={false}
                  />
                  <Image
                    className={`xiaoduoli-box__lids ${lidsClassName}`}
                    src={lidsImage}
                    mode="scaleToFill"
                    fadeIn={false}
                  />
                </View>
              </View>
            </View>
          </View>
        </View>
        <View className="xiaoduoli-box__standing-wrap">
          <Image className="xiaoduoli-box__standing" src={standingImage} mode="aspectFit" fadeIn={false} />
        </View>
        {phase === 'jumping' && effects.ribbons.map((ribbon, index) => (
          <View
            key={`ribbon-${index}`}
            className="xiaoduoli-box__ribbon"
            style={{
              left: `${ribbon.left}%`,
              backgroundColor: ribbon.color,
              animationDelay: `${ribbon.delay}s`,
              animationDuration: `${ribbon.duration}s`,
              ['--ribbon-rotate' as string]: `${ribbon.rotate}deg`,
            }}
          />
        ))}
        {phase === 'jumping' && effects.stars.map((star, index) => (
          <Text
            key={`star-${index}`}
            className="xiaoduoli-box__star"
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
              animationDelay: `${star.delay}s`,
              animationDuration: `${star.duration}s`,
            }}
          >
            ✦
          </Text>
        ))}
      </View>
    </View>
  )
}
