import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import express from 'express'
import Database from 'better-sqlite3'
import request from 'supertest'
import { createTables, seedUnits, seedUpgrades, seedCommands, seedProducts, seedBattleForces, seedBattleCards } from '../server/db/seed.ts'
import { createUnitsRouter } from '../server/routes/units.ts'
import { createUpgradesRouter } from '../server/routes/upgrades.ts'
import { createCommandsRouter } from '../server/routes/commands.ts'
import { createProductsRouter } from '../server/routes/products.ts'
import { createBattleForcesRouter } from '../server/routes/battleForces.ts'
import { createBattleCardsRouter } from '../server/routes/battleCards.ts'
import type { Unit, Upgrade, CommandCard, Product, BattleForce, BattleCard } from '../src/types/index.ts'

function makeUnit(over: Partial<Unit>): Unit {
  return {
    id: 'x', slug: 'x', name: 'X', title: '', faction: 'empire', rank: 'corps',
    unitType: 'trooper', affiliation: null, affiliations: [], cost: 50, defense: 'white', surgeAttack: 'hit', surgeDefense: false,
    speed: 2, wounds: 5, courage: 1, isUnique: false, keywords: ['Precise 1'],
    upgradeBar: ['gear'],
    weapons: [{ name: 'Blaster', range: [1, 3], dice: { red: 0, black: 0, white: 1 }, keywords: [] }],
    cardImage: null, portraitImage: null, hasFullData: true, history: [],
    ...over,
  }
}

let app: express.Express
let sqlite: InstanceType<typeof Database>

beforeAll(() => {
  sqlite = new Database(':memory:')
  createTables(sqlite)
  seedUnits(sqlite, [
    makeUnit({ id: 'vader', slug: 'darth-vader', name: 'Darth Vader', faction: 'empire', rank: 'commander', cost: 190, isUnique: true }),
    makeUnit({ id: 'storm', slug: 'stormtroopers', name: 'Stormtroopers', faction: 'empire', rank: 'corps', cost: 44 }),
    makeUnit({ id: 'luke', slug: 'luke-skywalker', name: 'Luke Skywalker', faction: 'rebels', rank: 'commander', cost: 160, isUnique: true }),
  ])
  seedUpgrades(sqlite, [
    { id: 'u1', slug: 'hope', name: 'Hope', slot: 'force', cost: 5, isUnique: false, faction: 'rebels', keywords: [], cardImage: null } as Upgrade,
    { id: 'u2', slug: 'recon-intel', name: 'Recon Intel', slot: 'gear', cost: 2, isUnique: false, faction: null, keywords: [], cardImage: null } as Upgrade,
  ])
  seedCommands(sqlite, [
    { id: 'c1', slug: 'ambush', name: 'Ambush', pips: 1, commander: null, faction: null, cardImage: null } as CommandCard,
  ])
  seedProducts(sqlite, [
    { code: 'exp-vader', name: 'Darth Vader Commander Expansion', faction: 'empire', type: 'unit-expansion', unitSlugs: ['darth-vader'] } as Product,
  ])
  seedBattleForces(sqlite, [
    {
      linkId: 'mc', name: 'Mandalorian Clans', faction: 'mandalorians', forceAffinity: null,
      rankUnits: { commander: ['x'], operative: [], corps: ['storm'], special: [], support: [], heavy: [] },
      allowedUpgrades: ['u1'], disallowedUpgrades: [],
      rules: { countMercs: true }, rulesText: ['Mercenaries count as native.'],
      modes: {
        standard: { commander: [1, 2], operative: [0, 2], corps: [2, 6], special: [0, 3], support: [0, 3], heavy: [0, 2], commOp: null },
        '500': { commander: [1, 1], operative: [0, 1], corps: [2, 4], special: [0, 2], support: [0, 2], heavy: [0, 1], commOp: 3 },
      },
    } as BattleForce,
    {
      linkId: 'bf', name: 'Blizzard Force', faction: 'empire', forceAffinity: null,
      rankUnits: { commander: [], operative: [], corps: ['storm'], special: [], support: [], heavy: [] },
      allowedUpgrades: [], disallowedUpgrades: [],
      rules: {}, rulesText: [],
      modes: {
        standard: { commander: [1, 2], operative: [0, 1], corps: [3, 6], special: [0, 3], support: [0, 2], heavy: [0, 2], commOp: null },
        '500': { commander: [1, 1], operative: [0, 1], corps: [2, 4], special: [0, 2], support: [0, 1], heavy: [0, 1], commOp: null },
      },
    } as BattleForce,
  ])

  seedBattleCards(sqlite, [
    { id: 'p1', slug: 'breakthrough', name: 'Breakthrough', subtype: 'objective', keywords: [], faction: null, isRecon: false, cardImage: null } as BattleCard,
    { id: 's1', slug: 'recon-mission', name: 'Recon Mission', subtype: 'secondary', keywords: ['Recon'], faction: null, isRecon: true, cardImage: null } as BattleCard,
    { id: 'a1', slug: 'fortified-position', name: 'Fortified Position', subtype: 'advantage', keywords: [], faction: 'empire', isRecon: false, cardImage: null } as BattleCard,
  ])

  app = express()
  app.use('/api/units', createUnitsRouter(sqlite))
  app.use('/api/upgrades', createUpgradesRouter(sqlite))
  app.use('/api/commands', createCommandsRouter(sqlite))
  app.use('/api/products', createProductsRouter(sqlite))
  app.use('/api/battle-forces', createBattleForcesRouter(sqlite))
  app.use('/api/battle-cards', createBattleCardsRouter(sqlite))
})

