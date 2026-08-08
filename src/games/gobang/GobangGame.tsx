import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeConnection } from '../../services/realtimeClient'

const BOARD_SIZE = 15

interface GobangGameState {
  id: string
  roomId: string
  blackUserId: string
  whiteUserId: string
  moves: Array<{ x: number; y: number; color: 'black' | 'white' }>
  turn: 'black' | 'white'
  status: 'playing' | 'finished'
  winnerUserId: string | null
  reason: 'five' | 'resign' | 'timeout' | null
}

interface GobangGameProps {
  roomId: string
  myUserId: string
  friendName: string
  friendId?: string
  getRealtime(): RealtimeConnection | undefined
  onClose(): void
}

type Phase = 'idle' | 'inviting' | 'invited' | 'playing' | 'finished'

export function GobangGame({ roomId, myUserId, friendName, friendId, getRealtime, onClose }: GobangGameProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [game, setGame] = useState<GobangGameState>()
  const [notice, setNotice] = useState('')
  const [incomingInvite, setIncomingInvite] = useState<{ inviteId: string }>()
  const boardRef = useRef<Map<string, 'black' | 'white'>>(new Map())
  const [, forceRender] = useState(0)
  const rerender = useCallback(() => forceRender((value) => value + 1), [])

  const myColor: 'black' | 'white' | undefined = game
    ? game.blackUserId === myUserId ? 'black' : game.whiteUserId === myUserId ? 'white' : undefined
    : undefined

  const applyState = useCallback((state: GobangGameState) => {
    const map = new Map<string, 'black' | 'white'>()
    for (const move of state.moves) map.set(`${move.x},${move.y}`, move.color)
    boardRef.current = map
    setGame(state)
    setPhase(state.status === 'finished' ? 'finished' : 'playing')
    rerender()
  }, [rerender])

  useEffect(() => {
    const socket = getRealtime()?.socket
    if (!socket) return
    const onAccepted = (payload: GobangGameState & { inviteId?: string }) => {
      if (payload.roomId !== roomId) return
      setNotice('')
      applyState(payload)
    }
    const onDeclined = () => {
      setPhase('idle')
      setNotice('对方婉拒了这局棋，下次再约～')
    }
    const onInvite = (payload: { inviteId: string; fromUserId: string; roomId: string }) => {
      if (payload.roomId !== roomId) return
      setIncomingInvite({ inviteId: payload.inviteId })
    }
    const onMove = (payload: { gameId: string; x: number; y: number; color: 'black' | 'white'; nextTurn: 'black' | 'white' }) => {
      setGame((current) => {
        if (!current || current.id !== payload.gameId) return current
        boardRef.current.set(`${payload.x},${payload.y}`, payload.color)
        const next = { ...current, moves: [...current.moves, { x: payload.x, y: payload.y, color: payload.color }], turn: payload.nextTurn }
        return next
      })
      rerender()
    }
    const onEnd = (payload: { gameId: string; winnerUserId: string | null; reason: string }) => {
      setGame((current) => {
        if (!current || current.id !== payload.gameId) return current
        return { ...current, status: 'finished', winnerUserId: payload.winnerUserId, reason: payload.reason as GobangGameState['reason'] }
      })
      setPhase('finished')
    }
    const onSync = (payload: GobangGameState | null) => {
      if (payload && payload.roomId === roomId && payload.status === 'playing') applyState(payload)
    }
    socket.on('game:accepted', onAccepted)
    socket.on('game:declined', onDeclined)
    socket.on('game:invite', onInvite)
    socket.on('game:move', onMove)
    socket.on('game:end', onEnd)
    socket.on('game:sync', onSync)
    // 断线重连恢复对局
    socket.emit('game:sync', {})
    return () => {
      socket.off('game:accepted', onAccepted)
      socket.off('game:declined', onDeclined)
      socket.off('game:invite', onInvite)
      socket.off('game:move', onMove)
      socket.off('game:end', onEnd)
      socket.off('game:sync', onSync)
    }
  }, [roomId, getRealtime, applyState, rerender])

  const connection = getRealtime()

  function invite() {
    if (!connection || !friendId) return
    setPhase('inviting')
    setNotice(`已向 ${friendName} 发出对弈邀请，等 TA 接受…`)
    connection.emitGame('game:invite', { toUserId: friendId, roomId })
  }

  function acceptIncoming() {
    if (!connection || !incomingInvite) return
    connection.emitGame('game:accept', { inviteId: incomingInvite.inviteId })
    setIncomingInvite(undefined)
  }

  function declineIncoming() {
    if (!connection || !incomingInvite) return
    connection.emitGame('game:decline', { inviteId: incomingInvite.inviteId })
    setIncomingInvite(undefined)
  }

  function placeStone(x: number, y: number) {
    if (!connection || !game || game.status !== 'playing' || !myColor) return
    if (game.turn !== myColor) return
    if (boardRef.current.has(`${x},${y}`)) return
    connection.emitGame('game:move', { gameId: game.id, x, y })
  }

  function resign() {
    if (!connection || !game) return
    connection.emitGame('game:resign', { gameId: game.id })
  }

  function reset() {
    setGame(undefined)
    setPhase('idle')
    setNotice('')
    boardRef.current = new Map()
  }

  const lastMove = game?.moves[game.moves.length - 1]
  const isMyTurn = game && myColor && game.status === 'playing' && game.turn === myColor

  return (
    <div className="gobang-game">
      <header className="gobang-game__header">
        <button onClick={onClose} aria-label="退出五子棋">×</button>
        <h3>⚫ 五子棋 · 好友联机</h3>
        <span />
      </header>

      {incomingInvite && phase !== 'playing' && (
        <div className="gobang-invite-toast">
          <p>{friendName} 邀请你下一局五子棋！</p>
          <button onClick={acceptIncoming}>接受</button>
          <button onClick={declineIncoming}>婉拒</button>
        </div>
      )}

      {(phase === 'idle' || phase === 'inviting') && (
        <section className="gobang-idle">
          <p>和 <strong>{friendName}</strong> 来一局五子棋，赢家和小多利都会收获亲密度～</p>
          {!connection && <p className="gobang-idle__offline">离线演示模式无法联机，请在真实环境体验。</p>}
          {connection && !friendId && <p className="gobang-idle__offline">还没有好友，先去添加一位吧。</p>}
          <button className="gobang-idle__start" disabled={!connection || !friendId || phase === 'inviting'} onClick={invite}>
            {phase === 'inviting' ? '等待对方接受…' : '邀请对弈'}
          </button>
          {notice && <p className="gobang-idle__notice">{notice}</p>}
        </section>
      )}

      {game && (phase === 'playing' || phase === 'finished') && (
        <section className="gobang-board-wrap">
          <p className="gobang-status">
            {game.status === 'finished'
              ? game.winnerUserId === myUserId ? '🎉 你赢啦！' : game.winnerUserId ? `${friendName} 获胜` : '对局结束'
              : isMyTurn ? `轮到你落子（${myColor === 'black' ? '黑棋' : '白棋'}）` : '等待对方落子…'}
            {game.status === 'finished' && game.reason === 'timeout' && '（超时判负）'}
            {game.status === 'finished' && game.reason === 'resign' && '（认输）'}
          </p>
          <div className="gobang-board">
            {Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, index) => {
              const x = index % BOARD_SIZE
              const y = Math.floor(index / BOARD_SIZE)
              const stone = boardRef.current.get(`${x},${y}`)
              const isLast = lastMove && lastMove.x === x && lastMove.y === y
              return (
                <button
                  key={index}
                  className={`gobang-cell ${stone ? `gobang-cell--${stone}` : ''} ${isLast ? 'gobang-cell--last' : ''}`}
                  onClick={() => placeStone(x, y)}
                  aria-label={`第${x + 1}列第${y + 1}行`}
                />
              )
            })}
          </div>
          <div className="gobang-actions">
            {game.status === 'playing' && <button onClick={resign}>认输</button>}
            {game.status === 'finished' && <button onClick={() => { reset(); invite() }}>再来一局</button>}
            <button onClick={reset}>返回</button>
          </div>
        </section>
      )}
    </div>
  )
}
