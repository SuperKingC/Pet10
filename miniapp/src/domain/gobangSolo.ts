export const SOLO_BOARD_SIZE = 15

export type SoloColor = 1 | 2
export type SoloBoard = number[]

export interface SoloMove { x: number; y: number }

export interface SoloGame {
  board: SoloBoard
  turn: 'player' | 'ai'
  status: 'playing' | 'finished'
  winner: 'player' | 'ai' | 'draw' | null
  moves: Array<SoloMove & { color: SoloColor }>
}

export function createEmptyBoard(): SoloBoard {
  return Array.from({ length: SOLO_BOARD_SIZE * SOLO_BOARD_SIZE }, () => 0)
}

const inBounds = (x: number, y: number) => x >= 0 && x < SOLO_BOARD_SIZE && y >= 0 && y < SOLO_BOARD_SIZE

export function checkFive(board: SoloBoard, x: number, y: number, color: SoloColor): boolean {
  const directions: Array<[number, number]> = [[1, 0], [0, 1], [1, 1], [1, -1]]
  for (const [dx, dy] of directions) {
    let count = 1
    for (const sign of [1, -1]) {
      let step = 1
      while (true) {
        const nx = x + dx * step * sign
        const ny = y + dy * step * sign
        if (!inBounds(nx, ny) || board[ny * SOLO_BOARD_SIZE + nx] !== color) break
        count += 1
        step += 1
      }
    }
    if (count >= 5) return true
  }
  return false
}

export function createSoloGame(): SoloGame {
  return { board: createEmptyBoard(), turn: 'player', status: 'playing', winner: null, moves: [] }
}

export function applySoloMove(game: SoloGame, x: number, y: number): SoloGame {
  if (game.status !== 'playing' || game.turn !== 'player') return game
  if (!inBounds(x, y) || game.board[y * SOLO_BOARD_SIZE + x] !== 0) return game
  const board = [...game.board]
  board[y * SOLO_BOARD_SIZE + x] = 1
  const moves = [...game.moves, { x, y, color: 1 as SoloColor }]
  if (checkFive(board, x, y, 1)) {
    return { board, turn: 'player', status: 'finished', winner: 'player', moves }
  }
  if (moves.length === SOLO_BOARD_SIZE * SOLO_BOARD_SIZE) {
    return { board, turn: 'player', status: 'finished', winner: 'draw', moves }
  }
  return { board, turn: 'ai', status: 'playing', winner: null, moves }
}

export function applyAiMove(game: SoloGame): SoloGame {
  if (game.status !== 'playing' || game.turn !== 'ai') return game
  const move = chooseAiMove(game.board, 2)
  const board = [...game.board]
  board[move.y * SOLO_BOARD_SIZE + move.x] = 2
  const moves = [...game.moves, { ...move, color: 2 as SoloColor }]
  if (checkFive(board, move.x, move.y, 2)) {
    return { board, turn: 'player', status: 'finished', winner: 'ai', moves }
  }
  return { board, turn: 'player', status: 'playing', winner: null, moves }
}

function maxLine(board: SoloBoard, x: number, y: number, color: SoloColor): number {
  let best = 0
  const directions: Array<[number, number]> = [[1, 0], [0, 1], [1, 1], [1, -1]]
  for (const [dx, dy] of directions) {
    let count = 1
    for (const sign of [1, -1]) {
      let step = 1
      while (true) {
        const nx = x + dx * step * sign
        const ny = y + dy * step * sign
        if (!inBounds(nx, ny) || board[ny * SOLO_BOARD_SIZE + nx] !== color) break
        count += 1
        step += 1
      }
    }
    best = Math.max(best, count)
  }
  return best
}

function scorePoint(board: SoloBoard, x: number, y: number, color: SoloColor): number {
  const line = maxLine(board, x, y, color)
  if (line >= 5) return 100000
  if (line === 4) return 10000
  if (line === 3) return 1000
  if (line === 2) return 100
  return 0
}

export function chooseAiMove(board: SoloBoard, aiColor: SoloColor = 2): SoloMove {
  const opponent: SoloColor = aiColor === 1 ? 2 : 1
  const hasStone = board.some((cell) => cell !== 0)
  if (!hasStone) return { x: 7, y: 7 }
  const center = Math.floor(SOLO_BOARD_SIZE / 2)
  let best: SoloMove | null = null
  let bestScore = -1
  for (let y = 0; y < SOLO_BOARD_SIZE; y += 1) {
    for (let x = 0; x < SOLO_BOARD_SIZE; x += 1) {
      if (board[y * SOLO_BOARD_SIZE + x] !== 0) continue
      const offense = scorePoint(board, x, y, aiColor)
      const defense = scorePoint(board, x, y, opponent) * 0.9
      const proximity = 7 - Math.hypot(x - center, y - center) / 8
      const score = offense + defense + proximity
      if (score > bestScore) {
        bestScore = score
        best = { x, y }
      }
    }
  }
  return best ?? { x: center, y: center }
}
