import bcrypt from 'bcryptjs'
import { db } from './index'
import {
  schools,
  users,
  classes,
  academicYears,
  enrollments,
  trimesters,
  classTests,
  testResults,
  trimesterGrades,
} from './schema'

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

    // Create trimesters for the academic year
    const firstTrimesterStart = new Date(`${currentYear}-09-01`)
    const firstTrimesterEnd = new Date(`${currentYear}-11-30`)
    const secondTrimesterStart = new Date(`${currentYear}-12-01`)
    const secondTrimesterEnd = new Date(`${currentYear + 1}-02-28`)
    const thirdTrimesterStart = new Date(`${currentYear + 1}-03-01`)
    const thirdTrimesterEnd = new Date(`${currentYear + 1}-06-30`)

    const trimesterRecords = await db
      .insert(trimesters)
      .values([
        {
          academicYearId: academicYear.id,
          name: 'first',
          sequenceNumber: 1,
          startDate: firstTrimesterStart,
          endDate: firstTrimesterEnd,
        },
        {
          academicYearId: academicYear.id,
          name: 'second',
          sequenceNumber: 2,
          startDate: secondTrimesterStart,
          endDate: secondTrimesterEnd,
        },
        {
          academicYearId: academicYear.id,
          name: 'third',
          sequenceNumber: 3,
          startDate: thirdTrimesterStart,
          endDate: thirdTrimesterEnd,
        },
      ])
      .returning()

    console.log('✅ Created academic year trimesters')

    const firstTrimester = trimesterRecords.find(trimester => trimester.sequenceNumber === 1)!
    const secondTrimester = trimesterRecords.find(trimester => trimester.sequenceNumber === 2)!
    const thirdTrimester = trimesterRecords.find(trimester => trimester.sequenceNumber === 3)!

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
          studentNumber: '100001',
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
          studentNumber: '100002',
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
          studentNumber: '100003',
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
          studentNumber: '100004',
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
          studentNumber: '100005',
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
          trimesterId: firstTrimester.id,
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
          trimesterId: secondTrimester.id,
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
          trimesterId: thirdTrimester.id,
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

    // Create class tests for each trimester
    const mathTests = await db
      .insert(classTests)
      .values([
        {
          classId: demoClasses[0].id,
          trimesterId: firstTrimester.id,
          title: 'Mathematics - Trimester 1 Midterm',
          testDate: new Date(`${currentYear}-10-15`),
          weight: '0.40',
          maxScore: '100.00',
          description: 'Midterm assessment covering algebra and fractions',
        },
        {
          classId: demoClasses[0].id,
          trimesterId: firstTrimester.id,
          title: 'Mathematics - Trimester 1 Final',
          testDate: new Date(`${currentYear}-11-25`),
          weight: '0.60',
          maxScore: '100.00',
          description: 'Comprehensive trimester assessment',
        },
      ])
      .returning()

    const scienceTests = await db
      .insert(classTests)
      .values([
        {
          classId: demoClasses[1].id,
          trimesterId: secondTrimester.id,
          title: 'Science - Trimester 2 Lab Practical',
          testDate: new Date(`${currentYear + 1}-01-10`),
          weight: '0.30',
          maxScore: '100.00',
          description: 'Hands-on lab assessment for ecosystems unit',
        },
        {
          classId: demoClasses[1].id,
          trimesterId: secondTrimester.id,
          title: 'Science - Trimester 2 Research Project',
          testDate: new Date(`${currentYear + 1}-02-05`),
          weight: '0.30',
          maxScore: '100.00',
          description: 'Written project on renewable energy sources',
        },
        {
          classId: demoClasses[1].id,
          trimesterId: secondTrimester.id,
          title: 'Science - Trimester 2 Cumulative Exam',
          testDate: new Date(`${currentYear + 1}-02-25`),
          weight: '0.40',
          maxScore: '100.00',
          description: 'Exam covering all trimester content',
        },
      ])
      .returning()

    const englishTests = await db
      .insert(classTests)
      .values([
        {
          classId: demoClasses[2].id,
          trimesterId: thirdTrimester.id,
          title: 'English - Trimester 3 Literary Analysis',
          testDate: new Date(`${currentYear + 1}-04-10`),
          weight: '0.50',
          maxScore: '100.00',
          description: 'Essay analyzing assigned novel themes',
        },
        {
          classId: demoClasses[2].id,
          trimesterId: thirdTrimester.id,
          title: 'English - Trimester 3 Oral Presentation',
          testDate: new Date(`${currentYear + 1}-05-20`),
          weight: '0.50',
          maxScore: '100.00',
          description: 'Presentation evaluating persuasive speaking skills',
        },
      ])
      .returning()

    console.log('✅ Created class tests')

    // Helper to insert test results for a class
    const insertTestResults = async (options: {
      testIds: string[]
      scoresByStudent: { studentId: string; scores: number[] }[]
      teacherId: string
    }) => {
      const { testIds, scoresByStudent, teacherId } = options
      const now = new Date()
      const rows = scoresByStudent.flatMap(({ studentId, scores }) =>
        scores.map((score, index) => ({
          testId: testIds[index],
          studentId,
          score: score.toFixed(2),
          gradedAt: now,
          gradedBy: teacherId,
          feedback: 'Recorded during trimester assessment period',
        }))
      )
      if (rows.length > 0) {
        await db.insert(testResults).values(rows)
      }
    }

    await insertTestResults({
      testIds: mathTests.map(test => test.id),
      scoresByStudent: [
        { studentId: students[0].id, scores: [85, 90] },
        { studentId: students[1].id, scores: [78, 82] },
        { studentId: students[2].id, scores: [92, 95] },
      ],
      teacherId: teachers[0].id,
    })

    await insertTestResults({
      testIds: scienceTests.map(test => test.id),
      scoresByStudent: [
        { studentId: students[2].id, scores: [88, 90, 94] },
        { studentId: students[3].id, scores: [82, 85, 80] },
        { studentId: students[4].id, scores: [90, 87, 92] },
      ],
      teacherId: teachers[1].id,
    })

    await insertTestResults({
      testIds: englishTests.map(test => test.id),
      scoresByStudent: [
        { studentId: students[0].id, scores: [93, 95] },
        { studentId: students[1].id, scores: [85, 88] },
        { studentId: students[2].id, scores: [91, 90] },
        { studentId: students[3].id, scores: [87, 89] },
        { studentId: students[4].id, scores: [95, 96] },
      ],
      teacherId: teachers[2].id,
    })

    console.log('✅ Recorded test results')

    const calculateTrimesterGrades = (
      classId: string,
      trimesterId: string,
      teacherId: string,
      weightings: number[],
      studentScores: { studentId: string; scores: number[] }[],
    ) => {
      const totalWeight = weightings.reduce((sum, weight) => sum + weight, 0)
      const now = new Date()
      return studentScores.map(({ studentId, scores }) => {
        const weightedScore = scores.reduce((sum, score, index) => sum + score * weightings[index], 0)
        const normalized = weightedScore / totalWeight
        return {
          studentId,
          classId,
          trimesterId,
          finalGrade: normalized.toFixed(2),
          calculatedAt: now,
          calculatedBy: teacherId,
          calculationMethod: 'weighted_average',
          notes: 'Calculated from recorded class tests',
        }
      })
    }

    const mathTrimesterGrades = calculateTrimesterGrades(
      demoClasses[0].id,
      firstTrimester.id,
      teachers[0].id,
      [0.4, 0.6],
      [
        { studentId: students[0].id, scores: [85, 90] },
        { studentId: students[1].id, scores: [78, 82] },
        { studentId: students[2].id, scores: [92, 95] },
      ]
    )

    const scienceTrimesterGrades = calculateTrimesterGrades(
      demoClasses[1].id,
      secondTrimester.id,
      teachers[1].id,
      [0.3, 0.3, 0.4],
      [
        { studentId: students[2].id, scores: [88, 90, 94] },
        { studentId: students[3].id, scores: [82, 85, 80] },
        { studentId: students[4].id, scores: [90, 87, 92] },
      ]
    )

    const englishTrimesterGrades = calculateTrimesterGrades(
      demoClasses[2].id,
      thirdTrimester.id,
      teachers[2].id,
      [0.5, 0.5],
      [
        { studentId: students[0].id, scores: [93, 95] },
        { studentId: students[1].id, scores: [85, 88] },
        { studentId: students[2].id, scores: [91, 90] },
        { studentId: students[3].id, scores: [87, 89] },
        { studentId: students[4].id, scores: [95, 96] },
      ]
    )

    await db
      .insert(trimesterGrades)
      .values([...mathTrimesterGrades, ...scienceTrimesterGrades, ...englishTrimesterGrades])

    console.log('✅ Stored final trimester grades')

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