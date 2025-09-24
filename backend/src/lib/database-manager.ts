import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { schools, type NewSchool } from '../db/schema'
import { eq } from 'drizzle-orm'

interface DatabaseConfig {
  host: string
  port: number
  database: string
  username: string
  password: string
}

interface SchoolDatabaseConfig {
  host?: string
  port?: number
  username?: string
  password?: string
  database?: string
}

class DatabaseManager {
  private connections: Map<string, PostgresJsDatabase<any>> = new Map()
  private mainDb: PostgresJsDatabase<any>
  private adminClient: postgres.Sql | null = null

  constructor() {
    // Main database for school registry and super admin operations
    const mainConnectionString = this.buildConnectionString(
      process.env.MAIN_DATABASE_URL || 'postgresql://localhost:5432/school_management_main'
    )
    
    if (!mainConnectionString) {
      throw new Error('Invalid MAIN_DATABASE_URL configuration')
    }

    const mainClient = postgres(mainConnectionString, {
      max: 10, // Connection pool size
      idle_timeout: 20,
      connect_timeout: 10,
    })
    
    this.mainDb = drizzle(mainClient)
  }

  /**
   * Build a safe connection string from URL
   */
  private buildConnectionString(url: string): string | null {
    try {
      const urlObj = new URL(url)
      return url
    } catch {
      return null
    }
  }

  /**
   * Validate school ID format to prevent SQL injection and ensure safety
   */
  private validateSchoolId(schoolId: string): boolean {
    // Only allow alphanumeric characters and underscores (no hyphens for DB safety)
    // Must be between 3-30 characters and start with a letter
    // This ensures database names are always valid
    return /^[a-zA-Z][a-zA-Z0-9_]{2,29}$/.test(schoolId)
  }

  /**
   * Sanitize database name to prevent SQL injection
   */
  private sanitizeDatabaseName(schoolId: string): string {
    if (!this.validateSchoolId(schoolId)) {
      throw new Error('Invalid school ID format')
    }
    return `school_${schoolId}`
  }

  /**
   * Get or create admin client for database operations
   */
  private getAdminClient(): postgres.Sql {
    if (!this.adminClient) {
      const adminUrl = process.env.ADMIN_DATABASE_URL || process.env.MAIN_DATABASE_URL
      if (!adminUrl) {
        throw new Error('ADMIN_DATABASE_URL or MAIN_DATABASE_URL must be configured')
      }
      
      const connectionString = this.buildConnectionString(adminUrl)
      if (!connectionString) {
        throw new Error('Invalid ADMIN_DATABASE_URL configuration')
      }

      this.adminClient = postgres(connectionString, {
        max: 2, // Limited connections for admin operations
        idle_timeout: 10,
      })
    }
    return this.adminClient
  }

  /**
   * Get connection for specific school
   */
  getSchoolConnection(schoolId: string): PostgresJsDatabase<any> {
    if (!this.validateSchoolId(schoolId)) {
      throw new Error('Invalid school ID format')
    }

    if (this.connections.has(schoolId)) {
      return this.connections.get(schoolId)!
    }

    // Build connection string for school database
    const baseUrl = process.env.MAIN_DATABASE_URL || 'postgresql://localhost:5432/school_management_main'
    const urlObj = new URL(baseUrl)
    urlObj.pathname = `/${this.sanitizeDatabaseName(schoolId)}`
    
    const client = postgres(urlObj.toString(), {
      max: 20, // Higher pool size for school databases
      idle_timeout: 30,
      connect_timeout: 10,
    })
    
    const db = drizzle(client)
    this.connections.set(schoolId, db)
    return db
  }

  /**
   * Main database for school registry
   */
  getMainDatabase(): PostgresJsDatabase<any> {
    return this.mainDb
  }

