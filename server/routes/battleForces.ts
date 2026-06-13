import { Router } from 'express'
import type Database from 'better-sqlite3'

type Sqlite = InstanceType<typeof Database>

export function rowToBattleForce(row: Record<string, unknown>) {
  return {
    linkId: row.link_id,
    name: row.name,
    faction: row.faction,
    forceAffinity: row.force_affinity ?? null,
    rankUnits: JSON.parse((row.rank_units as string) || '{}'),
    allowedUpgrades: JSON.parse((row.allowed_upgrades as string) || '[]'),
    disallowedUpgrades: JSON.parse((row.disallowed_upgrades as string) || '[]'),
    rules: JSON.parse((row.rules as string) || '{}'),
    rulesText: JSON.parse((row.rules_text as string) || '[]'),
    modes: JSON.parse((row.modes as string) || '{}'),
  }
}

export function createBattleForcesRouter(sqlite: Sqlite) {
  const router = Router()

  router.get('/', (req, res) => {
    let sql = 'SELECT * FROM battle_forces WHERE 1=1'
    const params: unknown[] = []
    if (req.query.faction) { sql += ' AND faction = ?'; params.push(req.query.faction) }
    sql += ' ORDER BY faction, name'
    const rows = sqlite.prepare(sql).all(...(params as [])) as Record<string, unknown>[]
    res.json(rows.map(rowToBattleForce))
  })

  router.get('/:linkId', (req, res) => {
    const row = sqlite.prepare('SELECT * FROM battle_forces WHERE link_id = ?').get(req.params.linkId) as
      | Record<string, unknown>
      | undefined
    if (!row) { res.status(404).json({ error: 'Not found' }); return }
    res.json(rowToBattleForce(row))
  })

  return router
}
