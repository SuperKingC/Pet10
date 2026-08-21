import { useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import { calculateMbti, MBTI_DIMENSION_LABELS, MBTI_QUESTIONS } from '../../domain/mbtiTest'
import './MiniappMbtiTest.scss'

export function MiniappMbtiTest({ onComplete, onClose }: {
  onComplete(result: string): void
  onClose(): void
}) {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<boolean[]>([])
  const question = MBTI_QUESTIONS[index]
  const progress = Math.round((index / MBTI_QUESTIONS.length) * 100)

  const answer = (first: boolean) => {
    const next = [...answers, first]
    if (next.length === MBTI_QUESTIONS.length) {
      onComplete(calculateMbti(next))
      return
    }
    setAnswers(next)
    setIndex(index + 1)
  }

  return (
    <View className="miniapp-mbti">
      <View className="miniapp-mbti__backdrop" onClick={onClose} />
      <View className="miniapp-mbti__sheet">
        <View className="miniapp-mbti__top">
          <Button className="miniapp-mbti__close" onClick={onClose}>×</Button>
          <Text>性格快问快答 · {index + 1}/{MBTI_QUESTIONS.length}</Text>
        </View>
        <View className="miniapp-mbti__progress"><View style={{ width: `${progress}%` }} /></View>
        <Text className="miniapp-mbti__eyebrow">{MBTI_DIMENSION_LABELS[question.dimension][0]} ↔ {MBTI_DIMENSION_LABELS[question.dimension][1]}</Text>
        <Text className="miniapp-mbti__question">{question.text}</Text>
        <Button className="miniapp-mbti__option" onClick={() => answer(true)}>{question.options[0]}</Button>
        <Button className="miniapp-mbti__option" onClick={() => answer(false)}>{question.options[1]}</Button>
      </View>
    </View>
  )
}
