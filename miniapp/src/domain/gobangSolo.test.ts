import { describe, expect, it } from 'vitest'
import { applyAiMove, applySoloMove, checkFive, chooseAiMove, createEmptyBoard, createSoloGame, SOLO_BOARD_SIZE, type SoloGame } from './gobangSolo'

function lineBoard(color: 1 | 2, count: number, y: number, startX: number) {
  const board = createEmptyBoard()
  for (let i = 0; i < count; i += 1) board[y * SOLO_BOARD_SIZE + startX + i] = color
  return board
}

describe('checkFive', () => {
  it('detects five in a row horizontally, vertically and diagonally', () => {
    expect(checkFive(lineBoard(1, 5, 7, 3), 7, 7, 1)).toBe(true)
    const vertical = createEmptyBoard()
    for (let y = 2; y < 7; y += 1) vertical[y * SOLO_BOARD_SIZE + 4] = 2
    expect(checkFive(vertical, 4, 6, 2)).toBe(true)
    const diagonal = createEmptyBoard()
    for (let i = 0; i < 5; i += 1) diagonal[(3 + i) * SOLO_BOARD_SIZE + 3 + i] = 1
    expect(checkFive(diagonal, 7, 7, 1)).toBe(true)
  })

  it('does not report four stones as a win', () => {
    expect(checkFive(lineBoard(1, 4, 7, 3), 6, 7, 1)).toBe(false)
  })
})

describe('chooseAiMove', () => {
  it('plays the center on an empty board', () => {
    expect(chooseAiMove(createEmptyBoard(), 2)).toEqual({ x: 7, y: 7 })
  })

  it('blocks an opponent open four even if it could make its own three', () => {
    const board = lineBoard(1, 4, 7, 5)
    board[3 * SOLO_BOARD_SIZE + 7] = 2
    board[4 * SOLO_BOARD_SIZE + 7] = 2
    const move = chooseAiMove(board, 2)
    expect([{ x: 4, y: 7 }, { x: 9, y: 7 }]).toContainEqual(move)
  })

  it('prefers completing its own five over blocking opponent four', () => {
    const board = lineBoard(1, 4, 7, 5)
    for (let i = 0; i < 4; i += 1) board[10 * SOLO_BOARD_SIZE + 3 + i] = 2
    const move = chooseAiMove(board, 2)
    expect([{ x: 2, y: 10 }, { x: 7, y: 10 }]).toContainEqual(move)
  })
})

describe('applySoloMove and applyAiMove', () => {
  it('alternates player and AI turns', () => {
    let game = createSoloGame()
    expect(game.turn).toBe('player')
    game = applySoloMove(game, 7, 7)
    expect(game.board[7 * SOLO_BOARD_SIZE + 7]).toBe(1)
    expect(game.turn).toBe('ai')
    expect(game.status).toBe('playing')
    game = applyAiMove(game)
    expect(game.turn).toBe('player')
    expect(game.moves.length).toBe(2)
    expect(game.moves[1].color).toBe(2)
  })

  it('ignores moves on occupied cells and moves when finished', () => {
    let game = applySoloMove(createSoloGame(), 7, 7)
    const unchanged = applySoloMove(game, 7, 7)
    expect(unchanged).toBe(game)
    game = applyAiMove(game)
    expect(applySoloMove(game, 0, 0).moves.length).toBe(game.moves.length + 1)
  })

  it('detects the player win on the winning move', () => {
    const board = lineBoard(1, 4, 0, 0)
    board[SOLO_BOARD_SIZE] = 2
    board[SOLO_BOARD_SIZE + 1] = 2
    const prepared: SoloGame = { board, turn: 'player', status: 'playing', winner: null, moves: [] }
    const result = applySoloMove(prepared, 4, 0)
    expect(result.status).toBe('finished')
    expect(result.winner).toBe('player')
    expect(result.turn).toBe('player')
  })

  it('detects the AI win after the AI move', () => {
    const board = lineBoard(2, 4, 3, 0)
    board[0] = 1
    board[SOLO_BOARD_SIZE + 5] = 1
    const prepared: SoloGame = { board, turn: 'ai', status: 'playing', winner: null, moves: [] }
    const result = applyAiMove(prepared)
    expect(result.status).toBe('finished')
    expect(result.winner).toBe('ai')
  })
})
