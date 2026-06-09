import { sqlite } from './index.ts'
import { createTables, dropTables } from './seed.ts'

// LegionApp seeds fresh from public/data on every server start (runSeed),
// so this is a convenience for rebuilding the schema in isolation.
dropTables(sqlite)
createTables(sqlite)
console.log('Schema rebuilt.')
sqlite.close()
