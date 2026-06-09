import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import express from 'express'
import Database from 'better-sqlite3'
import request from 'supertest'
import { createTables, seedUnits, seedUpgrades, seedCommands, seedProducts } from '../server/db/seed.ts'
import { createUnitsRouter } from '../server/routes/units.ts'
import { createUpgradesRouter } from '../server/routes/upgrades.ts'
import { createCommandsRouter } from '../server/routes/commands.ts'
import { createProductsRouter } from '../server/routes/products.ts'
import type { Unit, Upgrade, CommandCard, Product } from '../src/types/index.ts'

function makeUnit(over: Partial<Unit>): Unit {
  return {
    id: 'x', slug: 'x', name: 'X', title: '', faction: 'empire', rank: 'corps',
    unitType: 'trooper', cost: 50, defense: 'white', surgeAttack: 'hit', surgeDefense: false,
    speed: 2, wounds: 5, courage: 1, isUnique: false, keywords: ['Precise 1'],
    upgradeBar: ['gear'], cardImage: null, portraitImage: null, hasFullData: true, history: [],
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

  app = express()
  app.use('/api/units', createUnitsRouter(sqlite))
  app.use('/api/upgrades', createUpgradesRouter(sqlite))
  app.use('/api/commands', createCommandsRouter(sqlite))
  app.use('/api/products', createProductsRouter(sqlite))
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