afterAll(() => sqlite.close())

describe('GET /api/units', () => {
  it('returns all units with parsed array fields', async () => {
    const res = await request(app).get('/api/units')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(3)
    const vader = res.body.find((u: Unit) => u.slug === 'darth-vader')
    expect(vader.keywords).toEqual(['Precise 1'])
    expect(vader.upgradeBar).toEqual(['gear'])
    expect(vader.weapons[0].name).toBe('Blaster')
    expect(vader.isUnique).toBe(true)
  })

  it('filters by faction', async () => {
    const res = await request(app).get('/api/units?faction=rebels')
    expect(res.body).toHaveLength(1)
    expect(res.body[0].name).toBe('Luke Skywalker')
  })

  it('filters by rank', async () => {
    const res = await request(app).get('/api/units?faction=empire&rank=commander')
    expect(res.body).toHaveLength(1)
    expect(res.body[0].slug).toBe('darth-vader')
  })

  it('searches by query string', async () => {
    const res = await request(app).get('/api/units?q=storm')
    expect(res.body).toHaveLength(1)
    expect(res.body[0].name).toBe('Stormtroopers')
  })

  it('returns one unit by slug', async () => {
    const res = await request(app).get('/api/units/luke-skywalker')
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Luke Skywalker')
  })

  it('404s for unknown slug', async () => {
    const res = await request(app).get('/api/units/nope')
    expect(res.status).toBe(404)
  })
})

describe('GET /api/upgrades', () => {
  it('returns all upgrades', async () => {
    const res = await request(app).get('/api/upgrades')
    expect(res.body).toHaveLength(2)
  })
  it('filters by slot', async () => {
    const res = await request(app).get('/api/upgrades?slot=force')
    expect(res.body).toHaveLength(1)
    expect(res.body[0].name).toBe('Hope')
  })
})

describe('GET /api/commands & /api/products', () => {
  it('returns commands', async () => {
    const res = await request(app).get('/api/commands')
    expect(res.body[0].pips).toBe(1)
  })
  it('returns products with parsed unitSlugs', async () => {
    const res = await request(app).get('/api/products')
    expect(res.body[0].unitSlugs).toEqual(['darth-vader'])
  })
})

describe('GET /api/battle-forces', () => {
  it('returns all battle forces with parsed object/array fields', async () => {
    const res = await request(app).get('/api/battle-forces')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    const mc = res.body.find((b: BattleForce) => b.linkId === 'mc')
    expect(mc.rankUnits.corps).toEqual(['storm'])
    expect(mc.modes.standard.corps).toEqual([2, 6])
    expect(mc.rules).toEqual({ countMercs: true })
    expect(mc.rulesText).toEqual(['Mercenaries count as native.'])
  })

  it('filters by faction', async () => {
    const res = await request(app).get('/api/battle-forces?faction=empire')
    expect(res.body).toHaveLength(1)
    expect(res.body[0].name).toBe('Blizzard Force')
  })

  it('returns one battle force by linkId', async () => {
    const res = await request(app).get('/api/battle-forces/mc')
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Mandalorian Clans')
  })

  it('404s for unknown linkId', async () => {
    const res = await request(app).get('/api/battle-forces/nope')
    expect(res.status).toBe(404)
  })
})

describe('GET /api/battle-cards', () => {
  it('returns all battle cards with parsed fields', async () => {
    const res = await request(app).get('/api/battle-cards')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(3)
    const recon = res.body.find((c: BattleCard) => c.slug === 'recon-mission')
    expect(recon.subtype).toBe('secondary')
    expect(recon.isRecon).toBe(true)
    expect(recon.keywords).toEqual(['Recon'])
  })

  it('filters by subtype', async () => {
    const res = await request(app).get('/api/battle-cards?subtype=objective')
    expect(res.body).toHaveLength(1)
    expect(res.body[0].name).toBe('Breakthrough')
  })

  it('filters by faction including faction-agnostic cards', async () => {
    const res = await request(app).get('/api/battle-cards?faction=empire')
    // empire-restricted + the two null-faction cards
    expect(res.body.map((c: BattleCard) => c.slug).sort()).toEqual(['breakthrough', 'fortified-position', 'recon-mission'])
  })
})
