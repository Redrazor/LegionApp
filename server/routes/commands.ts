import { Router } from 'express'
import type Database from 'better-sqlite3'

type Sqlite = InstanceType<typeof Database>

export function rowToCommand(row: Record<string, unknown>) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    pips: row.pips,
    commander: row.commander ?? null,
    faction: row.faction ?? null,
    cardImage: row.card_image ?? null,
  }
}

export function createCommandsRouter(sqlite: Sqlite) {
  const router = Router()

  router.get('/', (req, res) => {
    let sql = 'SELECT * FROM commands WHERE 1=1'
    const params: unknown[] = []
    if (req.query.faction) { sql += ' AND faction = ?'; params.push(req.query.faction) }
    if (req.query.commander) { sql += ' AND commander = ?'; params.push(req.query.commander) }
    sql += ' ORDER BY pips, name'
    const rows = sqlite.prepare(sql).all(...(params as [])) as Record<string, unknown>[]
    res.json(rows.map(rowToCommand))
  })

  return router
}
