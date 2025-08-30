import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not defined')
  process.exit(1)
}

async function runMigrations() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
  })

  const db = drizzle(pool)

  console.log('🔄 Running migrations...')
  
  try {
    await migrate(db, { migrationsFolder: './src/db/migrations' })
    console.log('✅ Migrations completed successfully')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

if (require.main === module) {
  runMigrations()
}