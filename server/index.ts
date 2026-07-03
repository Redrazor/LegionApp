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
import { createBattleCardsRouter } from './routes/battleCards.ts'
import { createRoomManager } from './rooms.ts'
import type { Army, PlayerRole } from '../src/types/index.ts'

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
app.use('/api/battle-cards', createBattleCardsRouter(sqlite))

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

// ── Play multiplayer (server-authoritative, SQLite-persisted rooms) ──────────
// The room manager owns durable state; here we just relay its snapshots. A room
// broadcast goes to everyone in the socket.io room named by the room's UUID, so
// both players converge on the same authoritative state.
const rooms = createRoomManager(sqlite, {
  onPresenceExpire: (roomId) => {
    const snap = rooms.snapshotFor(roomId)
    if (snap) io.to(roomId).emit('room-state', snap)
  },
})

// TTL janitor: sweep rooms untouched for >24h, on boot and hourly.
rooms.sweep()
setInterval(() => rooms.sweep(), 60 * 60 * 1000)

const ackFn = (ack: unknown) => (typeof ack === 'function' ? (ack as (arg: unknown) => void) : () => {})

io.on('connection', (socket) => {
  socket.on('create-room', ({ name }: { name?: string } = {}, ack) => {
    const { role, snapshot } = rooms.create(socket.id, name ?? '')
    socket.join(snapshot.id)
    ackFn(ack)({ ok: true, role, snapshot })
  })

  socket.on('join-room', ({ code, name }: { code: string; name?: string }, ack) => {
    const result = rooms.join(socket.id, code, name ?? '')
    if (!result.ok || !result.snapshot) return ackFn(ack)({ ok: false, error: result.error })
    socket.join(result.snapshot.id)
    io.to(result.snapshot.id).emit('room-state', result.snapshot)
    ackFn(ack)({ ok: true, role: result.role, snapshot: result.snapshot })
  })

  socket.on('rejoin-room', ({ roomId, role }: { roomId: string; role: PlayerRole }, ack) => {
    const snapshot = rooms.rejoin(socket.id, roomId, role)
    if (!snapshot) return ackFn(ack)({ ok: false, error: 'not-found' })
    socket.join(snapshot.id)
    io.to(snapshot.id).emit('room-state', snapshot)
    ackFn(ack)({ ok: true, role, snapshot })
  })

  socket.on('update-army', ({ army }: { army: Army | null }) => {
    const snapshot = rooms.updateArmy(socket.id, army)
    if (snapshot) io.to(snapshot.id).emit('room-state', snapshot)
  })

  socket.on('set-name', ({ name }: { name: string }) => {
    const snapshot = rooms.renamePlayer(socket.id, name)
    if (snapshot) io.to(snapshot.id).emit('room-state', snapshot)
  })

  socket.on('draw-mission', () => {
    const snapshot = rooms.drawMission(socket.id)
    if (snapshot) io.to(snapshot.id).emit('room-state', snapshot)
  })

  socket.on('reset-mission', () => {
    const snapshot = rooms.resetMission(socket.id)
    if (snapshot) io.to(snapshot.id).emit('room-state', snapshot)
  })

  socket.on('end-game', () => {
    const ended = rooms.endGame(socket.id)
    if (ended) io.to(ended.roomId).emit('room-ended')
  })

  socket.on('disconnect', () => {
    // Presence is grace-buffered inside the manager; if it expires, onPresenceExpire
    // broadcasts the offline state. Nothing to emit immediately.
    rooms.disconnect(socket.id)
  })
})

httpServer.listen(PORT, () => {
  console.log(`LegionApp API server running on http://localhost:${PORT}`)
})
