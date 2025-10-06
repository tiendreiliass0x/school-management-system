import { pgTable, text, uuid, timestamp, integer, boolean, decimal, pgEnum, unique, index, bigint } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { relations } from 'drizzle-orm'
import { z } from 'zod'

export const userRoleEnum = pgEnum('user_role', ['super_admin', 'school_admin', 'teacher', 'student', 'parent'])
export const gradeStatusEnum = pgEnum('grade_status', ['draft', 'published'])
export const academicTermEnum = pgEnum('academic_term', ['fall', 'spring', 'summer', 'full_year'])
export const documentStatusEnum = pgEnum('document_status', ['pending', 'uploaded', 'failed'])

export const schools = pgTable('schools', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  address: text('address').notNull(),
  phone: text('phone'),
  email: text('email'),
  website: text('website'),
  description: text('description'),
  principalName: text('principal_name'),
  establishedYear: integer('established_year'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  nameIdx: index('schools_name_idx').on(table.name),
  emailIdx: unique('schools_email_unique').on(table.email),
  activeIdx: index('schools_active_idx').on(table.isActive),
}))

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  role: userRoleEnum('role').notNull(),
  studentNumber: text('student_number'),
  schoolId: uuid('school_id').references(() => schools.id),
  phone: text('phone'),
  dateOfBirth: timestamp('date_of_birth'),
  address: text('address'),
  emergencyContact: text('emergency_contact'),
  emergencyPhone: text('emergency_phone'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  emailIdx: unique('users_email_unique').on(table.email),
  studentNumberIdx: unique('users_student_number_unique').on(table.studentNumber),
  schoolRoleIdx: index('users_school_role_idx').on(table.schoolId, table.role),
  activeIdx: index('users_active_idx').on(table.isActive),
  nameIdx: index('users_name_idx').on(table.firstName, table.lastName),
}))

export const academicYears = pgTable('academic_years', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').notNull().references(() => schools.id),
  year: text('year').notNull(), // Changed from 'name' to 'year' to match migration
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  schoolActiveIdx: index('academic_years_school_active_idx').on(table.schoolId, table.isActive),
  schoolYearIdx: unique('academic_years_school_year_unique').on(table.schoolId, table.year), // Updated to use 'year'
}))

export const classes = pgTable('classes', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').notNull().references(() => schools.id),
  academicYearId: uuid('academic_year_id').notNull().references(() => academicYears.id),
  name: text('name').notNull(), // e.g., "Grade 5A", "Physics 101"
  subject: text('subject'),
  gradeLevel: integer('grade_level'), // Changed back to integer to match migration
  teacherId: uuid('teacher_id').references(() => users.id),
  room: text('room'),
  capacity: integer('capacity').default(25),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  schoolYearIdx: index('classes_school_year_idx').on(table.schoolId, table.academicYearId),
  teacherActiveIdx: index('classes_teacher_active_idx').on(table.teacherId, table.isActive),
  gradeIdx: index('classes_grade_idx').on(table.gradeLevel),
  schoolNameIdx: unique('classes_school_name_unique').on(table.schoolId, table.name, table.academicYearId),
}))

export const enrollments = pgTable('enrollments', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => users.id),
  classId: uuid('class_id').notNull().references(() => classes.id),
  enrollmentDate: timestamp('enrollment_date').defaultNow().notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  studentClassIdx: unique('enrollments_student_class_unique').on(table.studentId, table.classId),
  classActiveIdx: index('enrollments_class_active_idx').on(table.classId, table.isActive),
  studentActiveIdx: index('enrollments_student_active_idx').on(table.studentId, table.isActive),
}))

export const assignments = pgTable('assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  classId: uuid('class_id').notNull().references(() => classes.id),
  title: text('title').notNull(),
  description: text('description'),
  dueDate: timestamp('due_date'),
  maxPoints: decimal('max_points', { precision: 5, scale: 2 }).default('100.00').notNull(), // Changed back to decimal to match migration
  instructions: text('instructions'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  classActiveIdx: index('assignments_class_active_idx').on(table.classId, table.isActive),
  dueDateIdx: index('assignments_due_date_idx').on(table.dueDate),
  classTitleIdx: unique('assignments_class_title_unique').on(table.classId, table.title),
}))

