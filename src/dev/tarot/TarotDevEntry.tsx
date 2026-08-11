import { useEffect, useState } from 'react'
import { TarotCutStage } from '../../games/tarot/TarotCutStage'
import { TarotFanStage } from '../../games/tarot/TarotFanStage'
import { TarotQuestionStage } from '../../games/tarot/TarotQuestionStage'
import { TarotReadingStage } from '../../games/tarot/TarotReadingStage'
import { TarotRevealStage } from '../../games/tarot/TarotRevealStage'
import { TarotShuffleStage } from '../../games/tarot/TarotShuffleStage'
import { TarotSpreadStage } from '../../games/tarot/TarotSpreadStage'
import { MAJOR_ARCANA, type DrawnCard } from '../../games/tarot/tarotDeck'
import type { TarotReading } from '../../games/tarot/tarotReading'

export const TAROT_DEV_STAGES = ['question', 'spread', 'shuffle', 'cut', 'fan', 'reveal', 'reading'] as const
export type TarotDevStage = typeof TAROT_DEV_STAGES[number]

function readStage(search = typeof window === 'undefined' ? '' : window.location.search): TarotDevStage {
  const requested = new URLSearchParams(search).get('stage')
  return TAROT_DEV_STAGES.includes(requested as TarotDevStage) ? requested as TarotDevStage : 'question'
}

function readFanNeedCount(search = typeof window === 'undefined' ? '' : window.location.search): 3 | 5 {
  return new URLSearchParams(search).get('count') === '5' ? 5 : 3
}

function fixedCards(): DrawnCard[] {
  return MAJOR_ARCANA.slice(0, 3).map((card, index) => ({
    card,
    reversed: index === 1,
    position: ['过去', '现在', '未来'][index] ?? '核心指引'
  }))
}

function fixedReading(drawn: DrawnCard[]): TarotReading {
  return {
    question: '开发验收用问题',
    category: 'overall',
    spread: 'triple',
    drawn,
    cardTexts: drawn.map(() => '开发验收用牌面说明'),
    summary: '开发验收用阅读摘要',
    synthesis: '开发验收用牌阵关系',
    advice: ['开发验收用建议'],
    cautions: ['开发验收用提醒'],
    cardAnalyses: drawn.map(() => ({
      positionRole: '开发验收',
      symbolism: '开发验收',
      orientation: '开发验收',
      questionConnection: '开发验收',
      realWorldPattern: '开发验收',
      action: '开发验收',
      caution: '开发验收'
    })),
    closing: '开发验收用结语',
    next24Hours: '开发验收用提示',
    next7Days: '开发验收用提示',
    misreadings: ['开发验收用提示'],
    createdAt: '2026-08-10T00:00:00.000Z'
  }
}

export function TarotDevEntry({ search }: { search?: string }) {
  const stage = readStage(search)
  const fanNeedCount = readFanNeedCount(search)
  const drawn = fixedCards()
  const reading = fixedReading(drawn)
  const noOp = () => undefined
  const [cutCount, setCutCount] = useState(0)
  const [cutting, setCutting] = useState(false)
  const [fanPicked, setFanPicked] = useState([0])
  const [fanFlyingCard, setFanFlyingCard] = useState<number>()

  useEffect(() => {
    if (stage !== 'fan') return
    setFanPicked([0])
    setFanFlyingCard(undefined)
  }, [stage, search])

  return (
    <main className="tarot-game tarot-dev-entry" data-dev-stage={stage}>
      <header className="tarot-game__header">
        <span>塔罗阶段验收</span>
        <strong>{stage}</strong>
      </header>
      {stage === 'question' && (
        <TarotQuestionStage question="开发验收用问题" onQuestionChange={noOp} onContinue={noOp} />
      )}
      {stage === 'spread' && (
        <TarotSpreadStage spread="triple" onSpreadChange={noOp} onContinue={noOp} />
      )}
      {stage === 'shuffle' && (
        <TarotShuffleStage progress={55} onProgress={noOp} onContinue={noOp} onSkip={noOp} />
      )}
      {stage === 'cut' && (
        <TarotCutStage
          cutCount={cutCount}
          cutting={cutting}
          swapped={cutCount % 2 === 1}
          onStartCut={() => setCutting(true)}
          onFinishCut={() => {
            setCutCount((count) => count + 1)
            setCutting(false)
          }}
          onContinue={noOp}
        />
      )}
      {stage === 'fan' && (
        <TarotFanStage
          drawn={Array.from({ length: 10 }, (_, index) => ({ ...drawn[index % drawn.length], position: `验收牌 ${index + 1}` }))}
          picked={fanPicked}
          flyingCard={fanFlyingCard}
          needCount={fanNeedCount}
          onPick={(index) => {
            if (fanFlyingCard !== undefined || fanPicked.includes(index) || fanPicked.length >= fanNeedCount) return
            setFanFlyingCard(index)
          }}
          onFinishPick={(index) => {
            if (fanFlyingCard !== index) return
            setFanPicked((picked) => [...picked, index])
            setFanFlyingCard(undefined)
          }}
          onContinue={noOp}
        />
      )}
      {stage === 'reveal' && (
        <TarotRevealStage drawn={drawn} flipped={[false, true, false]} onFlip={noOp} onContinue={noOp} />
      )}
      {stage === 'reading' && (
        <TarotReadingStage reading={reading} sharing={false} shared={false} onShare={noOp} onRestart={noOp} onClose={noOp} />
      )}
    </main>
  )
}

export function isTarotDevStage(value: string | null): value is TarotDevStage {
  return value !== null && TAROT_DEV_STAGES.includes(value as TarotDevStage)
}

export function getTarotDevStage(search: string): TarotDevStage {
  return readStage(search)
}
