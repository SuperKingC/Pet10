import { useEffect, useMemo } from 'react'
import { Image, Text, View } from '@tarojs/components'
import { UNLOCK_JUMP_DURATION_MS, createUnlockEffects } from '../../domain/xiaoduoliUnlock'
import './XiaoduoliBoxScene.scss'

const boxImage = require('../../assets/nest/xiaoduoli-box.png')
const peekImage = require('../../assets/nest/xiaoduoli-peek.png')
const standingImage = require('../../assets/xiaoduoli.png')

type Props = {
  phase?: 'idle' | 'jumping'
  effectSeed?: string
  onJumpFinished?: () => void
}

export function XiaoduoliBoxScene({ phase = 'idle', effectSeed = 'invite', onJumpFinished }: Props) {
  const effects = useMemo(() => createUnlockEffects(effectSeed), [effectSeed])

  useEffect(() => {
    if (phase !== 'jumping') return undefined
    const timer = setTimeout(() => onJumpFinished?.(), UNLOCK_JUMP_DURATION_MS)
    return () => clearTimeout(timer)
  }, [phase, onJumpFinished])

  return (
    <View className={phase === 'jumping' ? 'xiaoduoli-box xiaoduoli-box--jumping' : 'xiaoduoli-box'} aria-label="小多利的小窝">
      <View className="xiaoduoli-box__stage">
        <View className="xiaoduoli-box__shadow" />
        <View className="xiaoduoli-box__box-wrap">
          <Image className="xiaoduoli-box__box" src={boxImage} mode="aspectFit" fadeIn={false} />
        </View>
        <View className="xiaoduoli-box__puppy-wrap">
          <Image className="xiaoduoli-box__puppy" src={peekImage} mode="aspectFit" fadeIn={false} />
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
