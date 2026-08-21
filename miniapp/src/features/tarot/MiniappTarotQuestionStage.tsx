import { useState } from 'react'
import { Button, Text, Textarea, View } from '@tarojs/components'

const prompts = [
  '我现在最需要看清的是什么？',
  '怎样做才能突破目前的瓶颈？',
  '这段关系真正的课题是什么？',
  '下一步怎样走会更稳妥？',
  '我正在忽略哪一个重要信号？',
  '现在最值得投入的方向是什么？',
]

interface MiniappTarotQuestionStageProps {
  question: string
  onQuestionChange(question: string): void
  onContinue(): void
}

export function MiniappTarotQuestionStage({
  question,
  onQuestionChange,
  onContinue,
}: MiniappTarotQuestionStageProps) {
  const [promptOffset, setPromptOffset] = useState(0)
  const visiblePrompts = Array.from(
    { length: 3 },
    (_, index) => prompts[(promptOffset + index) % prompts.length],
  )

  return (
    <View className="miniapp-tarot__stage miniapp-tarot__stage--question">
      <Text className="miniapp-tarot__title">先写下你真正想知道的事</Text>
      <Textarea
        className="miniapp-tarot__question"
        value={question}
        placeholder="例如：我该如何面对这段关系？"
        maxlength={120}
        onInput={(event) => onQuestionChange(event.detail.value)}
      />
      <View className="miniapp-tarot__prompt-header">
        <Text>不知道怎么问？试试这些</Text>
        <Button onClick={() => setPromptOffset((value) => value + 3)}>换一批</Button>
      </View>
      <View className="miniapp-tarot__prompts">
        {visiblePrompts.map((prompt) => (
          <Button
            key={prompt}
            className="miniapp-tarot__prompt"
            onClick={() => onQuestionChange(prompt)}
          >
            {prompt}
          </Button>
        ))}
      </View>
      <Button
        className="miniapp-tarot__next"
        disabled={!question.trim()}
        onClick={onContinue}
      >
        下一步 · 选牌阵
      </Button>
    </View>
  )
}
