import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'
import { schools, users, classes, academicYears } from './schema'

// Load environment variables
dotenv.config()

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not defined')
  process.exit(1)
}

async function seed() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
  })

  const db = drizzle(pool)

  console.log('🌱 Starting database seeding...')

  try {
    // Create demo school
    const [demoSchool] = await db
      .insert(schools)
      .values({
        name: 'Demo Elementary School',
        address: '123 Education Street, Learning City, LC 12345',
        phone: '+1 (555) 123-4567',
        email: 'admin@demoschool.edu',
        website: 'https://demoschool.edu',
        description: 'A demonstration school for the School Management System',
      })
      .returning()

    console.log('✅ Created demo school')

    // Create academic year
    const currentYear = new Date().getFullYear()
    const [academicYear] = await db
      .insert(academicYears)
      .values({
        schoolId: demoSchool.id,
        name: `${currentYear}-${currentYear + 1}`,
        startDate: new Date(`${currentYear}-09-01`),
        endDate: new Date(`${currentYear + 1}-06-30`),
        isActive: true,
      })
      .returning()

    console.log('✅ Created academic year')

    // Create super admin user
    const superAdminPassword = await bcrypt.hash('admin123!', 12)
    const [superAdmin] = await db
      .insert(users)
      .values({
        firstName: 'Super',
        lastName: 'Admin',
        email: 'superadmin@system.com',
        passwordHash: superAdminPassword,
        role: 'super_admin',
        isActive: true,
      })
      .returning()

    console.log('✅ Created super admin user')

    // Create school admin
    const schoolAdminPassword = await bcrypt.hash('admin123!', 12)
    const [schoolAdmin] = await db
      .insert(users)
      .values({
        firstName: 'John',
        lastName: 'Administrator',
        email: 'admin@demoschool.edu',
        passwordHash: schoolAdminPassword,
        role: 'school_admin',
        schoolId: demoSchool.id,
        isActive: true,
      })
      .returning()

    console.log('✅ Created school admin user')

    // Create demo teachers
    const teacherPassword = await bcrypt.hash('teacher123!', 12)
    const teachers = await db
      .insert(users)
      .values([
        {
          firstName: 'Alice',
          lastName: 'Johnson',
          email: 'alice.johnson@demoschool.edu',
          passwordHash: teacherPassword,
          role: 'teacher',
          schoolId: demoSchool.id,
          phone: '+1 (555) 234-5678',
          isActive: true,
        },
        {
          firstName: 'Bob',
          lastName: 'Smith',
          email: 'bob.smith@demoschool.edu',
          passwordHash: teacherPassword,
          role: 'teacher',
          schoolId: demoSchool.id,
          phone: '+1 (555) 345-6789',
          isActive: true,
        },
        {
          firstName: 'Carol',
          lastName: 'Williams',
          email: 'carol.williams@demoschool.edu',
          passwordHash: teacherPassword,
          role: 'teacher',
          schoolId: demoSchool.id,
          phone: '+1 (555) 456-7890',
          isActive: true,
        },
      ])
      .returning()

    console.log('✅ Created demo teachers')

    // Create demo students
    const studentPassword = await bcrypt.hash('student123!', 12)
    const students = await db
      .insert(users)
      .values([
        {
          firstName: 'Emma',
          lastName: 'Davis',
          email: 'emma.davis@student.demoschool.edu',
          passwordHash: studentPassword,
          role: 'student',
          schoolId: demoSchool.id,
          dateOfBirth: new Date('2010-03-15'),
          isActive: true,
        },
        {
          firstName: 'Liam',
          lastName: 'Wilson',
          email: 'liam.wilson@student.demoschool.edu',
          passwordHash: studentPassword,
          role: 'student',
          schoolId: demoSchool.id,
          dateOfBirth: new Date('2010-07-22'),
          isActive: true,
        },
        {
          firstName: 'Olivia',
          lastName: 'Brown',
          email: 'olivia.brown@student.demoschool.edu',
          passwordHash: studentPassword,
          role: 'student',
          schoolId: demoSchool.id,
          dateOfBirth: new Date('2009-11-08'),
          isActive: true,
        },
        {
          firstName: 'Noah',
          lastName: 'Taylor',
          email: 'noah.taylor@student.demoschool.edu',
          passwordHash: studentPassword,
          role: 'student',
          schoolId: demoSchool.id,
          dateOfBirth: new Date('2010-01-30'),
          isActive: true,
        },
        {
          firstName: 'Ava',
          lastName: 'Anderson',
          email: 'ava.anderson@student.demoschool.edu',
          passwordHash: studentPassword,
          role: 'student',
          schoolId: demoSchool.id,
          dateOfBirth: new Date('2009-09-12'),
          isActive: true,
        },
      ])
      .returning()

    console.log('✅ Created demo students')

    // Create demo classes
    const demoClasses = await db
      .insert(classes)
      .values([
        {
          schoolId: demoSchool.id,
          teacherId: teachers[0].id,
          academicYearId: academicYear.id,
          name: 'Mathematics 5A',
          description: 'Fifth grade mathematics curriculum',
          gradeLevel: '5',
          capacity: 25,
          room: 'Room 101',
          schedule: 'Monday, Wednesday, Friday 9:00-10:00 AM',
        },
        {
          schoolId: demoSchool.id,
          teacherId: teachers[1].id,
          academicYearId: academicYear.id,
          name: 'Science 5A',
          description: 'Fifth grade science curriculum',
          gradeLevel: '5',
          capacity: 25,
          room: 'Room 102',
          schedule: 'Tuesday, Thursday 10:00-11:00 AM',
        },
        {
          schoolId: demoSchool.id,
          teacherId: teachers[2].id,
          academicYearId: academicYear.id,
          name: 'English 5A',
          description: 'Fifth grade English language arts',
          gradeLevel: '5',
          capacity: 25,
          room: 'Room 103',
          schedule: 'Monday, Tuesday, Wednesday, Thursday 11:00 AM-12:00 PM',
        },
      ])
      .returning()

    console.log('✅ Created demo classes')

    // Create demo parents
    const parentPassword = await bcrypt.hash('parent123!', 12)
    const parents = await db
      .insert(users)
      .values([
        {
          firstName: 'Michael',
          lastName: 'Davis',
          email: 'michael.davis@parent.demoschool.edu',
          passwordHash: parentPassword,
          role: 'parent',
          schoolId: demoSchool.id,
          phone: '+1 (555) 567-8901',
          isActive: true,
        },
        {
          firstName: 'Sarah',
          lastName: 'Wilson',
          email: 'sarah.wilson@parent.demoschool.edu',
          passwordHash: parentPassword,
          role: 'parent',
          schoolId: demoSchool.id,
          phone: '+1 (555) 678-9012',
          isActive: true,
        },
      ])
      .returning()

    console.log('✅ Created demo parents')

    console.log('\n🎉 Database seeding completed successfully!')
    console.log('\n📋 Demo Accounts Created:')
    console.log('┌─────────────────────────────────────────┐')
    console.log('│ Super Admin                             │')
    console.log('│ Email: superadmin@system.com            │')
    console.log('│ Password: admin123!                     │')
    console.log('├─────────────────────────────────────────┤')
    console.log('│ School Admin                            │')
    console.log('│ Email: admin@demoschool.edu             │')
    console.log('│ Password: admin123!                     │')
    console.log('├─────────────────────────────────────────┤')
    console.log('│ Teacher (Alice Johnson)                 │')
    console.log('│ Email: alice.johnson@demoschool.edu     │')
    console.log('│ Password: teacher123!                   │')
    console.log('├─────────────────────────────────────────┤')
    console.log('│ Student (Emma Davis)                    │')
    console.log('│ Email: emma.davis@student.demoschool.edu│')
    console.log('│ Password: student123!                   │')
    console.log('├─────────────────────────────────────────┤')
    console.log('│ Parent (Michael Davis)                  │')
    console.log('│ Email: michael.davis@parent.demoschool.edu│')
    console.log('│ Password: parent123!                    │')
    console.log('└─────────────────────────────────────────┘')

  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

if (require.main === module) {
  seed()
}