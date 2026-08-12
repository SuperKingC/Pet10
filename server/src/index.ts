import 'dotenv/config'
import { createServer } from 'node:http'
import { createApp } from './app.js'
import { config } from './config.js'
import { pool } from './db/pool.js'
import { ensureRuntimeMigrations } from './db/migrations.js'
import { createPostgresRepositories } from './repositories/postgresRepositories.js'
import { createAiService } from './services/aiService.js'
import { createSearchService } from './services/searchService.js'
import { createSocketServer } from './realtime/socketServer.js'
import { createAliOssSigner, createUploadService } from './services/uploadService.js'
import { createGobangService, type GobangService } from './services/gobangService.js'

const repositories = createPostgresRepositories(pool)
const search = createSearchService(config.search)
const ai = createAiService(config.ai, {
  search,
  logSearch: (event) => console.info(JSON.stringify({ event: 'ai.search', ...event }))
})
const uploads = createUploadService({
  enabled: config.oss.enabled,
  publicBaseUrl: config.oss.publicBaseUrl,
  signPut: createAliOssSigner(config.oss)
})
let emitToRoom: (roomId: string, event: string, payload: unknown) => void = () => undefined
let emitToUser: (userId: string, event: string, payload: unknown) => void = () => undefined
let gobang: GobangService | undefined
const app = createApp({
  config,
  repositories,
  ai,
  uploads,
  emit: (roomId, event, payload) => emitToRoom(roomId, event, payload),
  emitUser: (userId, event, payload) => emitToUser(userId, event, payload)
})
const server = createServer(app)
const sockets = createSocketServer(server, config.appOrigin, config.jwtSecret, config.allowedEmails, repositories, (socket, userId) => {
  const read = (payload: unknown) => (typeof payload === 'object' && payload !== null ? payload as Record<string, unknown> : {})
  socket.on('game:invite', (payload) => {
    const data = read(payload)
    try { gobang?.invite(userId, String(data.toUserId ?? ''), String(data.roomId ?? '')) } catch { /* 忽略非法邀请 */ }
  })
  socket.on('game:accept', (payload) => {
    const data = read(payload)
    gobang?.accept(userId, String(data.inviteId ?? '')).catch(() => undefined)
  })
  socket.on('game:decline', (payload) => {
    const data = read(payload)
    gobang?.decline(userId, String(data.inviteId ?? ''))
  })
  socket.on('game:move', (payload) => {
    const data = read(payload)
    gobang?.move(userId, String(data.gameId ?? ''), Number(data.x), Number(data.y)).catch(() => undefined)
  })
  socket.on('game:resign', (payload) => {
    const data = read(payload)
    gobang?.resign(userId, String(data.gameId ?? '')).catch(() => undefined)
  })
  socket.on('game:cancel', (payload) => {
    const data = read(payload)
    gobang?.cancel(userId, String(data.gameId ?? ''))
  })
  socket.on('game:sync', (_payload, ack?: (state: unknown) => void) => {
    const state = gobang?.sync(userId) ?? null
    if (typeof ack === 'function') ack(state)
    socket.emit('game:sync', state)
  })
})
emitToRoom = sockets.emit
emitToUser = sockets.emitUser
gobang = createGobangService({ repositories, emit: sockets.emit, emitUser: sockets.emitUser })

async function start() {
  await ensureRuntimeMigrations(pool)
  server.listen(config.port, () => {
    console.log(`Pet10 API listening on http://localhost:${config.port}`)
  })
}

start().catch((error) => {
  console.error('Pet10 API failed to start', error)
  process.exitCode = 1
  void pool.end()
})
