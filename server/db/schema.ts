import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core'

// Array/object fields are stored as JSON text and parsed on read.

export const units = sqliteTable('units', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().default(''),
  name: text('name').notNull(),
  title: text('title').notNull().default(''),
  faction: text('faction').notNull().default('mercenary'),
  rank: text('rank').notNull().default('corps'),
  unitType: text('unit_type').notNull().default('trooper'),
  affiliation: text('affiliation'),
  affiliations: text('affiliations').notNull().default('[]'),
  cost: integer('cost'),
  defense: text('defense'),
  surgeAttack: text('surge_attack'),
  surgeDefense: integer('surge_defense').notNull().default(0),
  speed: integer('speed'),
  wounds: integer('wounds'),
  courage: integer('courage'),
  isUnique: integer('is_unique').notNull().default(0),
  keywords: text('keywords').notNull().default('[]'),
  upgradeBar: text('upgrade_bar').notNull().default('[]'),
  weapons: text('weapons').notNull().default('[]'),
  cardImage: text('card_image'),
  portraitImage: text('portrait_image'),
  hasFullData: integer('has_full_data').notNull().default(0),
  history: text('history').notNull().default('[]'),
  specialIssue: text('special_issue'),
})

export const battleForces = sqliteTable('battle_forces', {
  linkId: text('link_id').primaryKey(),
  name: text('name').notNull(),
  faction: text('faction').notNull().default('mercenary'),
  forceAffinity: text('force_affinity'),
  rankUnits: text('rank_units').notNull().default('{}'),
  allowedUpgrades: text('allowed_upgrades').notNull().default('[]'),
  disallowedUpgrades: text('disallowed_upgrades').notNull().default('[]'),
  rules: text('rules').notNull().default('{}'),
  rulesText: text('rules_text').notNull().default('[]'),
  modes: text('modes').notNull().default('{}'),
})

export const upgrades = sqliteTable('upgrades', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().default(''),
  name: text('name').notNull(),
  slot: text('slot').notNull().default('gear'),
  cost: integer('cost'),
  isUnique: integer('is_unique').notNull().default(0),
  limit: integer('limit_count'), // "limit" is a SQL reserved word
  requirements: text('requirements'), // JSON: equip-eligibility
  faction: text('faction'),
  keywords: text('keywords').notNull().default('[]'),
  cardImage: text('card_image'),
})

export const commands = sqliteTable('commands', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().default(''),
  name: text('name').notNull(),
  pips: integer('pips').notNull().default(0),
  commander: text('commander'),
  faction: text('faction'),
  cardImage: text('card_image'),
})

export const products = sqliteTable('products', {
  code: text('code').primaryKey(),
  name: text('name').notNull(),
  faction: text('faction').notNull().default('mercenary'),
  type: text('type').notNull().default('expansion'),
  unitSlugs: text('unit_slugs').notNull().default('[]'),
  ean: text('ean'),
  storeUrl: text('store_url'),
  image: text('image'),
})
