import { useCallback, useEffect, useState } from 'react'
import type { Conversation, ContributionStat, PetState } from '../domain/types'
import type { PetAction } from '../domain/petRules'
import { socialApi } from '../services/socialApi'
import { PetActionBar } from './PetActionBar'
import { PetStatusCard } from './PetStatusCard'

interface NestTabProps {
  pairRoom?: Conversation
  pet: PetState | null
  friendNames: Record<string, string>
  onAction(action: PetAction): void
  onOpenMemories(): void
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

export function NestTab({ pairRoom, pet, friendNames, onAction, onOpenMemories }: NestTabProps) {
  const [contributions, setContributions] = useState<ContributionStat[]>([])

  const roomId = pairRoom?.roomId

  const refresh = useCallback(async () => {
    if (!roomId) return
    try {
      setContributions(await socialApi.listContributions(roomId))
    } catch { /* 静默降级 */ }
  }, [roomId])

  useEffect(() => {
    setContributions([])
    void refresh()
  }, [refresh])

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

    </section>
  )
}
