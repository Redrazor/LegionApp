import { Router } from 'express'
import type Database from 'better-sqlite3'

type Sqlite = InstanceType<typeof Database>

export function rowToUpgrade(row: Record<string, unknown>) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    slot: row.slot,
    cost: row.cost ?? null,
    isUnique: !!row.is_unique,
    ...(row.limit_count != null ? { limit: row.limit_count } : {}),
    ...(row.requirements ? { requirements: JSON.parse(row.requirements as string) } : {}),
    faction: row.faction ?? null,
    keywords: JSON.parse((row.keywords as string) || '[]'),
    grantedSlots: JSON.parse((row.granted_slots as string) || '[]'),
    cardImage: row.card_image ?? null,
  }
}

export function createUpgradesRouter(sqlite: Sqlite) {
  const router = Router()

  router.get('/', (req, res) => {
    let sql = 'SELECT * FROM upgrades WHERE 1=1'
    const params: unknown[] = []
    if (req.query.slot) { sql += ' AND slot = ?'; params.push(req.query.slot) }
    sql += ' ORDER BY slot, cost, name'
    const rows = sqlite.prepare(sql).all(...(params as [])) as Record<string, unknown>[]
    res.json(rows.map(rowToUpgrade))
  })

  return router
}
