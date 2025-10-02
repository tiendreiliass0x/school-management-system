import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const connectionString = process.env.MAIN_DATABASE_URL || process.env.DATABASE_URL

if (!connectionString) {
  throw new Error(
    'Database connection string is not configured. Set MAIN_DATABASE_URL or DATABASE_URL in the environment before starting the server.'
  )
}

const client = postgres(connectionString)
export const db = drizzle(client)