export const grades = pgTable('grades', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => users.id),
  assignmentId: uuid('assignment_id').notNull().references(() => assignments.id),
  points: decimal('points', { precision: 5, scale: 2 }), // Changed back to decimal to match migration
  feedback: text('feedback'),
  status: gradeStatusEnum('status').default('draft').notNull(),
  gradedAt: timestamp('graded_at'),
  gradedBy: uuid('graded_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  studentAssignmentIdx: unique('grades_student_assignment_unique').on(table.studentId, table.assignmentId),
  assignmentStatusIdx: index('grades_assignment_status_idx').on(table.assignmentId, table.status),
  studentStatusIdx: index('grades_student_status_idx').on(table.studentId, table.status),
  graderIdx: index('grades_grader_idx').on(table.gradedBy),
}))

export const attendance = pgTable('attendance', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => users.id),
  classId: uuid('class_id').notNull().references(() => classes.id),
  date: timestamp('date').notNull(),
  isPresent: boolean('is_present').notNull(),
  notes: text('notes'),
  recordedBy: uuid('recorded_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  studentClassDateIdx: unique('attendance_student_class_date_unique').on(table.studentId, table.classId, table.date),
  classDateIdx: index('attendance_class_date_idx').on(table.classId, table.date),
  studentDateIdx: index('attendance_student_date_idx').on(table.studentId, table.date),
}))

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  isRevoked: boolean('is_revoked').default(false).notNull(),
  deviceInfo: text('device_info'), // User agent, IP, etc.
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  userActiveIdx: index('refresh_tokens_user_active_idx').on(table.userId, table.isRevoked),
  expiresAtIdx: index('refresh_tokens_expires_at_idx').on(table.expiresAt),
  tokenHashIdx: unique('refresh_tokens_token_hash_unique').on(table.tokenHash),
}))

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').notNull().references(() => schools.id),
  uploaderId: uuid('uploader_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  fileName: text('file_name').notNull(),
  contentType: text('content_type'),
  fileSize: bigint('file_size', { mode: 'number' }).notNull(),
  description: text('description'),
  s3Bucket: text('s3_bucket').notNull(),
  s3Key: text('s3_key').notNull(),
  status: documentStatusEnum('status').default('uploaded').notNull(),
  checksum: text('checksum'),
  metadata: text('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  schoolIdx: index('documents_school_idx').on(table.schoolId),
  uploaderIdx: index('documents_uploader_idx').on(table.uploaderId),
  statusIdx: index('documents_status_idx').on(table.status),
  s3KeyIdx: unique('documents_s3_key_unique').on(table.s3Key),
}))

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
  refreshTokens: many(refreshTokens),
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

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}))

export const documentsRelations = relations(documents, ({ one }) => ({
  school: one(schools, {
    fields: [documents.schoolId],
    references: [schools.id],
  }),
  uploader: one(users, {
    fields: [documents.uploaderId],
    references: [users.id],
  }),
}))

// Zod schemas for validation
export const insertSchoolSchema = createInsertSchema(schools)
export const selectSchoolSchema = createSelectSchema(schools)

export const insertUserSchema = createInsertSchema(users, {
  studentNumber: z.string().regex(/^\d{6}$/, 'Student ID must be a 6-digit number').optional().nullable(),
})
export const selectUserSchema = createSelectSchema(users, {
  studentNumber: z.string().regex(/^\d{6}$/).optional().nullable(),
})

export const insertAcademicYearSchema = createInsertSchema(academicYears)
export const selectAcademicYearSchema = createSelectSchema(academicYears)

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

export const insertRefreshTokenSchema = createInsertSchema(refreshTokens)
export const selectRefreshTokenSchema = createSelectSchema(refreshTokens)

export const insertDocumentSchema = createInsertSchema(documents, {
  fileSize: z.number().int().nonnegative(),
})
export const selectDocumentSchema = createSelectSchema(documents, {
  fileSize: z.number().int().nonnegative(),
})

// Type exports
export type School = typeof schools.$inferSelect
export type NewSchool = typeof schools.$inferInsert

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type AcademicYear = typeof academicYears.$inferSelect
export type NewAcademicYear = typeof academicYears.$inferInsert

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

export type RefreshToken = typeof refreshTokens.$inferSelect
export type NewRefreshToken = typeof refreshTokens.$inferInsert

export type Document = typeof documents.$inferSelect
export type NewDocument = typeof documents.$inferInsert
