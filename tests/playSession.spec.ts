import { describe, it, expect } from 'vitest'
import { encodeArmy, toCompact } from '../src/utils/army.ts'
import {
  createSession,
  newSessionId,
  importFromSaved,
  importFromCode,
  extractShareToken,
} from '../src/utils/playSession.ts'
import type { Army } from '../src/types/index.ts'

const sampleArmy: Army = {
  name: 'Test List',
  faction: 'empire',
  battleForce: null,
  gameSize: 1000,
  units: [{ uid: '1', unitId: 'stormtroopers', upgrades: [{ slot: 'gear#0', upgradeId: 'grenades' }] }],
  commandHand: [],
  battleDeck: [],
  doctrines: [],
}

describe('newSessionId', () => {
  it('returns a non-empty unique-ish string', () => {
    const a = newSessionId()
    const b = newSessionId()
    expect(a).toBeTruthy()
    expect(typeof a).toBe('string')
    expect(a).not.toBe(b)
  })
})

describe('createSession', () => {
  it('builds an empty two-player session with injected id/time', () => {
    const s = createSession('Alice', 'Bob', 'sess-1', 42)
    expect(s).toEqual({
      id: 'sess-1',
      createdAt: 42,
      self: { name: 'Alice', army: null },
      opponent: { name: 'Bob', army: null },
    })
  })

  it('defaults the player names', () => {
    const s = createSession(undefined, undefined, 'x', 0)
    expect(s.self.name).toBe('You')
    expect(s.opponent.name).toBe('Opponent')
  })
})

describe('importFromSaved', () => {
  it('rehydrates a compact army into a full Army with fresh uids', () => {
    const compact = toCompact(sampleArmy)
    const army = importFromSaved(compact)
    expect(army.name).toBe('Test List')
    expect(army.faction).toBe('empire')
    expect(army.units).toHaveLength(1)
    expect(army.units[0].unitId).toBe('stormtroopers')
    expect(army.units[0].upgrades[0].upgradeId).toBe('grenades')
  })
})

describe('extractShareToken', () => {
  it('returns a raw code unchanged', () => {
    expect(extractShareToken('  abc123  ')).toBe('abc123')
  })

  it('pulls the a= token out of a full Build share URL', () => {
    expect(extractShareToken('https://www.legion-app.com/build?a=CODE123')).toBe('CODE123')
  })

  it('stops the token at a following param or hash', () => {
    expect(extractShareToken('https://x/build?a=CODE123&b=2')).toBe('CODE123')
    expect(extractShareToken('https://x/build?a=CODE123#frag')).toBe('CODE123')
  })

  it('returns empty for blank input', () => {
    expect(extractShareToken('   ')).toBe('')
  })
})

describe('importFromCode', () => {
  it('decodes a raw share code round-tripped from encodeArmy', () => {
    const code = encodeArmy(sampleArmy)
    const army = importFromCode(code)
    expect(army).not.toBeNull()
    expect(army!.faction).toBe('empire')
    expect(army!.units[0].unitId).toBe('stormtroopers')
  })

  it('decodes a code embedded in a full share URL', () => {
    const url = `https://www.legion-app.com/build?a=${encodeArmy(sampleArmy)}`
    const army = importFromCode(url)
    expect(army).not.toBeNull()
    expect(army!.name).toBe('Test List')
  })

  it('returns null for garbage', () => {
    expect(importFromCode('!!!nonsense!!!')).toBeNull()
    expect(importFromCode('')).toBeNull()
  })
})
