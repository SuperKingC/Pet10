import { Button, Text, View } from '@tarojs/components'
import { useEffect, useMemo, useState } from 'react'
import { gobangApi, type GobangGameState, type GobangInvitation } from '../../services/gobangApi'
import { applyAiMove, applySoloMove, createSoloGame, SOLO_BOARD_SIZE, type SoloGame } from '../../domain/gobangSolo'
import { startSingleFlightPolling } from '../../services/singleFlightPolling'
import './MiniappGobangPanel.scss'

const boardCells = Array.from({ length: 225 }, (_, index) => ({ x: index % 15, y: Math.floor(index / 15) }))

type GobangMode = 'select' | 'solo' | 'friend'

export function MiniappGobangPanel({ roomId, myUserId, friendId, friendName, onClose }: {
  roomId: string
  myUserId: string
  friendId: string
  friendName: string
  onClose(): void
}) {
  const [mode, setMode] = useState<GobangMode>('select')
  const [soloGame, setSoloGame] = useState<SoloGame | null>(null)
  const [game, setGame] = useState<GobangGameState | null>(null)
  const [invitations, setInvitations] = useState<GobangInvitation[]>([])
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  const refresh = async (isCurrent: () => boolean = () => true) => {
    try {
      const state = await gobangApi.getState()
      if (!isCurrent()) return
      setGame(state.game)
      setInvitations(state.invitations.filter((invitation) => invitation.roomId === roomId))
    } catch {
      if (!isCurrent()) return
      setNotice('棋局同步失败，正在重试')
    }
  }

  useEffect(() => {
    if (mode !== 'friend') return
    return startSingleFlightPolling(refresh, 2000)
  }, [roomId, mode])

  const stones = useMemo(() => new Map(game?.moves.map((move) => [`${move.x},${move.y}`, move.color]) ?? []), [game])
  const myColor = game?.blackUserId === myUserId ? 'black' : game?.whiteUserId === myUserId ? 'white' : null
  const myTurn = Boolean(game && myColor === game.turn)

  const invite = async () => {
    if (busy) return
    setBusy(true)
    try {
      await gobangApi.invite(friendId, roomId)
      setNotice(`已邀请 ${friendName}，等待对方接受`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '邀请失败')
    } finally {
      setBusy(false)
    }
  }

  const accept = async (inviteId: string) => {
    setBusy(true)
    try {
      setGame(await gobangApi.accept(inviteId))
      setInvitations([])
      setNotice('')
    } finally {
      setBusy(false)
    }
  }

  const move = async (x: number, y: number) => {
    if (!game || !myTurn || stones.has(`${x},${y}`) || busy) return
    setBusy(true)
    try {
      await gobangApi.move(game.id, x, y)
      await refresh()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '落子失败')
    } finally {
      setBusy(false)
    }
  }

  const playSoloStone = (x: number, y: number) => {
    if (!soloGame || soloGame.status !== 'playing' || soloGame.turn !== 'player') return
    const afterPlayer = applySoloMove(soloGame, x, y)
    if (afterPlayer === soloGame) return
    setSoloGame(afterPlayer.status === 'playing' ? applyAiMove(afterPlayer) : afterPlayer)
  }

  const subtitle = mode === 'solo'
    ? '单人练习 · 和小多利机器人下'
    : mode === 'friend' ? `和 ${friendName} 实时对弈` : '选一种玩法'

  return (
    <View className="miniapp-gobang">
      <View className="miniapp-gobang__header">
        <Button onClick={mode === 'select' ? onClose : () => setMode('select')}>‹</Button>
        <View><Text>五子棋</Text><Text>{subtitle}</Text></View>
      </View>

      {mode === 'select' && (
        <View className="miniapp-gobang__modes">
          <Button className="miniapp-gobang__mode" onClick={() => { setSoloGame(createSoloGame()); setMode('solo') }}>
            <Text className="miniapp-gobang__mode-title">单人练习</Text>
            <Text className="miniapp-gobang__mode-caption">和小多利机器人下一盘</Text>
          </Button>
          <Button
            className="miniapp-gobang__mode"
            disabled={!roomId || !friendId}
            onClick={() => { setNotice(''); setMode('friend') }}
          >
            <Text className="miniapp-gobang__mode-title">好友对战</Text>
            <Text className="miniapp-gobang__mode-caption">{roomId && friendId ? '邀请好友实时对弈' : '绑定好友后可邀请对战'}</Text>
          </Button>
        </View>
      )}

      {mode === 'solo' && soloGame && (
        <>
          <Text className="miniapp-gobang__status">
            {soloGame.status === 'finished'
              ? soloGame.winner === 'player' ? '你赢啦！' : soloGame.winner === 'ai' ? '小多利机器人获胜' : '平局'
              : '轮到你落子（黑棋）'}
          </Text>
          <View className="miniapp-gobang__board">
            {boardCells.map(({ x, y }) => {
              const stone = soloGame.board[y * SOLO_BOARD_SIZE + x]
              return <View key={`${x}-${y}`} className="miniapp-gobang__cell" onClick={() => playSoloStone(x, y)}>
                {stone !== 0 && <View className={`miniapp-gobang__stone miniapp-gobang__stone--${stone === 1 ? 'black' : 'white'}`} />}
              </View>
            })}
          </View>
          {soloGame.status === 'finished' && <Button className="miniapp-gobang__resign" onClick={() => setSoloGame(createSoloGame())}>再来一局</Button>}
        </>
      )}

      {mode === 'friend' && (
        <>
          {invitations.map((invitation) => (
            <View className="miniapp-gobang__invite" key={invitation.inviteId}>
              <Text>{friendName} 邀请你下一局五子棋</Text>
              <View>
                <Button onClick={() => void gobangApi.decline(invitation.inviteId).then(refresh)}>暂不加入</Button>
                <Button loading={busy} onClick={() => void accept(invitation.inviteId)}>接受</Button>
              </View>
            </View>
          ))}
          {!game ? (
            <View className="miniapp-gobang__idle">
              <Text>双方进入小程序后即可通过轮询同步棋局。</Text>
              <Button loading={busy} onClick={() => void invite()}>邀请对弈</Button>
              {notice && <Text>{notice}</Text>}
            </View>
          ) : (
            <>
              <Text className="miniapp-gobang__status">
                {game.status === 'finished'
                  ? game.winnerUserId === myUserId ? '你赢啦！' : game.winnerUserId ? `${friendName} 获胜` : '棋局结束'
                  : myTurn ? `轮到你落子（${myColor === 'black' ? '黑棋' : '白棋'}）` : `等待 ${friendName} 落子`}
              </Text>
              <View className="miniapp-gobang__board">
                {boardCells.map(({ x, y }) => {
                  const stone = stones.get(`${x},${y}`)
                  return <View key={`${x}-${y}`} className="miniapp-gobang__cell" onClick={() => void move(x, y)}>
                    {stone && <View className={`miniapp-gobang__stone miniapp-gobang__stone--${stone}`} />}
                  </View>
                })}
              </View>
              {game.status === 'playing' && <Button className="miniapp-gobang__resign" onClick={() => void gobangApi.resign(game.id).then(refresh)}>认输并结束</Button>}
              {game.status === 'finished' && <Button className="miniapp-gobang__resign" onClick={() => { setGame(null); void invite() }}>再来一局</Button>}
              {notice && <Text className="miniapp-gobang__notice">{notice}</Text>}
            </>
          )}
        </>
      )}
    </View>
  )
}
