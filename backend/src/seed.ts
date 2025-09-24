import { db } from './db/index'
import { schools, users, academicYears } from './db/schema'
import { hashPassword } from './lib/auth'

async function seed() {
  try {
    console.log('🌱 Starting database seed...')

    // Create a sample school
    const [school] = await db.insert(schools).values({
      name: 'Demo Elementary School',
      address: '123 Education Street, Learning City, LC 12345',
      phone: '+1-555-0123',
      email: 'info@demo-elementary.edu',
      website: 'https://demo-elementary.edu',
      principalName: 'Dr. Jane Principal',
      establishedYear: 2010,
      isActive: true,
    }).returning()

    console.log('✅ Created school:', school.name)

    // Hash passwords for demo users
    const passwordHash = await hashPassword('password')

    // Create Super Admin
    const [superAdmin] = await db.insert(users).values({
      email: 'admin@school.com',
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'super_admin',
      isActive: true,
    }).returning()

    console.log('✅ Created Super Admin:', superAdmin.email)

    // Create School Admin
    const [schoolAdmin] = await db.insert(users).values({
      email: 'schooladmin@demo-elementary.edu',
      passwordHash,
      firstName: 'School',
      lastName: 'Administrator',
      role: 'school_admin',
      schoolId: school.id,
      phone: '+1-555-0124',
      isActive: true,
    }).returning()

    console.log('✅ Created School Admin:', schoolAdmin.email)

    // Create a Teacher
    const [teacher] = await db.insert(users).values({
      email: 'teacher@demo-elementary.edu',
      passwordHash,
      firstName: 'John',
      lastName: 'Teacher',
      role: 'teacher',
      schoolId: school.id,
      phone: '+1-555-0125',
      isActive: true,
    }).returning()

    console.log('✅ Created Teacher:', teacher.email)

    // Create a Student
    const [student] = await db.insert(users).values({
      email: 'student@demo-elementary.edu',
      passwordHash,
      firstName: 'Alice',
      lastName: 'Student',
      role: 'student',
      schoolId: school.id,
      dateOfBirth: new Date('2012-05-15'),
      isActive: true,
    }).returning()

    console.log('✅ Created Student:', student.email)

    // Create a Parent
    const [parent] = await db.insert(users).values({
      email: 'parent@demo-elementary.edu',
      passwordHash,
      firstName: 'Bob',
      lastName: 'Parent',
      role: 'parent',
      schoolId: school.id,
      phone: '+1-555-0126',
      isActive: true,
    }).returning()

    console.log('✅ Created Parent:', parent.email)

    // Create current academic year
    const [academicYear] = await db.insert(academicYears).values({
      schoolId: school.id,
      year: '2024-2025',
      startDate: new Date('2024-08-15'),
      endDate: new Date('2025-06-15'),
      isActive: true,
    }).returning()

    console.log('✅ Created Academic Year:', academicYear.year)

    console.log('\n🎉 Database seeded successfully!')
    console.log('\n📋 Demo Accounts:')
    console.log('Super Admin: admin@school.com / password')
    console.log('School Admin: schooladmin@demo-elementary.edu / password')
    console.log('Teacher: teacher@demo-elementary.edu / password')
    console.log('Student: student@demo-elementary.edu / password')
    console.log('Parent: parent@demo-elementary.edu / password')
    console.log('\n🏫 Demo School: Demo Elementary School')

  } catch (error) {
    console.error('❌ Error seeding database:', error)
  }

  process.exit(0)
}

seed()