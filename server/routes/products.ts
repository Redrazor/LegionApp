import { Router } from 'express'
import type Database from 'better-sqlite3'

type Sqlite = InstanceType<typeof Database>

export function rowToProduct(row: Record<string, unknown>) {
  return {
    code: row.code,
    name: row.name,
    faction: row.faction,
    type: row.type,
    unitSlugs: JSON.parse((row.unit_slugs as string) || '[]'),
  }
}

export function createProductsRouter(sqlite: Sqlite) {
  const router = Router()

  router.get('/', (req, res) => {
    let sql = 'SELECT * FROM products WHERE 1=1'
    const params: unknown[] = []
    if (req.query.faction) { sql += ' AND faction = ?'; params.push(req.query.faction) }
    sql += ' ORDER BY faction, name'
    const rows = sqlite.prepare(sql).all(...(params as [])) as Record<string, unknown>[]
    res.json(rows.map(rowToProduct))
  })

  return router
}
