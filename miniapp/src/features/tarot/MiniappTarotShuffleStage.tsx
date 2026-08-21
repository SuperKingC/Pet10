import { useEffect, useRef, useState } from 'react'
import { Button, Image, Text, View } from '@tarojs/components'
import { TAROT_CARD_BACK } from './tarotAssets'

interface MiniappTarotShuffleStageProps {
  progress: number
  onProgress(progress: number): void
  onContinue(): void
  onSkip(): void
}

const shuffleDurationMs = 2000

export function MiniappTarotShuffleStage({
  progress,
  onProgress,
  onContinue,
  onSkip,
}: MiniappTarotShuffleStageProps) {
  const timerRef = useRef<ReturnType<typeof setInterval>>()
  const startTimeRef = useRef(0)
  const startProgressRef = useRef(0)
  const [isShuffling, setIsShuffling] = useState(false)

  const stop = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = undefined
    setIsShuffling(false)
  }

  const start = () => {
    if (progress >= 100 || timerRef.current) return
    setIsShuffling(true)
    startTimeRef.current = Date.now()
    startProgressRef.current = progress
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      const next = Math.min(100, startProgressRef.current + (elapsed / shuffleDurationMs) * 100)
      onProgress(next)
      if (next >= 100) stop()
    }, 40)
  }

  useEffect(() => stop, [])

  return (
    <View className="miniapp-tarot__stage miniapp-tarot__stage--ritual">
      <Text className="miniapp-tarot__title">长按牌堆洗牌，让心意融进牌里</Text>
      <Button
        className={`miniapp-tarot__shuffle-deck${isShuffling ? ' miniapp-tarot__shuffle-deck--active' : ''}${progress >= 100 ? ' miniapp-tarot__shuffle-deck--complete' : ''}`}
        aria-label="长按洗牌"
        onTouchStart={start}
        onTouchEnd={stop}
        onTouchCancel={stop}
      >
        {Array.from({ length: 10 }, (_, index) => (
          <View key={index} className={`miniapp-tarot__deck-card miniapp-tarot__deck-card--${index + 1}`}>
            <Image src={TAROT_CARD_BACK} mode="aspectFill" fadeIn={false} />
          </View>
        ))}
        <View className="miniapp-tarot__shuffle-orbit miniapp-tarot__shuffle-orbit--outer" />
        <View className="miniapp-tarot__shuffle-orbit miniapp-tarot__shuffle-orbit--inner" />
        <View className="miniapp-tarot__shuffle-rune">✦</View>
        <View className="miniapp-tarot__shuffle-burst" />
      </Button>
      <View className="miniapp-tarot__shuffle-bar">
        <View style={{ width: `${progress}%` }} />
      </View>
      <Text className="miniapp-tarot__hint">{Math.round(progress)}% · 松手可暂停，再次长按继续</Text>
      <Button className="miniapp-tarot__next" disabled={progress < 100} onClick={onContinue}>
        {progress < 100 ? '继续洗牌…' : '下一步 · 切牌'}
      </Button>
      <Button className="miniapp-tarot__text-action" onClick={onSkip}>跳过洗牌与切牌</Button>
    </View>
  )
}
