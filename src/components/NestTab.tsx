import { useCallback, useEffect, useState } from 'react'
import type { CodewordState, Conversation, ContributionStat, PetState } from '../domain/types'
import type { PetAction } from '../domain/petRules'
import { socialApi } from '../services/socialApi'
import { MAP_SPOT_COUNT } from '../games/map/chinaMap'
import { PetActionBar } from './PetActionBar'
import { PetStatusCard } from './PetStatusCard'

interface NestTabProps {
  pairRoom?: Conversation
  pet: PetState | null
  friendNames: Record<string, string>
  onAction(action: PetAction): void
  onOpenMemories(): void
  onOpenGame(game: 'tarot' | 'gobang' | 'map'): void
}

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了，小多利趴在窝边等你'
  if (hour < 11) return '早上好，小多利伸了个大大的懒腰'
  if (hour < 14) return '午后阳光正好，小多利在打盹'
  if (hour < 18) return '下午啦，小多利想出去撒欢'
  if (hour < 22) return '晚上好，小多利蹭过来讨摸摸'
  return '该休息啦，小多利帮你暖好被窝'
}

export function NestTab({ pairRoom, pet, friendNames, onAction, onOpenMemories, onOpenGame }: NestTabProps) {
  const [contributions, setContributions] = useState<ContributionStat[]>([])
  const [codeword, setCodeword] = useState<CodewordState>()
  const [codewordDraft, setCodewordDraft] = useState('')
  const [codewordBusy, setCodewordBusy] = useState(false)
  const [litCount, setLitCount] = useState(0)

  const roomId = pairRoom?.roomId

  const refresh = useCallback(async () => {
    if (!roomId) return
    try {
      const [stats, word, lights] = await Promise.all([
        socialApi.listContributions(roomId),
        socialApi.getCodeword(roomId),
        socialApi.listMapLights(roomId)
      ])
      setContributions(stats)
      setCodeword(word)
      setLitCount(lights.length)
    } catch { /* 静默降级 */ }
  }, [roomId])

  useEffect(() => {
    setCodeword(undefined)
    setContributions([])
    void refresh()
  }, [refresh])

  async function submitCodeword() {
    if (!roomId || !codewordDraft.trim() || codewordBusy) return
    setCodewordBusy(true)
    try {
      setCodeword(await socialApi.answerCodeword(roomId, codewordDraft.trim()))
      setCodewordDraft('')
    } finally {
      setCodewordBusy(false)
    }
  }

  if (!pairRoom) {
    return (
      <section className="nest-tab">
        <p className="nest-tab__empty">还没有好友，去「消息」页添加新朋友，一起拥有一只小多利吧～</p>
      </section>
    )
  }

  const totals = contributions.reduce<Record<string, number>>((accumulator, stat) => {
    accumulator[stat.userId] = (accumulator[stat.userId] ?? 0) + stat.count
    return accumulator
  }, {})
  const leaderboard = Object.entries(totals).sort((a, b) => b[1] - a[1])

  return (
    <section className="nest-tab">
      <header className="nest-tab__header">
        <h2>小窝</h2>
        <p>{greeting()}</p>
      </header>

      {pet ? (
        <PetStatusCard pet={pet} onOpenMemories={onOpenMemories} />
      ) : (
        <p className="nest-tab__empty">小多利正在赶来…</p>
      )}

      <PetActionBar onAction={onAction} />

      {leaderboard.length > 0 && (
        <section className="contribution-board">
          <h3>双方贡献榜</h3>
          <ul>
            {leaderboard.map(([userId, count], index) => (
              <li key={userId}>
                <span className="contribution-board__rank">{index === 0 ? '🥇' : '🥈'}</span>
                <span className="contribution-board__name">{friendNames[userId] ?? '神秘主人'}</span>
                <strong>{count} 次照顾</strong>
              </li>
            ))}
          </ul>
        </section>
      )}

      {codeword && (
        <section className="codeword-card">
          <h3>每日暗号 <em>{codeword.day}</em></h3>
          <p className="codeword-card__question">{codeword.question}</p>
          {codeword.myAnswer ? (
            <p className="codeword-card__mine">我的答案：{codeword.myAnswer}</p>
          ) : (
            <div className="codeword-card__input">
              <input
                value={codewordDraft}
                onChange={(event) => setCodewordDraft(event.target.value)}
                placeholder="写下你的答案…"
                onKeyDown={(event) => { if (event.key === 'Enter') void submitCodeword() }}
              />
              <button disabled={codewordBusy} onClick={() => void submitCodeword()}>
                {codewordBusy ? '提交中…' : '提交'}
              </button>
            </div>
          )}
          {codeword.partnerAnswer
            ? <p className="codeword-card__partner">TA 的答案：{codeword.partnerAnswer}</p>
            : <p className="codeword-card__waiting">{codeword.myAnswer ? '等 TA 也答完，就能互相看到啦…' : `已有 ${codeword.answeredCount} 人作答`}</p>}
        </section>
      )}

      <section className="game-wall">
        <h3>一起玩</h3>
        <div className="game-wall__grid">
          <button className="game-card game-card--tarot" onClick={() => onOpenGame('tarot')}>
            <span className="game-card__icon">🔮</span>
            <strong>塔罗占卜</strong>
            <span>专业仪式流程，问一问心事</span>
          </button>
          <button className="game-card game-card--gobang" onClick={() => onOpenGame('gobang')}>
            <span className="game-card__icon">⚫</span>
            <strong>五子棋</strong>
            <span>和好友实时对弈</span>
          </button>
          <button className="game-card game-card--map" onClick={() => onOpenGame('map')}>
            <span className="game-card__icon">🐾</span>
            <strong>足迹地图</strong>
            <span>已点亮 {litCount}/{MAP_SPOT_COUNT}，一起去过的地方</span>
          </button>
        </div>
      </section>
    </section>
  )
}
