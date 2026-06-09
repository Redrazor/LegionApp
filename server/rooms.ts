// Minimal in-memory room registry — scaffolding for the future Play multiplayer
// feature. No game logic yet; just enough to prove the socket.io wiring works.

export interface Room {
  code: string
  host: string
  guest: string | null
  createdAt: number
}

const rooms = new Map<string, Room>()

function genCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return rooms.has(code) ? genCode() : code
}

export function createRoom(hostSocketId: string): string {
  const code = genCode()
  rooms.set(code, { code, host: hostSocketId, guest: null, createdAt: Date.now() })
  return code
}

export function joinRoom(code: string, socketId: string): 'guest' | 'not-found' | 'full' {
  const room = rooms.get(code.toUpperCase())
  if (!room) return 'not-found'
  if (room.guest) return 'full'
  room.guest = socketId
  return 'guest'
}

export function getRoomBySocket(socketId: string): Room | undefined {
  for (const room of rooms.values()) {
    if (room.host === socketId || room.guest === socketId) return room
  }
  return undefined
}

export function removePlayer(socketId: string): Room | undefined {
  const room = getRoomBySocket(socketId)
  if (!room) return undefined
  if (room.host === socketId) rooms.delete(room.code)
  else if (room.guest === socketId) room.guest = null
  return room
}
