import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { users } from './src/db/schema'
import { eq } from 'drizzle-orm'

const DATABASE_URL = "postgresql://school_management:ecole_management%232025@localhost:5432/school_management"

async function testDatabase() {
  try {
    console.log('🔌 Connecting to database...')
    const client = postgres(DATABASE_URL, { max: 1 })
    const db = drizzle(client)
    
    console.log('📊 Checking for Alice Johnson...')
    const user = await db.select().from(users).where(eq(users.email, 'alice.johnson@demoschool.edu')).limit(1)
    
    if (user.length > 0) {
      console.log('✅ Found Alice Johnson:', {
        email: user[0].email,
        role: user[0].role,
        firstName: user[0].firstName,
        lastName: user[0].lastName,
        isActive: user[0].isActive
      })
    } else {
      console.log('❌ Alice Johnson not found')
      
      console.log('📋 Checking all users...')
      const allUsers = await db.select({
        email: users.email,
        role: users.role,
        firstName: users.firstName,
        lastName: users.lastName,
        isActive: users.isActive
      }).from(users).limit(10)
      
      console.log('📝 Found users:', allUsers)
    }
    
    await client.end()
  } catch (error) {
    console.error('❌ Database error:', error)
  }
}

testDatabase()
