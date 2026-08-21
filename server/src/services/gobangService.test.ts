import { describe, expect, it, vi } from 'vitest'
import type { RepositoryBundle } from '../repositories/contracts.js'
import { createGobangService } from './gobangService.js'

function createService() {
  const repositories = {
    pets: { findByRoomId: vi.fn(async () => null) },
  } as unknown as RepositoryBundle
  return createGobangService({ repositories, emit: vi.fn(), emitUser: vi.fn() })
}

describe('gobang polling state', () => {
  it('exposes pending invitations and preserves the finished result for both players', async () => {
    const service = createService()
    const { inviteId } = service.invite('user-a', 'user-b', 'room-a')

    expect(service.pending('user-b')).toEqual([
      expect.objectContaining({ inviteId, fromUserId: 'user-a', roomId: 'room-a' }),
    ])

    const game = await service.accept('user-b', inviteId)
    for (let x = 0; x < 4; x += 1) {
      await service.move('user-a', game.id, x, 0)
      await service.move('user-b', game.id, x, 1)
    }
    await service.move('user-a', game.id, 4, 0)

    expect(service.sync('user-a')).toEqual(expect.objectContaining({
      status: 'finished',
      winnerUserId: 'user-a',
      reason: 'five',
    }))
    expect(service.sync('user-b')).toEqual(expect.objectContaining({
      status: 'finished',
      winnerUserId: 'user-a',
    }))
  })
})
