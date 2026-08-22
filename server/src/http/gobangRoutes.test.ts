import express from 'express'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import type { RepositoryBundle } from '../repositories/contracts.js'
import { createGobangService } from '../services/gobangService.js'
import { createGobangRoutes } from './gobangRoutes.js'

function createApp() {
  const repositories = {
    pets: { findByRoomId: vi.fn(async () => null) },
  } as unknown as RepositoryBundle
  const gobang = createGobangService({ repositories, emit: vi.fn(), emitUser: vi.fn() })

  const app = express()
  app.use(express.json())
  app.use((req, _response, next) => {
    ;(req as { userId?: string }).userId = (req.headers.authorization ?? '').replace('Bearer ', '')
    next()
  })
  app.use('/api/games/gobang', createGobangRoutes(gobang))
  return app
}

describe('gobang routes', () => {
  it('supports the invite, accept, move and finish flow used by the miniapp', async () => {
    const app = createApp()

    const idle = await request(app).get('/api/games/gobang/state').set('Authorization', 'Bearer user-a')
    expect(idle.status).toBe(200)
    expect(idle.body).toEqual({ game: null, invitations: [] })

    const invite = await request(app)
      .post('/api/games/gobang/invitations')
      .set('Authorization', 'Bearer user-a')
      .send({ toUserId: 'user-b', roomId: 'room-1' })
    expect(invite.status).toBe(201)

    const pending = await request(app).get('/api/games/gobang/state').set('Authorization', 'Bearer user-b')
    expect(pending.body.invitations).toEqual([expect.objectContaining({ fromUserId: 'user-a', roomId: 'room-1' })])

    const accept = await request(app)
      .post(`/api/games/gobang/invitations/${invite.body.inviteId}/accept`)
      .set('Authorization', 'Bearer user-b')
    expect(accept.status).toBe(200)
    expect(accept.body).toEqual(expect.objectContaining({ blackUserId: 'user-a', whiteUserId: 'user-b', turn: 'black', status: 'playing' }))
    const gameId = accept.body.id as string

    for (let x = 0; x < 4; x += 1) {
      const blackMove = await request(app)
        .post(`/api/games/gobang/games/${gameId}/moves`)
        .set('Authorization', 'Bearer user-a')
        .send({ x, y: 0 })
      expect(blackMove.body).toEqual({ finished: false, winnerUserId: null })
      const whiteMove = await request(app)
        .post(`/api/games/gobang/games/${gameId}/moves`)
        .set('Authorization', 'Bearer user-b')
        .send({ x, y: 1 })
      expect(whiteMove.body).toEqual({ finished: false, winnerUserId: null })
    }
    const winningMove = await request(app)
      .post(`/api/games/gobang/games/${gameId}/moves`)
      .set('Authorization', 'Bearer user-a')
      .send({ x: 4, y: 0 })
    expect(winningMove.body).toEqual({ finished: true, winnerUserId: 'user-a' })

    const finished = await request(app).get('/api/games/gobang/state').set('Authorization', 'Bearer user-b')
    expect(finished.body.game).toEqual(expect.objectContaining({ status: 'finished', winnerUserId: 'user-a', reason: 'five' }))
  })

  it('rejects out-of-turn moves and supports resign', async () => {
    const app = createApp()

    const invite = await request(app)
      .post('/api/games/gobang/invitations')
      .set('Authorization', 'Bearer user-a')
      .send({ toUserId: 'user-b', roomId: 'room-1' })
    const accept = await request(app)
      .post(`/api/games/gobang/invitations/${invite.body.inviteId}/accept`)
      .set('Authorization', 'Bearer user-b')
    const gameId = accept.body.id as string

    const outOfTurn = await request(app)
      .post(`/api/games/gobang/games/${gameId}/moves`)
      .set('Authorization', 'Bearer user-b')
      .send({ x: 0, y: 0 })
    expect(outOfTurn.status).toBeGreaterThanOrEqual(400)

    const resign = await request(app)
      .post(`/api/games/gobang/games/${gameId}/resign`)
      .set('Authorization', 'Bearer user-a')
    expect(resign.status).toBe(200)

    const state = await request(app).get('/api/games/gobang/state').set('Authorization', 'Bearer user-b')
    expect(state.body.game).toEqual(expect.objectContaining({ status: 'finished', winnerUserId: 'user-b', reason: 'resign' }))
  })
})
