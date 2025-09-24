import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.MAIN_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://school_management:ecole_management%232025@localhost:5432/school_management',
  },
})