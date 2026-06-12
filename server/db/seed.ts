import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import type Database from 'better-sqlite3'
import type { Unit, Upgrade, CommandCard, Product } from '../../src/types/index.ts'

type Sqlite = InstanceType<typeof Database>

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', '..', 'public', 'data')

function readJson<T>(filename: string): T[] {
  return JSON.parse(readFileSync(join(DATA_DIR, filename), 'utf-8')) as T[]
}

export function createTables(sqlite: Sqlite): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS units (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      faction TEXT NOT NULL DEFAULT 'mercenary',
      rank TEXT NOT NULL DEFAULT 'corps',
      unit_type TEXT NOT NULL DEFAULT 'trooper',
      affiliation TEXT,
      cost INTEGER,
      defense TEXT,
      surge_attack TEXT,
      surge_defense INTEGER NOT NULL DEFAULT 0,
      speed INTEGER,
      wounds INTEGER,
      courage INTEGER,
      is_unique INTEGER NOT NULL DEFAULT 0,
      keywords TEXT NOT NULL DEFAULT '[]',
      upgrade_bar TEXT NOT NULL DEFAULT '[]',
      weapons TEXT NOT NULL DEFAULT '[]',
      card_image TEXT,
      portrait_image TEXT,
      has_full_data INTEGER NOT NULL DEFAULT 0,
      history TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS upgrades (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL,
      slot TEXT NOT NULL DEFAULT 'gear',
      cost INTEGER,
      is_unique INTEGER NOT NULL DEFAULT 0,
      limit_count INTEGER,
      requirements TEXT,
      faction TEXT,
      keywords TEXT NOT NULL DEFAULT '[]',
      card_image TEXT
    );

    CREATE TABLE IF NOT EXISTS commands (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL,
      pips INTEGER NOT NULL DEFAULT 0,
      commander TEXT,
      faction TEXT,
      card_image TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      faction TEXT NOT NULL DEFAULT 'mercenary',
      type TEXT NOT NULL DEFAULT 'expansion',
      unit_slugs TEXT NOT NULL DEFAULT '[]',
      ean TEXT,
      store_url TEXT,
      image TEXT
    );
  `)
}

export function dropTables(sqlite: Sqlite): void {
  sqlite.exec(`
    DROP TABLE IF EXISTS units;
    DROP TABLE IF EXISTS upgrades;
    DROP TABLE IF EXISTS commands;
    DROP TABLE IF EXISTS products;
  `)
}

export function seedUnits(sqlite: Sqlite, list: Unit[]): void {
  const insert = sqlite.prepare(`
    INSERT INTO units (
      id, slug, name, title, faction, rank, unit_type, affiliation, cost, defense,
      surge_attack, surge_defense, speed, wounds, courage, is_unique,
      keywords, upgrade_bar, weapons, card_image, portrait_image, has_full_data, history
    ) VALUES (
      @id, @slug, @name, @title, @faction, @rank, @unitType, @affiliation, @cost, @defense,
      @surgeAttack, @surgeDefense, @speed, @wounds, @courage, @isUnique,
      @keywords, @upgradeBar, @weapons, @cardImage, @portraitImage, @hasFullData, @history
    )
  `)
  const run = sqlite.transaction((rows: Unit[]) => {
    for (const u of rows) {
      insert.run({
        id: u.id, slug: u.slug, name: u.name, title: u.title,
        faction: u.faction, rank: u.rank, unitType: u.unitType,
        affiliation: u.affiliation ?? null,
        cost: u.cost, defense: u.defense, surgeAttack: u.surgeAttack,
        surgeDefense: u.surgeDefense ? 1 : 0, speed: u.speed, wounds: u.wounds,
        courage: u.courage, isUnique: u.isUnique ? 1 : 0,
        keywords: JSON.stringify(u.keywords ?? []),
        upgradeBar: JSON.stringify(u.upgradeBar ?? []),
        weapons: JSON.stringify(u.weapons ?? []),
        cardImage: u.cardImage, portraitImage: u.portraitImage,
        hasFullData: u.hasFullData ? 1 : 0,
        history: JSON.stringify(u.history ?? []),
      })
    }
  })
  run(list)
}

export function seedUpgrades(sqlite: Sqlite, list: Upgrade[]): void {
  const insert = sqlite.prepare(`
    INSERT INTO upgrades (id, slug, name, slot, cost, is_unique, limit_count, requirements, faction, keywords, card_image)
    VALUES (@id, @slug, @name, @slot, @cost, @isUnique, @limit, @requirements, @faction, @keywords, @cardImage)
  `)
  const run = sqlite.transaction((rows: Upgrade[]) => {
    for (const u of rows) {
      insert.run({
        id: u.id, slug: u.slug, name: u.name, slot: u.slot, cost: u.cost,
        isUnique: u.isUnique ? 1 : 0, limit: u.limit ?? null,
        requirements: u.requirements ? JSON.stringify(u.requirements) : null,
        faction: u.faction,
        keywords: JSON.stringify(u.keywords ?? []), cardImage: u.cardImage,
      })
    }
  })
  run(list)
}

export function seedCommands(sqlite: Sqlite, list: CommandCard[]): void {
  const insert = sqlite.prepare(`
    INSERT INTO commands (id, slug, name, pips, commander, faction, card_image)
    VALUES (@id, @slug, @name, @pips, @commander, @faction, @cardImage)
  `)
  const run = sqlite.transaction((rows: CommandCard[]) => {
    for (const c of rows) {
      insert.run({
        id: c.id, slug: c.slug, name: c.name, pips: c.pips,
        commander: c.commander, faction: c.faction, cardImage: c.cardImage,
      })
    }
  })
  run(list)
}

export function seedProducts(sqlite: Sqlite, list: Product[]): void {
  const insert = sqlite.prepare(`
    INSERT INTO products (code, name, faction, type, unit_slugs, ean, store_url, image)
    VALUES (@code, @name, @faction, @type, @unitSlugs, @ean, @storeUrl, @image)
  `)
  const run = sqlite.transaction((rows: Product[]) => {
    for (const p of rows) {
      insert.run({
        code: p.code, name: p.name, faction: p.faction, type: p.type,
        unitSlugs: JSON.stringify(p.unitSlugs ?? []),
        ean: p.ean ?? null, storeUrl: p.storeUrl ?? null, image: p.image ?? null,
      })
    }
  })
  run(list)
}

export function runSeed(sqlite: Sqlite): void {
  dropTables(sqlite)
  createTables(sqlite)
  const u = readJson<Unit>('units.json')
  const up = readJson<Upgrade>('upgrades.json')
  const c = readJson<CommandCard>('commands.json')
  const p = readJson<Product>('products.json')
  seedUnits(sqlite, u)
  seedUpgrades(sqlite, up)
  seedCommands(sqlite, c)
  seedProducts(sqlite, p)
  console.log(`Seed complete: ${u.length} units, ${up.length} upgrades, ${c.length} commands, ${p.length} products`)
}

async function main(): Promise<void> {
  const { sqlite } = await import('./index.ts')
  runSeed(sqlite)
  sqlite.close()
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1) })
}
