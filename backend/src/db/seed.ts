import bcrypt from 'bcryptjs'
import { db } from './index'
import { schools, users, classes, academicYears, enrollments } from './schema'

async function seed() {

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
        principalName: 'Dr. Sarah Principal',
        establishedYear: 2005,
      })
      .returning()

    console.log('✅ Created demo school')

    // Create academic year
    const currentYear = new Date().getFullYear()
    const [academicYear] = await db
      .insert(academicYears)
      .values({
        schoolId: demoSchool.id,
        year: `${currentYear}-${currentYear + 1}`, // Changed from 'name' to 'year'
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
          address: '456 Teacher Lane, Education City',
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
          address: '789 Educator Ave, Learning District',
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
          address: '321 Faculty Street, Academic Town',
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
          address: '123 Student Lane, Learning City',
          emergencyContact: 'Michael Davis',
          emergencyPhone: '+1 (555) 567-8901',
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
          address: '456 Pupil Drive, Education District',
          emergencyContact: 'Sarah Wilson',
          emergencyPhone: '+1 (555) 678-9012',
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
          address: '789 Learner Street, Academic City',
          emergencyContact: 'Robert Brown',
          emergencyPhone: '+1 (555) 789-0123',
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
          address: '321 Scholar Avenue, Study Town',
          emergencyContact: 'Jennifer Taylor',
          emergencyPhone: '+1 (555) 890-1234',
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
          address: '654 Achiever Road, Knowledge Heights',
          emergencyContact: 'David Anderson',
          emergencyPhone: '+1 (555) 901-2345',
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
          gradeLevel: 5, // Changed from string to integer
          capacity: 25,
          room: 'Room 101',
        },
        {
          schoolId: demoSchool.id,
          teacherId: teachers[1].id,
          academicYearId: academicYear.id,
          name: 'Science 5A',
          description: 'Fifth grade science curriculum',
          gradeLevel: 5, // Changed from string to integer
          capacity: 25,
          room: 'Room 102',
        },
        {
          schoolId: demoSchool.id,
          teacherId: teachers[2].id,
          academicYearId: academicYear.id,
          name: 'English 5A',
          description: 'Fifth grade English language arts',
          gradeLevel: 5, // Changed from string to integer
          capacity: 25,
          room: 'Room 103',
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
          address: '123 Student Lane, Learning City',
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
          address: '456 Pupil Drive, Education District',
          isActive: true,
        },
      ])
      .returning()

    console.log('✅ Created demo parents')

    // Create student enrollments in classes
    const enrollmentData = [
      // Enroll first 3 students in Math class
      { studentId: students[0].id, classId: demoClasses[0].id },
      { studentId: students[1].id, classId: demoClasses[0].id },
      { studentId: students[2].id, classId: demoClasses[0].id },
      // Enroll last 3 students in Science class
      { studentId: students[2].id, classId: demoClasses[1].id },
      { studentId: students[3].id, classId: demoClasses[1].id },
      { studentId: students[4].id, classId: demoClasses[1].id },
      // Enroll all students in English class
      { studentId: students[0].id, classId: demoClasses[2].id },
      { studentId: students[1].id, classId: demoClasses[2].id },
      { studentId: students[2].id, classId: demoClasses[2].id },
      { studentId: students[3].id, classId: demoClasses[2].id },
      { studentId: students[4].id, classId: demoClasses[2].id },
    ]

    await db.insert(enrollments).values(enrollmentData)
    console.log('✅ Created student enrollments')

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
  }
}

if (require.main === module) {
  seed()
}