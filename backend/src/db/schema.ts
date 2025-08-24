import { pgTable, text, uuid, timestamp, integer, boolean, decimal, pgEnum } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { relations } from 'drizzle-orm'

export const userRoleEnum = pgEnum('user_role', ['super_admin', 'school_admin', 'teacher', 'student', 'parent'])
export const gradeStatusEnum = pgEnum('grade_status', ['draft', 'published'])
export const academicTermEnum = pgEnum('academic_term', ['fall', 'spring', 'summer', 'full_year'])

export const schools = pgTable('schools', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  address: text('address'),
  phone: text('phone'),
  email: text('email'),
  website: text('website'),
  principalName: text('principal_name'),
  establishedYear: integer('established_year'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
})

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  role: userRoleEnum('role').notNull(),
  schoolId: uuid('school_id').references(() => schools.id),
  phone: text('phone'),
  dateOfBirth: timestamp('date_of_birth'),
  address: text('address'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
})

export const academicYears = pgTable('academic_years', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').notNull().references(() => schools.id),
  year: text('year').notNull(), // e.g., "2024-2025"
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
})

export const classes = pgTable('classes', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').notNull().references(() => schools.id),
  academicYearId: uuid('academic_year_id').notNull().references(() => academicYears.id),
  name: text('name').notNull(), // e.g., "Grade 5A", "Physics 101"
  subject: text('subject'),
  gradeLevel: integer('grade_level'),
  teacherId: uuid('teacher_id').references(() => users.id),
  room: text('room'),
  capacity: integer('capacity'),
  description: text('description'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
})

export const enrollments = pgTable('enrollments', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => users.id),
  classId: uuid('class_id').notNull().references(() => classes.id),
  enrollmentDate: timestamp('enrollment_date').defaultNow(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
})

export const assignments = pgTable('assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  classId: uuid('class_id').notNull().references(() => classes.id),
  title: text('title').notNull(),
  description: text('description'),
  dueDate: timestamp('due_date'),
  maxPoints: decimal('max_points', { precision: 5, scale: 2 }),
  instructions: text('instructions'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
})

export const grades = pgTable('grades', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => users.id),
  assignmentId: uuid('assignment_id').notNull().references(() => assignments.id),
  points: decimal('points', { precision: 5, scale: 2 }),
  feedback: text('feedback'),
  status: gradeStatusEnum('status').default('draft'),
  gradedAt: timestamp('graded_at'),
  gradedBy: uuid('graded_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
})

export const attendance = pgTable('attendance', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => users.id),
  classId: uuid('class_id').notNull().references(() => classes.id),
  date: timestamp('date').notNull(),
  isPresent: boolean('is_present').notNull(),
  notes: text('notes'),
  recordedBy: uuid('recorded_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
})

// Relations
export const schoolsRelations = relations(schools, ({ many }) => ({
  users: many(users),
  academicYears: many(academicYears),
  classes: many(classes),
}))

export const usersRelations = relations(users, ({ one, many }) => ({
  school: one(schools, {
    fields: [users.schoolId],
    references: [schools.id],
  }),
  enrollments: many(enrollments),
  grades: many(grades),
  attendance: many(attendance),
  teachingClasses: many(classes, { relationName: 'teacher' }),
  gradedAssignments: many(grades, { relationName: 'grader' }),
}))

export const academicYearsRelations = relations(academicYears, ({ one, many }) => ({
  school: one(schools, {
    fields: [academicYears.schoolId],
    references: [schools.id],
  }),
  classes: many(classes),
}))

export const classesRelations = relations(classes, ({ one, many }) => ({
  school: one(schools, {
    fields: [classes.schoolId],
    references: [schools.id],
  }),
  academicYear: one(academicYears, {
    fields: [classes.academicYearId],
    references: [academicYears.id],
  }),
  teacher: one(users, {
    fields: [classes.teacherId],
    references: [users.id],
  }),
  enrollments: many(enrollments),
  assignments: many(assignments),
  attendance: many(attendance),
}))

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  student: one(users, {
    fields: [enrollments.studentId],
    references: [users.id],
  }),
  class: one(classes, {
    fields: [enrollments.classId],
    references: [classes.id],
  }),
}))

export const assignmentsRelations = relations(assignments, ({ one, many }) => ({
  class: one(classes, {
    fields: [assignments.classId],
    references: [classes.id],
  }),
  grades: many(grades),
}))

export const gradesRelations = relations(grades, ({ one }) => ({
  student: one(users, {
    fields: [grades.studentId],
    references: [users.id],
  }),
  assignment: one(assignments, {
    fields: [grades.assignmentId],
    references: [assignments.id],
  }),
  grader: one(users, {
    fields: [grades.gradedBy],
    references: [users.id],
  }),
}))

export const attendanceRelations = relations(attendance, ({ one }) => ({
  student: one(users, {
    fields: [attendance.studentId],
    references: [users.id],
  }),
  class: one(classes, {
    fields: [attendance.classId],
    references: [classes.id],
  }),
  recorder: one(users, {
    fields: [attendance.recordedBy],
    references: [users.id],
  }),
}))

// Zod schemas for validation
export const insertSchoolSchema = createInsertSchema(schools)
export const selectSchoolSchema = createSelectSchema(schools)

export const insertUserSchema = createInsertSchema(users)
export const selectUserSchema = createSelectSchema(users)

export const insertClassSchema = createInsertSchema(classes)
export const selectClassSchema = createSelectSchema(classes)

export const insertEnrollmentSchema = createInsertSchema(enrollments)
export const selectEnrollmentSchema = createSelectSchema(enrollments)

export const insertAssignmentSchema = createInsertSchema(assignments)
export const selectAssignmentSchema = createSelectSchema(assignments)

export const insertGradeSchema = createInsertSchema(grades)
export const selectGradeSchema = createSelectSchema(grades)

export const insertAttendanceSchema = createInsertSchema(attendance)
export const selectAttendanceSchema = createSelectSchema(attendance)

export type School = typeof schools.$inferSelect
export type NewSchool = typeof schools.$inferInsert

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type Class = typeof classes.$inferSelect
export type NewClass = typeof classes.$inferInsert

export type Enrollment = typeof enrollments.$inferSelect
export type NewEnrollment = typeof enrollments.$inferInsert

export type Assignment = typeof assignments.$inferSelect
export type NewAssignment = typeof assignments.$inferInsert

export type Grade = typeof grades.$inferSelect
export type NewGrade = typeof grades.$inferInsert

export type Attendance = typeof attendance.$inferSelect
export type NewAttendance = typeof attendance.$inferInsert