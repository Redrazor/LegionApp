import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { sqlite } from './db/index.ts'
import { runSeed } from './db/seed.ts'
import { createUnitsRouter } from './routes/units.ts'
import { createUpgradesRouter } from './routes/upgrades.ts'
import { createCommandsRouter } from './routes/commands.ts'
import { createProductsRouter } from './routes/products.ts'
import { createBattleForcesRouter } from './routes/battleForces.ts'
import { createRoom, joinRoom, getRoomBySocket, removePlayer } from './rooms.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT ?? 3001

runSeed(sqlite)

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, { cors: { origin: '*' } })

app.use(cors())
app.use(express.json({ limit: '5mb' }))

// Serve self-hosted card images.
app.use('/images', express.static(join(__dirname, '..', 'public', 'images')))

// API routes
app.use('/api/units', createUnitsRouter(sqlite))
app.use('/api/upgrades', createUpgradesRouter(sqlite))
app.use('/api/commands', createCommandsRouter(sqlite))
app.use('/api/products', createProductsRouter(sqlite))
app.use('/api/battle-forces', createBattleForcesRouter(sqlite))

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

// ── Socket.io scaffold (Play multiplayer — wiring only for now) ──────────────
io.on('connection', (socket) => {
  socket.on('create-room', (_payload, ack) => {
    const code = createRoom(socket.id)
    socket.join(code)
    if (typeof ack === 'function') ack({ code })
  })

  socket.on('join-room', ({ code }: { code: string }, ack) => {
    const result = joinRoom(code, socket.id)
    if (result === 'guest') {
      socket.join(code.toUpperCase())
      socket.to(code.toUpperCase()).emit('player-joined')
      if (typeof ack === 'function') ack({ ok: true })
    } else if (typeof ack === 'function') {
      ack({ ok: false, error: result })
    }
  })

  socket.on('disconnect', () => {
    const room = removePlayer(socket.id)
    if (room) socket.to(room.code).emit('player-left')
  })
})

httpServer.listen(PORT, () => {
  console.log(`LegionApp API server running on http://localhost:${PORT}`)
})
