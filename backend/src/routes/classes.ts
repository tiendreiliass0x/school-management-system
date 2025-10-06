import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, and, or, ilike, count } from 'drizzle-orm'
import { db } from '../db'
import { classes, users, enrollments, insertClassSchema, academicYears } from '../db/schema'
import { authMiddleware, requireRole, requireSchoolAccess } from '../middleware/auth'

const classesRouter = new Hono()

const createClassSchema = insertClassSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

const updateClassSchema = createClassSchema.partial()

const querySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  search: z.string().optional(),
  teacherId: z.string().optional(),
  gradeLevel: z.string().optional(),
  academicYearId: z.string().optional(),
})

// Get classes with pagination and filtering
classesRouter.get('/', authMiddleware, requireSchoolAccess, zValidator('query', querySchema), async (c) => {
  try {
    const { page, limit, search, teacherId, gradeLevel, academicYearId } = c.req.valid('query')
    const currentUser = c.get('user')
    
    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const offset = (pageNum - 1) * limitNum

    const conditions: Parameters<typeof and> = []

    const baseQuery = db.select({
      id: classes.id,
      schoolId: classes.schoolId,
      academicYearId: classes.academicYearId,
      name: classes.name,
      subject: classes.subject,
      gradeLevel: classes.gradeLevel,
      teacherId: classes.teacherId,
      room: classes.room,
      capacity: classes.capacity,
      description: classes.description,
      isActive: classes.isActive,
      createdAt: classes.createdAt,
      updatedAt: classes.updatedAt,
      teacherName: users.firstName,
      teacherLastName: users.lastName,
    }).from(classes).leftJoin(users, eq(classes.teacherId, users.id))
    
    // School filter
    if (currentUser.role !== 'super_admin') {
      conditions.push(eq(classes.schoolId, currentUser.schoolId!))
    }

    if (search) {
      conditions.push(
        or(
          ilike(classes.name, `%${search}%`),
          ilike(classes.subject, `%${search}%`),
          ilike(classes.room, `%${search}%`)
        )
      )
    }

    if (teacherId) conditions.push(eq(classes.teacherId, teacherId))
    if (gradeLevel) {
      const parsedGradeLevel = Number.parseInt(gradeLevel, 10)
      if (!Number.isNaN(parsedGradeLevel)) {
        conditions.push(eq(classes.gradeLevel, parsedGradeLevel))
      }
    }
    if (academicYearId) conditions.push(eq(classes.academicYearId, academicYearId))

    const filters = conditions.length > 0 ? and(...conditions) : undefined

    const classListQuery = filters ? baseQuery.where(filters) : baseQuery

    const classList = await classListQuery.offset(offset).limit(limitNum).orderBy(classes.name)

    // Get total count
    const countBaseQuery = db
      .select({ count: count() })
      .from(classes)
      .leftJoin(users, eq(classes.teacherId, users.id))
    const countQuery = filters ? countBaseQuery.where(filters) : countBaseQuery
    const [{ count: total }] = await countQuery

    return c.json({
      classes: classList,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    })
  } catch (error) {
    console.error('Get classes error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get class by ID with enrollments
classesRouter.get('/:id', authMiddleware, async (c) => {
  try {
    const classId = c.req.param('id')
    const currentUser = c.get('user')

    const classData = await db.select({
      id: classes.id,
      schoolId: classes.schoolId,
      academicYearId: classes.academicYearId,
      name: classes.name,
      subject: classes.subject,
      gradeLevel: classes.gradeLevel,
      teacherId: classes.teacherId,
      room: classes.room,
      capacity: classes.capacity,
      description: classes.description,
      isActive: classes.isActive,
      createdAt: classes.createdAt,
      updatedAt: classes.updatedAt,
      teacherName: users.firstName,
      teacherLastName: users.lastName,
      teacherEmail: users.email,
    }).from(classes)
      .leftJoin(users, eq(classes.teacherId, users.id))
      .where(eq(classes.id, classId))
      .limit(1)

    if (!classData.length) {
      return c.json({ error: 'Class not found' }, 404)
    }

    const classInfo = classData[0]

    // Check permissions
    if (currentUser.role !== 'super_admin' && currentUser.schoolId !== classInfo.schoolId) {
      return c.json({ error: 'Access denied' }, 403)
    }

    // Get enrolled students
    const enrolledStudents = await db.select({
      enrollmentId: enrollments.id,
      studentId: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      studentNumber: users.studentNumber,
      enrollmentDate: enrollments.enrollmentDate,
      isActive: enrollments.isActive,
    }).from(enrollments)
      .innerJoin(users, eq(enrollments.studentId, users.id))
      .where(and(eq(enrollments.classId, classId), eq(enrollments.isActive, true)))
      .orderBy(users.lastName, users.firstName)

    return c.json({
      class: classInfo,
      students: enrolledStudents
    })
  } catch (error) {
    console.error('Get class error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Create class
classesRouter.post('/', authMiddleware, zValidator('json', createClassSchema), async (c) => {
  try {
    const classData = c.req.valid('json')
    const currentUser = c.get('user')

    // Permission check
    if (currentUser.role !== 'super_admin' && currentUser.role !== 'school_admin') {
      return c.json({ error: 'Insufficient permissions' }, 403)
    }

    // School admin can only create classes for their school
    if (currentUser.role === 'school_admin') {
      if (classData.schoolId !== currentUser.schoolId) {
        return c.json({ error: 'Can only create classes for your school' }, 403)
      }
    }

    // Verify teacher belongs to the same school
    if (classData.teacherId) {
      const teacher = await db.select().from(users)
        .where(and(eq(users.id, classData.teacherId), eq(users.role, 'teacher')))
        .limit(1)

      if (!teacher.length || teacher[0].schoolId !== classData.schoolId) {
        return c.json({ error: 'Teacher not found or not in the same school' }, 400)
      }
    }

    const newClass = await db.insert(classes).values(classData).returning()

    return c.json({
      message: 'Class created successfully',
      class: newClass[0],
    }, 201)
  } catch (error) {
    console.error('Create class error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Update class
classesRouter.put('/:id', authMiddleware, zValidator('json', updateClassSchema), async (c) => {
  try {
    const classId = c.req.param('id')
    const classData = c.req.valid('json')
    const currentUser = c.get('user')

    // Check if class exists
    const existingClass = await db.select().from(classes).where(eq(classes.id, classId)).limit(1)
    if (!existingClass.length) {
      return c.json({ error: 'Class not found' }, 404)
    }

    const targetClass = existingClass[0]

    // Permission check
    const canEdit = currentUser.role === 'super_admin' || 
                   (currentUser.role === 'school_admin' && currentUser.schoolId === targetClass.schoolId) ||
                   (currentUser.role === 'teacher' && currentUser.id === targetClass.teacherId)

    if (!canEdit) {
      return c.json({ error: 'Access denied' }, 403)
    }

    // Teachers can only edit limited fields
    if (currentUser.role === 'teacher') {
      const allowedFields = ['description', 'room']
      const hasDisallowedField = Object.keys(classData).some(key => !allowedFields.includes(key))
      
      if (hasDisallowedField) {
        return c.json({ error: 'Teachers can only update description and room' }, 403)
      }
    }

    // Verify new teacher belongs to the same school if changing teacher
    if (classData.teacherId) {
      const teacher = await db.select().from(users)
        .where(and(eq(users.id, classData.teacherId), eq(users.role, 'teacher')))
        .limit(1)

      if (!teacher.length || teacher[0].schoolId !== targetClass.schoolId) {
        return c.json({ error: 'Teacher not found or not in the same school' }, 400)
      }
    }

    const updatedClass = await db.update(classes)
      .set({ ...classData, updatedAt: new Date() })
      .where(eq(classes.id, classId))
      .returning()

    return c.json({
      message: 'Class updated successfully',
      class: updatedClass[0],
    })
  } catch (error) {
    console.error('Update class error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Delete class
classesRouter.delete('/:id', authMiddleware, async (c) => {
  try {
    const classId = c.req.param('id')
    const currentUser = c.get('user')

    // Check if class exists
    const existingClass = await db.select().from(classes).where(eq(classes.id, classId)).limit(1)
    if (!existingClass.length) {
      return c.json({ error: 'Class not found' }, 404)
    }

    const targetClass = existingClass[0]

    // Permission check
    const canDelete = currentUser.role === 'super_admin' || 
                     (currentUser.role === 'school_admin' && currentUser.schoolId === targetClass.schoolId)

    if (!canDelete) {
      return c.json({ error: 'Access denied' }, 403)
    }

    // Check for active enrollments
    const activeEnrollments = await db.select().from(enrollments)
      .where(and(eq(enrollments.classId, classId), eq(enrollments.isActive, true)))
      .limit(1)

    if (activeEnrollments.length) {
      return c.json({ 
        error: 'Cannot delete class with active enrollments. Remove students first.' 
      }, 400)
    }

    await db.update(classes)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(classes.id, classId))

    return c.json({ message: 'Class deleted successfully' })
  } catch (error) {
    console.error('Delete class error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Enroll student in class
classesRouter.post('/:id/enroll', authMiddleware, zValidator('json', z.object({
  studentId: z.string(),
})), async (c) => {
  try {
    const classId = c.req.param('id')
    const { studentId } = c.req.valid('json')
    const currentUser = c.get('user')

    // Check if class exists
    const existingClass = await db.select().from(classes).where(eq(classes.id, classId)).limit(1)
    if (!existingClass.length) {
      return c.json({ error: 'Class not found' }, 404)
    }

    const targetClass = existingClass[0]

    // Permission check
    const canEnroll = currentUser.role === 'super_admin' || 
                     (currentUser.role === 'school_admin' && currentUser.schoolId === targetClass.schoolId) ||
                     (currentUser.role === 'teacher' && currentUser.id === targetClass.teacherId)

    if (!canEnroll) {
      return c.json({ error: 'Access denied' }, 403)
    }

    // Check if student exists and belongs to the same school
    const student = await db.select().from(users)
      .where(and(eq(users.id, studentId), eq(users.role, 'student')))
      .limit(1)

    if (!student.length || student[0].schoolId !== targetClass.schoolId) {
      return c.json({ error: 'Student not found or not in the same school' }, 400)
    }

    // Check if already enrolled
    const existingEnrollment = await db.select().from(enrollments)
      .where(and(eq(enrollments.classId, classId), eq(enrollments.studentId, studentId), eq(enrollments.isActive, true)))
      .limit(1)

    if (existingEnrollment.length) {
      return c.json({ error: 'Student already enrolled in this class' }, 409)
    }

    // Check capacity
    if (targetClass.capacity) {
      const currentEnrollments = await db.select({ count: count() }).from(enrollments)
        .where(and(eq(enrollments.classId, classId), eq(enrollments.isActive, true)))

      if (currentEnrollments[0].count >= targetClass.capacity) {
        return c.json({ error: 'Class is at full capacity' }, 400)
      }
    }

    const enrollment = await db.insert(enrollments).values({
      classId,
      studentId,
    }).returning()

    return c.json({
      message: 'Student enrolled successfully',
      enrollment: enrollment[0],
    }, 201)
  } catch (error) {
    console.error('Enroll student error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Unenroll student from class
classesRouter.delete('/:id/enroll/:studentId', authMiddleware, async (c) => {
  try {
    const classId = c.req.param('id')
    const studentId = c.req.param('studentId')
    const currentUser = c.get('user')

    // Check if class exists
    const existingClass = await db.select().from(classes).where(eq(classes.id, classId)).limit(1)
    if (!existingClass.length) {
      return c.json({ error: 'Class not found' }, 404)
    }

    const targetClass = existingClass[0]

    // Permission check
    const canUnenroll = currentUser.role === 'super_admin' || 
                       (currentUser.role === 'school_admin' && currentUser.schoolId === targetClass.schoolId) ||
                       (currentUser.role === 'teacher' && currentUser.id === targetClass.teacherId)

    if (!canUnenroll) {
      return c.json({ error: 'Access denied' }, 403)
    }

    // Check if enrollment exists
    const existingEnrollment = await db.select().from(enrollments)
      .where(and(eq(enrollments.classId, classId), eq(enrollments.studentId, studentId), eq(enrollments.isActive, true)))
      .limit(1)

    if (!existingEnrollment.length) {
      return c.json({ error: 'Enrollment not found' }, 404)
    }

    await db.update(enrollments)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(enrollments.classId, classId), eq(enrollments.studentId, studentId)))

    return c.json({ message: 'Student unenrolled successfully' })
  } catch (error) {
    console.error('Unenroll student error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default classesRouter