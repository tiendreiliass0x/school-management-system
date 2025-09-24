import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const connectionString = process.env.MAIN_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://school_management:ecole_management%232025@localhost:5432/school_management'
const client = postgres(connectionString)
export const db = drizzle(client)