import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { schools, users } from './src/db/schema'
import bcrypt from 'bcryptjs'

const DATABASE_URL = "postgresql://school_management:ecole_management%232025@localhost:5432/school_management"

async function createDemoData() {
  try {
    console.log('🔌 Connecting to database...')
    const client = postgres(DATABASE_URL, { max: 1 })
    const db = drizzle(client)
    
    console.log('🏫 Creating demo school...')
    const demoSchool = await db.insert(schools).values({
      name: 'Demo Elementary School',
      address: '123 Education Street, Learning City, LC 12345',
      phone: '+1 (555) 123-4567',
      email: 'admin@demoschool.edu',
      website: 'https://demoschool.edu',
      description: 'A demonstration school for the School Management System',
      principalName: 'Dr. Sarah Principal',
      establishedYear: 2005,
      isActive: true,
    }).returning()

    console.log('✅ Created school:', demoSchool[0].name)

    console.log('🔑 Hashing passwords...')
    const adminPassword = await bcrypt.hash('admin123!', 12)
    const teacherPassword = await bcrypt.hash('teacher123!', 12)
    const studentPassword = await bcrypt.hash('student123!', 12)

    console.log('👥 Creating users...')
    
    // Create super admin
    const superAdmin = await db.insert(users).values({
      firstName: 'Super',
      lastName: 'Admin',
      email: 'superadmin@system.com',
      passwordHash: adminPassword,
      role: 'super_admin',
      schoolId: null,
      phone: '+1 (555) 000-0000',
      isActive: true,
    }).returning()

    console.log('✅ Created super admin')

    // Create school admin
    const schoolAdmin = await db.insert(users).values({
      firstName: 'John',
      lastName: 'Principal',
      email: 'admin@demoschool.edu',
      passwordHash: adminPassword,
      role: 'school_admin',
      schoolId: demoSchool[0].id,
      phone: '+1 (555) 123-4567',
      isActive: true,
    }).returning()

    console.log('✅ Created school admin')

    // Create Alice Johnson (teacher)
    const teacher = await db.insert(users).values({
      firstName: 'Alice',
      lastName: 'Johnson',
      email: 'alice.johnson@demoschool.edu',
      passwordHash: teacherPassword,
      role: 'teacher',
      schoolId: demoSchool[0].id,
      phone: '+1 (555) 234-5678',
      address: '456 Teacher Lane, Education City',
      isActive: true,
    }).returning()

    console.log('✅ Created teacher Alice Johnson')

    // Create a demo student
    const student = await db.insert(users).values({
      firstName: 'Emma',
      lastName: 'Student',
      email: 'emma.student@demoschool.edu',
      passwordHash: studentPassword,
      role: 'student',
      schoolId: demoSchool[0].id,
      phone: '+1 (555) 345-6789',
      isActive: true,
    }).returning()

    console.log('✅ Created student Emma Student')

    console.log('\n🎉 Database seeded successfully!')
    console.log('\n📝 Login credentials:')
    console.log('Super Admin: superadmin@system.com / admin123!')
    console.log('School Admin: admin@demoschool.edu / admin123!')
    console.log('Teacher: alice.johnson@demoschool.edu / teacher123!')
    console.log('Student: emma.student@demoschool.edu / student123!')

    await client.end()
  } catch (error) {
    console.error('❌ Seeding failed:', error)
  }
}

createDemoData()
