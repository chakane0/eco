// ABOUTME: One-off script to clear and recreate database tables.
// ABOUTME: Run with: npx tsx --env-file=.env src/resetDb.ts

import { dropTables, createTables } from './schema.js'

async function main() {
  await dropTables()
  await createTables()
  console.log('Database reset complete')
  process.exit(0)
}

main().catch(err => {
  console.error('Reset failed:', err)
  process.exit(1)
})
