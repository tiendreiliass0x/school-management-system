import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

interface DatabaseConfig {
  host: string
  port: number
  database: string
  username: string
  password: string
}

class DatabaseManager {
  private connections: Map<string, any> = new Map()
  private mainDb: any

  constructor() {
    // Main database for school registry and super admin operations
    const mainConnectionString = process.env.MAIN_DATABASE_URL || 'postgresql://localhost:5432/school_management_main'
    const mainClient = postgres(mainConnectionString)
    this.mainDb = drizzle(mainClient)
  }

  // Get connection for specific school
  getSchoolConnection(schoolId: string) {
    if (this.connections.has(schoolId)) {
      return this.connections.get(schoolId)
    }

    // Each school has its own database
    const connectionString = `postgresql://localhost:5432/school_${schoolId}`
    const client = postgres(connectionString)
    const db = drizzle(client)
    
    this.connections.set(schoolId, db)
    return db
  }

  // Main database for school registry
  getMainDatabase() {
    return this.mainDb
  }

  // Create new school database
  async createSchoolDatabase(schoolId: string, schoolData: any) {
    // 1. Create entry in main database
    await this.mainDb.insert(schools).values({
      id: schoolId,
      ...schoolData
    })

    // 2. Create dedicated database for school
    const adminClient = postgres(process.env.ADMIN_DATABASE_URL!)
    await adminClient`CREATE DATABASE ${'school_' + schoolId}`
    
    // 3. Run migrations on new database
    const schoolDb = this.getSchoolConnection(schoolId)
    // Run schema migrations here
    
    return schoolDb
  }
}

export const dbManager = new DatabaseManager()
export default dbManager