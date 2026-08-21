import { Button, Text, View } from '@tarojs/components'
import { useEffect, useMemo, useState } from 'react'
import { gobangApi, type GobangGameState, type GobangInvitation } from '../../services/gobangApi'
import './MiniappGobangPanel.scss'

const boardCells = Array.from({ length: 225 }, (_, index) => ({ x: index % 15, y: Math.floor(index / 15) }))

export function MiniappGobangPanel({ roomId, myUserId, friendId, friendName, onClose }: {
  roomId: string
  myUserId: string
  friendId: string
  friendName: string
  onClose(): void
}) {
  const [game, setGame] = useState<GobangGameState | null>(null)
  const [invitations, setInvitations] = useState<GobangInvitation[]>([])
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  const refresh = async () => {
    try {
      const state = await gobangApi.getState()
      setGame(state.game)
      setInvitations(state.invitations.filter((invitation) => invitation.roomId === roomId))
    } catch {
      setNotice('棋局同步失败，正在重试')
    }
  }

  useEffect(() => {
    void refresh()
    const timer = setInterval(() => void refresh(), 2000)
    return () => clearInterval(timer)
  }, [roomId])

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

  return (
    <View className="miniapp-gobang">
      <View className="miniapp-gobang__header">
        <Button onClick={onClose}>‹</Button>
        <View><Text>五子棋</Text><Text>和 {friendName} 实时对弈</Text></View>
      </View>
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
    </View>
  )
}
