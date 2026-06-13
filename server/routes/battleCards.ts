import { Router } from 'express'
import type Database from 'better-sqlite3'

type Sqlite = InstanceType<typeof Database>

export function rowToBattleCard(row: Record<string, unknown>) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    subtype: row.subtype,
    keywords: JSON.parse((row.keywords as string) || '[]'),
    faction: row.faction ?? null,
    isRecon: !!row.is_recon,
    cardImage: row.card_image ?? null,
  }
}

export function createBattleCardsRouter(sqlite: Sqlite) {
  const router = Router()

  router.get('/', (req, res) => {
    let sql = 'SELECT * FROM battle_cards WHERE 1=1'
    const params: unknown[] = []
    if (req.query.subtype) { sql += ' AND subtype = ?'; params.push(req.query.subtype) }
    if (req.query.faction) { sql += ' AND (faction = ? OR faction IS NULL)'; params.push(req.query.faction) }
    sql += ' ORDER BY subtype, name'
    const rows = sqlite.prepare(sql).all(...(params as [])) as Record<string, unknown>[]
    res.json(rows.map(rowToBattleCard))
  })

  return router
}
