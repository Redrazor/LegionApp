import { Router } from 'express'
import type Database from 'better-sqlite3'

type Sqlite = InstanceType<typeof Database>

export function rowToUnit(row: Record<string, unknown>) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    title: row.title,
    faction: row.faction,
    rank: row.rank,
    unitType: row.unit_type,
    cost: row.cost ?? null,
    defense: row.defense ?? null,
    surgeAttack: row.surge_attack ?? null,
    surgeDefense: !!row.surge_defense,
    speed: row.speed ?? null,
    wounds: row.wounds ?? null,
    courage: row.courage ?? null,
    isUnique: !!row.is_unique,
    keywords: JSON.parse((row.keywords as string) || '[]'),
    upgradeBar: JSON.parse((row.upgrade_bar as string) || '[]'),
    weapons: JSON.parse((row.weapons as string) || '[]'),
    cardImage: row.card_image ?? null,
    portraitImage: row.portrait_image ?? null,
    hasFullData: !!row.has_full_data,
    history: JSON.parse((row.history as string) || '[]'),
  }
}

export function createUnitsRouter(sqlite: Sqlite) {
  const router = Router()

  router.get('/', (req, res) => {
    let sql = 'SELECT * FROM units WHERE 1=1'
    const params: unknown[] = []
    if (req.query.faction) { sql += ' AND faction = ?'; params.push(req.query.faction) }
    if (req.query.rank) { sql += ' AND rank = ?'; params.push(req.query.rank) }
    if (req.query.q) {
      sql += ' AND (LOWER(name) LIKE ? OR LOWER(title) LIKE ? OR LOWER(keywords) LIKE ?)'
      const like = `%${String(req.query.q).toLowerCase()}%`
      params.push(like, like, like)
    }
    sql += ' ORDER BY faction, rank, name'
    const rows = sqlite.prepare(sql).all(...(params as [])) as Record<string, unknown>[]
    res.json(rows.map(rowToUnit))
  })

  router.get('/:slug', (req, res) => {
    const row = sqlite.prepare('SELECT * FROM units WHERE slug = ?').get(req.params.slug) as
      | Record<string, unknown>
      | undefined
    if (!row) { res.status(404).json({ error: 'Not found' }); return }
    res.json(rowToUnit(row))
  })

  return router
}
