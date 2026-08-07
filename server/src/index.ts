import 'dotenv/config'
import { createServer } from 'node:http'
import { createApp } from './app.js'
import { config } from './config.js'
import { pool } from './db/pool.js'
import { createPostgresRepositories } from './repositories/postgresRepositories.js'
import { createAiService } from './services/aiService.js'
import { createSocketServer } from './realtime/socketServer.js'

const repositories = createPostgresRepositories(pool)
const ai = createAiService(config.ai)
let emitToRoom: (roomId: string, event: string, payload: unknown) => void = () => undefined
const app = createApp({
  config,
  repositories,
  ai,
  emit: (roomId, event, payload) => emitToRoom(roomId, event, payload)
})
const server = createServer(app)
const sockets = createSocketServer(server, config.appOrigin, config.jwtSecret)
emitToRoom = sockets.emit

server.listen(config.port, () => {
  console.log(`Pet10 API listening on http://localhost:${config.port}`)
})