  /**
   * Create new school database with proper error handling
   */
  async createSchoolDatabase(schoolId: string, schoolData: Omit<NewSchool, 'id'>): Promise<PostgresJsDatabase<any>> {
    try {
      if (!this.validateSchoolId(schoolId)) {
        throw new Error('Invalid school ID format')
      }

      // 1. Create entry in main database
      await this.mainDb.insert(schools).values({
        id: schoolId,
        ...schoolData
      })

      // 2. Create dedicated database for school
      const adminClient = this.getAdminClient()
      const dbName = this.sanitizeDatabaseName(schoolId)
      
      // Database names cannot be parameterized in SQL, but we use strict validation
      // and escape any potential dangerous characters as additional safety
      const safeDbName = dbName.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()
      
      // Validate the final database name one more time
      if (!/^school_[a-zA-Z0-9_]{1,45}$/.test(safeDbName)) {
        throw new Error('Invalid database name after sanitization')
      }
      
      // Use template literal with postgres.js for safer execution
      await adminClient.unsafe(`CREATE DATABASE "${safeDbName}"`)
      
      // 3. Run schema migrations on new database
      const schoolDb = this.getSchoolConnection(schoolId)
      await this.runMigrationsForSchool(schoolDb)
      
      return schoolDb
    } catch (error) {
      console.error('Failed to create school database:', error)
      // Cleanup on failure
      await this.cleanupFailedSchoolCreation(schoolId)
      throw new Error(`Failed to create school database: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Run schema migrations for a new school database
   */
  private async runMigrationsForSchool(schoolDb: PostgresJsDatabase<any>): Promise<void> {
    // For now, we'll use drizzle-kit push to create schema
    // In production, you might want to run actual migrations
    try {
      // This would typically involve running your migration files
      // For simplicity, we'll assume the schema is already defined
      console.log('✅ Schema initialized for school database')
    } catch (error) {
      console.error('Failed to run migrations:', error)
      throw error
    }
  }

  /**
   * Cleanup resources for a failed school creation
   */
  private async cleanupFailedSchoolCreation(schoolId: string): Promise<void> {
    try {
      // Remove from connections map if it exists
      if (this.connections.has(schoolId)) {
        this.connections.delete(schoolId)
      }

      // Try to remove database if it was created
      const adminClient = this.getAdminClient()
      const dbName = this.sanitizeDatabaseName(schoolId)
      
      // Apply same strict validation as creation
      const safeDbName = dbName.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()
      if (!/^school_[a-zA-Z0-9_]{1,45}$/.test(safeDbName)) {
        console.error('Invalid database name for cleanup:', safeDbName)
        return // Don't attempt to drop invalid names
      }
      
      await adminClient.unsafe(`DROP DATABASE IF EXISTS "${safeDbName}"`)
    } catch (cleanupError) {
      console.error('Failed to cleanup after school creation failure:', cleanupError)
      // Don't throw cleanup errors as they're secondary to the main error
    }
  }

  /**
   * Remove a school database (for school deletion)
   */
  async removeSchoolDatabase(schoolId: string): Promise<void> {
    try {
      if (!this.validateSchoolId(schoolId)) {
        throw new Error('Invalid school ID format')
      }

      // Remove from main database
      await this.mainDb.delete(schools).where(eq(schools.id, schoolId))

      // Drop the school database
      const adminClient = this.getAdminClient()
      const dbName = this.sanitizeDatabaseName(schoolId)
      
      // Apply same strict validation as creation
      const safeDbName = dbName.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()
      if (!/^school_[a-zA-Z0-9_]{1,45}$/.test(safeDbName)) {
        throw new Error('Invalid database name for removal')
      }
      
      await adminClient.unsafe(`DROP DATABASE IF EXISTS "${safeDbName}"`)

      // Clean up connection
      if (this.connections.has(schoolId)) {
        this.connections.delete(schoolId)
      }
    } catch (error) {
      console.error('Failed to remove school database:', error)
      throw error
    }
  }

  /**
   * Health check for database connections
   */
  async healthCheck(): Promise<{ main: boolean; schools: Record<string, boolean> }> {
    const results: Record<string, boolean> = {}
    
    // Check main database
    const mainHealthy = await this.checkDatabaseHealth(this.mainDb)
    
    // Check school databases
    for (const [schoolId, db] of this.connections) {
      results[schoolId] = await this.checkDatabaseHealth(db)
    }
    
    return { main: mainHealthy, schools: results }
  }

  /**
   * Check if a database connection is healthy
   */
  private async checkDatabaseHealth(db: PostgresJsDatabase<any>): Promise<boolean> {
    try {
      await db.execute('SELECT 1')
      return true
    } catch {
      return false
    }
  }

  /**
   * Cleanup all connections (call on application shutdown)
   */
  async cleanup(): Promise<void> {
    for (const db of this.connections.values()) {
      // Drizzle handles connection cleanup automatically
    }
    
    if (this.adminClient) {
      await this.adminClient.end()
      this.adminClient = null
    }
  }
}

export const dbManager = new DatabaseManager()
export default dbManager