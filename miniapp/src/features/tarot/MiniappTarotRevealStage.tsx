import { useEffect, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import type { DrawnTarotCard } from './tarotCards'
import { MiniappTarotCard } from './MiniappTarotCard'

interface MiniappTarotRevealStageProps {
  drawn: DrawnTarotCard[]
  flipped: boolean[]
  onFlip(index: number): void
  onContinue(): void
}

export function MiniappTarotRevealStage({
  drawn,
  flipped,
  onFlip,
  onContinue,
}: MiniappTarotRevealStageProps) {
  const allFlipped = flipped.length > 0 && flipped.every(Boolean)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!allFlipped) {
      setReady(false)
      return
    }
    const timer = setTimeout(() => setReady(true), 500)
    return () => clearTimeout(timer)
  }, [allFlipped])

  return (
    <View className="miniapp-tarot__stage miniapp-tarot__stage--reveal">
      <Text className="miniapp-tarot__title">{allFlipped ? '牌已全部翻开' : '逐张点开，翻开你的牌'}</Text>
      <View className="miniapp-tarot__reveal-row">
        {drawn.map((item, index) => (
          <Button
            key={`${item.card.id}-${index}`}
            className="miniapp-tarot__reveal-slot"
            disabled={flipped[index]}
            onClick={() => onFlip(index)}
          >
            <MiniappTarotCard drawn={item} flipped={flipped[index]} compact={drawn.length >= 5} />
          </Button>
        ))}
      </View>
      <Button className="miniapp-tarot__next" disabled={!ready} onClick={onContinue}>
        {allFlipped ? '查看解读' : `已翻开 ${flipped.filter(Boolean).length}/${drawn.length}`}
      </Button>
    </View>
  )
}
