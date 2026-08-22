import { useEffect, useState } from 'react'
import { Image, Text, View } from '@tarojs/components'
import type { DrawnTarotCard } from './tarotCards'
import { getTarotArtworkUrl, TAROT_CARD_BACK } from './tarotAssets'

interface MiniappTarotCardProps {
  drawn: DrawnTarotCard
  flipped: boolean
  compact?: boolean
}

export function MiniappTarotCard({ drawn, flipped, compact = false }: MiniappTarotCardProps) {
  const [artFailed, setArtFailed] = useState(false)
  const [settled, setSettled] = useState(false)

  // once the flip transition finishes, drop the 3D context so the renderer
  // rasterizes the artwork at full device resolution instead of a blurry
  // perspective layer
  useEffect(() => {
    if (!flipped) {
      setSettled(false)
      return
    }
    const timer = setTimeout(() => setSettled(true), 820)
    return () => clearTimeout(timer)
  }, [flipped])

  return (
    <View
      className={[
        'miniapp-tarot-card',
        flipped ? 'miniapp-tarot-card--flipped' : '',
        settled ? 'miniapp-tarot-card--settled' : '',
        compact ? 'miniapp-tarot-card--compact' : '',
      ].filter(Boolean).join(' ')}
    >
      <View className="miniapp-tarot-card__body">
        <View className="miniapp-tarot-card__face miniapp-tarot-card__back">
          <Image src={TAROT_CARD_BACK} mode="aspectFill" fadeIn={false} />
        </View>
        <View className="miniapp-tarot-card__face miniapp-tarot-card__front">
          {!artFailed ? (
            <Image
              className={drawn.reversed ? 'miniapp-tarot-card__art miniapp-tarot-card__art--reversed' : 'miniapp-tarot-card__art'}
              src={getTarotArtworkUrl(drawn.card.id)}
              mode="aspectFill"
              fadeIn={false}
              onError={() => setArtFailed(true)}
            />
          ) : (
            <View className="miniapp-tarot-card__fallback">
              <Text>{drawn.card.symbol}</Text>
              <Text>{drawn.card.name}</Text>
            </View>
          )}
          <Text className="miniapp-tarot-card__numeral">{drawn.card.numeral}</Text>
        </View>
      </View>
      {flipped && (
        <View className="miniapp-tarot-card__labels">
          <Text>{drawn.card.name}</Text>
          <Text>{drawn.reversed ? '逆位' : '正位'} · {drawn.position}</Text>
        </View>
      )}
    </View>
  )
}
