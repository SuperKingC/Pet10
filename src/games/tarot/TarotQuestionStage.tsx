import { useState } from 'react'

const PROMPTS = [
  '我现在最需要看清的是什么？',
  '怎样做才能突破目前的瓶颈？',
  '这段关系真正的课题是什么？',
  '下一步怎样走会更稳妥？',
  '我正在忽略哪一个重要信号？',
  '现在最值得投入的方向是什么？'
]

interface TarotQuestionStageProps {
  question: string
  onQuestionChange(question: string): void
  onContinue(): void
}

export function TarotQuestionStage({ question, onQuestionChange, onContinue }: TarotQuestionStageProps) {
  const [promptOffset, setPromptOffset] = useState(0)
  const prompts = Array.from({ length: 3 }, (_, index) => PROMPTS[(promptOffset + index) % PROMPTS.length])

  return (
    <section className="tarot-stage tarot-stage--question">
      <p className="tarot-stage__title">先写下你真正想知道的事</p>
      <textarea
        className="tarot-question"
        value={question}
        onChange={(event) => onQuestionChange(event.target.value)}
        placeholder="例如：我该如何面对这段关系？"
        maxLength={120}
      />
      <div className="tarot-prompts__header">
        <span>不知道怎么问？试试这些</span>
        <button type="button" onClick={() => setPromptOffset((value) => value + 3)}>换一批</button>
      </div>
      <div className="tarot-prompts">
        {prompts.map((prompt) => (
          <button type="button" key={prompt} className="tarot-prompt" onClick={() => onQuestionChange(prompt)}>{prompt}</button>
        ))}
      </div>
      <button className="tarot-next" disabled={!question.trim()} onClick={onContinue}>下一步 · 选牌阵</button>
    </section>
  )
}
