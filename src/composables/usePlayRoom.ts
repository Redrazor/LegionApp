import { ref } from 'vue'
import { io, Socket } from 'socket.io-client'
import type { Army, PlayerRole, RoomSnapshot } from '../types/index.ts'

// Module-level singleton socket, mirroring ShatterApp's useDiceRoom shape. The Play
// server is authoritative: we emit actions and the server broadcasts one `room-state`
// snapshot that we render. No peer state merging.

let socket: Socket | null = null
const connected = ref(false)

let _onRoomState: ((snap: RoomSnapshot) => void) | null = null
let _onRoomEnded: (() => void) | null = null

function getSocket(): Socket {
  if (!socket) {
    const env = (import.meta as { env?: Record<string, string> }).env ?? {}
    const url = env.VITE_WS_URL || env.VITE_API_BASE || window.location.origin
    socket = io(url, { path: '/socket.io', autoConnect: false })
    socket.on('connect', () => { connected.value = true })
    socket.on('disconnect', () => { connected.value = false })
    socket.on('room-state', (snap: RoomSnapshot) => { _onRoomState?.(snap) })
    socket.on('room-ended', () => { _onRoomEnded?.() })
  }
  return socket
}

function connectAndRun(fn: (s: Socket) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = getSocket()
    if (s.connected) { fn(s); resolve(); return }
    const onConnect = () => { s.off('connect_error', onError); clearTimeout(timer); fn(s); resolve() }
    const onError = (err: Error) => { s.off('connect', onConnect); clearTimeout(timer); reject(new Error(`Cannot reach server: ${err.message}`)) }
    const timer = setTimeout(() => {
      s.off('connect', onConnect); s.off('connect_error', onError)
      reject(new Error('Connection timed out — is the server running?'))
    }, 8_000)
    s.once('connect', onConnect)
    s.once('connect_error', onError)
    s.connect()
  })
}

type Ack = { ok: boolean; role?: PlayerRole; snapshot?: RoomSnapshot; error?: string }

export function usePlayRoom() {
  function createRoom(name: string): Promise<Ack> {
    return new Promise((resolve, reject) => {
      connectAndRun((s) => s.emit('create-room', { name }, resolve)).catch(reject)
    })
  }

  function joinRoom(code: string, name: string): Promise<Ack> {
    return new Promise((resolve, reject) => {
      connectAndRun((s) => s.emit('join-room', { code: code.toUpperCase(), name }, resolve)).catch(reject)
    })
  }

  /** Resume a persisted room after a reload/reconnect. */
  function rejoinRoom(roomId: string, role: PlayerRole): Promise<Ack> {
    return new Promise((resolve, reject) => {
      connectAndRun((s) => s.emit('rejoin-room', { roomId, role }, resolve)).catch(reject)
    })
  }

  function sendArmy(army: Army | null): void {
    socket?.emit('update-army', { army })
  }

  function setName(name: string): void {
    socket?.emit('set-name', { name })
  }

  function endGame(): void {
    socket?.emit('end-game')
  }

  function disconnect(): void {
    socket?.disconnect()
    socket = null
    connected.value = false
  }

  function onRoomState(cb: (snap: RoomSnapshot) => void): void { _onRoomState = cb }
  function onRoomEnded(cb: () => void): void { _onRoomEnded = cb }

  return { connected, createRoom, joinRoom, rejoinRoom, sendArmy, setName, endGame, disconnect, onRoomState, onRoomEnded }
}
