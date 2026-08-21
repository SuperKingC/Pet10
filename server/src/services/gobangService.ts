import type { RepositoryBundle } from '../repositories/contracts.js'

export const BOARD_SIZE = 15
const IDLE_TIMEOUT_MS = 5 * 60 * 1000
const INVITE_TTL_MS = 60 * 1000
const WIN_REWARD_INTIMACY = 3

export interface GobangMove {
  x: number
  y: number
  color: 'black' | 'white'
}

export interface GobangGame {
  id: string
  roomId: string
  blackUserId: string
  whiteUserId: string
  board: number[] // 0 空 1 黑 2 白
  turn: 'black' | 'white'
  moves: GobangMove[]
  status: 'playing' | 'finished'
  winnerUserId: string | null
  reason: 'five' | 'resign' | 'timeout' | null
  lastMoveAt: number
}

interface PendingInvite {
  id: string
  fromUserId: string
  toUserId: string
  roomId: string
  createdAt: number
}

export interface GobangDeps {
  repositories: RepositoryBundle
  emit: (roomId: string, event: string, payload: unknown) => void
  emitUser: (userId: string, event: string, payload: unknown) => void
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`
}

function inBounds(x: number, y: number) {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < BOARD_SIZE && y < BOARD_SIZE
}

function checkFive(board: number[], x: number, y: number, color: number): boolean {
  const directions: Array<[number, number]> = [[1, 0], [0, 1], [1, 1], [1, -1]]
  for (const [dx, dy] of directions) {
    let count = 1
    for (const sign of [1, -1]) {
      let step = 1
      while (true) {
        const nx = x + dx * step * sign
        const ny = y + dy * step * sign
        if (!inBounds(nx, ny) || board[ny * BOARD_SIZE + nx] !== color) break
        count += 1
        step += 1
      }
    }
    if (count >= 5) return true
  }
  return false
}

export function createGobangService({ repositories, emit, emitUser }: GobangDeps) {
  const games = new Map<string, GobangGame>()
  const invites = new Map<string, PendingInvite>()
  /** userId -> 正在进行的对局 id */
  const activeByUser = new Map<string, string>()
  const completedByUser = new Map<string, ReturnType<typeof publicState>>()

  function publicState(game: GobangGame) {
    return {
      id: game.id,
      roomId: game.roomId,
      blackUserId: game.blackUserId,
      whiteUserId: game.whiteUserId,
      moves: game.moves,
      turn: game.turn,
      status: game.status,
      winnerUserId: game.winnerUserId,
      reason: game.reason
    }
  }

  async function celebrate(roomId: string, winnerUserId: string | null, reason: string) {
    try {
      const pet = await repositories.pets.findByRoomId(roomId)
      if (!pet) return
      const texts = winnerUserId
        ? [
            '汪！！好精彩的对局！赢的那位记得摸摸输家的头安慰一下～',
            '小多利看得尾巴都摇起来了！这局棋下得真漂亮！',
            '呜哇，决胜那一刻我也看到了！赢家加鸡腿！'
          ]
        : ['对局结束啦～不管输赢，一起下棋的小窝最热闹了！']
      const text = reason === 'timeout'
        ? '有一方好久没落子，小多利判了超时负。下次别让它等太久嘛～'
        : texts[Math.floor(Math.random() * texts.length)]
      const message = await repositories.messages.create({ roomId, senderType: 'pet', kind: 'pet', text })
      emit(roomId, 'message.created', message)
      // 亲密度小奖励
      const next = { ...pet, intimacy: Math.min(100, pet.intimacy + WIN_REWARD_INTIMACY), updatedAt: new Date() }
      const saved = await repositories.pets.update(next)
      emit(roomId, 'pet.updated', { ...saved, roomId })
    } catch { /* 静默 */ }
  }

  async function finishGame(game: GobangGame, winnerUserId: string | null, reason: NonNullable<GobangGame['reason']>) {
    if (game.status === 'finished') return
    game.status = 'finished'
    game.winnerUserId = winnerUserId
    game.reason = reason
    const completed = publicState(game)
    completedByUser.set(game.blackUserId, completed)
    completedByUser.set(game.whiteUserId, completed)
    games.delete(game.id)
    activeByUser.delete(game.blackUserId)
    activeByUser.delete(game.whiteUserId)
    emit(game.roomId, 'game:end', { gameId: game.id, winnerUserId, reason, roomId: game.roomId })
    await celebrate(game.roomId, winnerUserId, reason)
  }

  // 超时判负巡检
  const timer = setInterval(() => {
    const now = Date.now()
    for (const game of games.values()) {
      if (game.status === 'playing' && now - game.lastMoveAt > IDLE_TIMEOUT_MS) {
        const winner = game.turn === 'black' ? game.whiteUserId : game.blackUserId
        void finishGame(game, winner, 'timeout')
      }
    }
    for (const invite of invites.values()) {
      if (now - invite.createdAt > INVITE_TTL_MS) invites.delete(invite.id)
    }
  }, 30 * 1000)
  timer.unref?.()

  return {
    invite(fromUserId: string, toUserId: string, roomId: string) {
      if (fromUserId === toUserId) throw new Error('invalid_invite')
      if (activeByUser.has(fromUserId)) throw new Error('already_in_game')
      completedByUser.delete(fromUserId)
      const invite: PendingInvite = { id: createId('invite'), fromUserId, toUserId, roomId, createdAt: Date.now() }
      invites.set(invite.id, invite)
      emitUser(toUserId, 'game:invite', { inviteId: invite.id, fromUserId, roomId })
      emitUser(toUserId, 'notification.new', {
        id: createId('ntf'), userId: toUserId, type: 'game_invite',
        payload: { text: '有人邀请你下五子棋，快去应战！' }, read: false, createdAt: new Date().toISOString()
      })
      return { inviteId: invite.id }
    },

    pending(userId: string) {
      const now = Date.now()
      return [...invites.values()]
        .filter((invite) => invite.toUserId === userId && now - invite.createdAt <= INVITE_TTL_MS)
        .map(({ id, fromUserId, roomId, createdAt }) => ({ inviteId: id, fromUserId, roomId, createdAt }))
    },

    async accept(toUserId: string, inviteId: string) {
      const invite = invites.get(inviteId)
      if (!invite || invite.toUserId !== toUserId) throw new Error('invite_not_found')
      invites.delete(inviteId)
      if (activeByUser.has(invite.fromUserId) || activeByUser.has(toUserId)) throw new Error('already_in_game')
      const game: GobangGame = {
        id: createId('game'),
        roomId: invite.roomId,
        blackUserId: invite.fromUserId,
        whiteUserId: toUserId,
        board: new Array(BOARD_SIZE * BOARD_SIZE).fill(0),
        turn: 'black',
        moves: [],
        status: 'playing',
        winnerUserId: null,
        reason: null,
        lastMoveAt: Date.now()
      }
      games.set(game.id, game)
      activeByUser.set(game.blackUserId, game.id)
      activeByUser.set(game.whiteUserId, game.id)
      completedByUser.delete(game.blackUserId)
      completedByUser.delete(game.whiteUserId)
      emit(game.roomId, 'game:accepted', { ...publicState(game), inviteId })
      return publicState(game)
    },

    decline(toUserId: string, inviteId: string) {
      const invite = invites.get(inviteId)
      if (!invite || invite.toUserId !== toUserId) return
      invites.delete(inviteId)
      emitUser(invite.fromUserId, 'game:declined', { inviteId, roomId: invite.roomId })
    },

    cancel(userId: string, gameId: string) {
      const game = games.get(gameId)
      if (!game || (game.blackUserId !== userId && game.whiteUserId !== userId)) return
      void finishGame(game, null, 'resign')
    },

    async move(userId: string, gameId: string, x: number, y: number) {
      const game = games.get(gameId)
      if (!game || game.status !== 'playing') throw new Error('game_not_found')
      const isBlack = game.blackUserId === userId
      const isWhite = game.whiteUserId === userId
      if (!isBlack && !isWhite) throw new Error('game_forbidden')
      if ((isBlack && game.turn !== 'black') || (isWhite && game.turn !== 'white')) throw new Error('not_your_turn')
      if (!inBounds(x, y)) throw new Error('invalid_move')
      const index = y * BOARD_SIZE + x
      if (game.board[index] !== 0) throw new Error('invalid_move')

      const color = isBlack ? 1 : 2
      game.board[index] = color
      const move: GobangMove = { x, y, color: isBlack ? 'black' : 'white' }
      game.moves.push(move)
      game.lastMoveAt = Date.now()
      emit(game.roomId, 'game:move', { gameId, ...move, nextTurn: isBlack ? 'white' : 'black' })

      if (checkFive(game.board, x, y, color)) {
        await finishGame(game, userId, 'five')
        return { finished: true, winnerUserId: userId }
      }
      game.turn = isBlack ? 'white' : 'black'
      return { finished: false, winnerUserId: null }
    },

    async resign(userId: string, gameId: string) {
      const game = games.get(gameId)
      if (!game || game.status !== 'playing') return
      if (game.blackUserId !== userId && game.whiteUserId !== userId) return
      const winner = game.blackUserId === userId ? game.whiteUserId : game.blackUserId
      await finishGame(game, winner, 'resign')
    },

    /** 断线重连：返回该用户当前进行中的对局完整状态 */
    sync(userId: string) {
      const gameId = activeByUser.get(userId)
      if (!gameId) return completedByUser.get(userId) ?? null
      const game = games.get(gameId)
      if (!game) return completedByUser.get(userId) ?? null
      return publicState(game)
    }
  }
}

export type GobangService = ReturnType<typeof createGobangService>
