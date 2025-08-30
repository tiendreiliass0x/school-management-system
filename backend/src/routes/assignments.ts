import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, and, or, count } from 'drizzle-orm'
import { db } from '../db'
import { assignments, classes, users, grades, insertAssignmentSchema } from '../db/schema'
import { authMiddleware, requireRole, requireSchoolAccess } from '../middleware/auth'

const assignmentsRouter = new Hono()

const createAssignmentSchema = insertAssignmentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  dueDate: z.union([z.string(), z.date(), z.null()]).optional().nullable()
})

const updateAssignmentSchema = createAssignmentSchema.partial()

const querySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  classId: z.string().optional(),
})

// Get assignments with pagination and filtering
assignmentsRouter.get('/', authMiddleware, requireSchoolAccess, zValidator('query', querySchema), async (c) => {
  try {
    const { page, limit, classId } = c.req.valid('query')
    const currentUser = c.get('user')
    
    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const offset = (pageNum - 1) * limitNum

    let query = db.select({
      id: assignments.id,
      classId: assignments.classId,
      title: assignments.title,
      description: assignments.description,
      dueDate: assignments.dueDate,
      maxPoints: assignments.maxPoints,
      instructions: assignments.instructions,
      isActive: assignments.isActive,
      createdAt: assignments.createdAt,
      updatedAt: assignments.updatedAt,
      className: classes.name,
      teacherName: users.firstName,
      teacherLastName: users.lastName,
    }).from(assignments)
      .leftJoin(classes, eq(assignments.classId, classes.id))
      .leftJoin(users, eq(classes.teacherId, users.id))

    let conditions = []
    
    // Filter by school access
    if (currentUser.role !== 'super_admin') {
      // For non-super admins, only show assignments from their school's classes
      conditions.push(eq(classes.schoolId, currentUser.schoolId!))
    }

    // Filter by teacher's classes if user is a teacher
    if (currentUser.role === 'teacher') {
      conditions.push(eq(classes.teacherId, currentUser.id))
    }

    if (classId) conditions.push(eq(assignments.classId, classId))

    if (conditions.length > 0) {
      query = query.where(and(...conditions))
    }

    const assignmentsList = await query.offset(offset).limit(limitNum).orderBy(assignments.createdAt)

    // Get total count
    let countQuery = db.select({ count: count() }).from(assignments)
      .leftJoin(classes, eq(assignments.classId, classes.id))
    
    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions))
    }
    const [{ count: total }] = await countQuery

    return c.json({
      assignments: assignmentsList,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    })
  } catch (error) {
    console.error('Get assignments error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get assignment by ID with grades
assignmentsRouter.get('/:id', authMiddleware, async (c) => {
  try {
    const assignmentId = c.req.param('id')
    const currentUser = c.get('user')

    const assignment = await db.select({
      id: assignments.id,
      classId: assignments.classId,
      title: assignments.title,
      description: assignments.description,
      dueDate: assignments.dueDate,
      maxPoints: assignments.maxPoints,
      instructions: assignments.instructions,
      isActive: assignments.isActive,
      createdAt: assignments.createdAt,
      updatedAt: assignments.updatedAt,
      className: classes.name,
      schoolId: classes.schoolId,
      teacherId: classes.teacherId,
    }).from(assignments)
      .leftJoin(classes, eq(assignments.classId, classes.id))
      .where(eq(assignments.id, assignmentId))
      .limit(1)

    if (!assignment.length) {
      return c.json({ error: 'Assignment not found' }, 404)
    }

    const assignmentInfo = assignment[0]

    // Check permissions
    if (currentUser.role !== 'super_admin' && 
        currentUser.schoolId !== assignmentInfo.schoolId) {
      return c.json({ error: 'Access denied' }, 403)
    }

    // Get grades for this assignment (if teacher or admin)
    let gradesData = []
    if (currentUser.role === 'teacher' || 
        currentUser.role === 'school_admin' || 
        currentUser.role === 'super_admin') {
      
      gradesData = await db.select({
        gradeId: grades.id,
        studentId: users.id,
        studentName: users.firstName,
        studentLastName: users.lastName,
        points: grades.points,
        feedback: grades.feedback,
        status: grades.status,
        gradedAt: grades.gradedAt,
      }).from(grades)
        .innerJoin(users, eq(grades.studentId, users.id))
        .where(eq(grades.assignmentId, assignmentId))
        .orderBy(users.lastName, users.firstName)
    }

    return c.json({
      assignment: assignmentInfo,
      grades: gradesData
    })
  } catch (error) {
    console.error('Get assignment error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Create assignment
assignmentsRouter.post('/', authMiddleware, async (c) => {
  try {
    const rawBody = await c.req.json()
    
    const result = createAssignmentSchema.safeParse(rawBody)
    if (!result.success) {
      console.log('Assignment validation errors:', result.error.issues)
      return c.json({ 
        error: 'Validation failed', 
        details: result.error.issues 
      }, 400)
    }
    
    const assignmentData = result.data
    const currentUser = c.get('user')

    // Check if class exists and user has permission
    const classInfo = await db.select().from(classes).where(eq(classes.id, assignmentData.classId)).limit(1)
    
    if (!classInfo.length) {
      return c.json({ error: 'Class not found' }, 404)
    }

    const targetClass = classInfo[0]

    // Permission check
    const canCreate = currentUser.role === 'super_admin' || 
                     (currentUser.role === 'school_admin' && currentUser.schoolId === targetClass.schoolId) ||
                     (currentUser.role === 'teacher' && currentUser.id === targetClass.teacherId)

    if (!canCreate) {
      return c.json({ error: 'Access denied' }, 403)
    }

    // Transform dueDate if it's a string
    const processedData = {
      ...assignmentData,
      dueDate: assignmentData.dueDate instanceof Date ? assignmentData.dueDate : 
               assignmentData.dueDate ? new Date(assignmentData.dueDate) : null,
    }

    const newAssignment = await db.insert(assignments).values(processedData).returning()

    return c.json({
      message: 'Assignment created successfully',
      assignment: newAssignment[0],
    }, 201)
  } catch (error) {
    console.error('Create assignment error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Update assignment
assignmentsRouter.put('/:id', authMiddleware, async (c) => {
  try {
    const assignmentId = c.req.param('id')
    const rawBody = await c.req.json()
    
    const result = updateAssignmentSchema.safeParse(rawBody)
    if (!result.success) {
      return c.json({ 
        error: 'Validation failed', 
        details: result.error.issues 
      }, 400)
    }
    
    const assignmentData = result.data
    const currentUser = c.get('user')

    // Check if assignment exists
    const existingAssignment = await db.select({
      id: assignments.id,
      classId: assignments.classId,
      schoolId: classes.schoolId,
      teacherId: classes.teacherId,
    }).from(assignments)
      .leftJoin(classes, eq(assignments.classId, classes.id))
      .where(eq(assignments.id, assignmentId))
      .limit(1)

    if (!existingAssignment.length) {
      return c.json({ error: 'Assignment not found' }, 404)
    }

    const targetAssignment = existingAssignment[0]

    // Permission check
    const canEdit = currentUser.role === 'super_admin' || 
                   (currentUser.role === 'school_admin' && currentUser.schoolId === targetAssignment.schoolId) ||
                   (currentUser.role === 'teacher' && currentUser.id === targetAssignment.teacherId)

    if (!canEdit) {
      return c.json({ error: 'Access denied' }, 403)
    }

    const processedData = {
      ...assignmentData,
      updatedAt: new Date(),
      dueDate: assignmentData.dueDate instanceof Date ? assignmentData.dueDate : 
               assignmentData.dueDate ? new Date(assignmentData.dueDate) : 
               assignmentData.dueDate === null ? null : undefined
    }

    const updatedAssignment = await db.update(assignments)
      .set(processedData)
      .where(eq(assignments.id, assignmentId))
      .returning()

    return c.json({
      message: 'Assignment updated successfully',
      assignment: updatedAssignment[0],
    })
  } catch (error) {
    console.error('Update assignment error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Delete assignment
assignmentsRouter.delete('/:id', authMiddleware, async (c) => {
  try {
    const assignmentId = c.req.param('id')
    const currentUser = c.get('user')

    // Check if assignment exists
    const existingAssignment = await db.select({
      id: assignments.id,
      schoolId: classes.schoolId,
      teacherId: classes.teacherId,
    }).from(assignments)
      .leftJoin(classes, eq(assignments.classId, classes.id))
      .where(eq(assignments.id, assignmentId))
      .limit(1)

    if (!existingAssignment.length) {
      return c.json({ error: 'Assignment not found' }, 404)
    }

    const targetAssignment = existingAssignment[0]

    // Permission check
    const canDelete = currentUser.role === 'super_admin' || 
                     (currentUser.role === 'school_admin' && currentUser.schoolId === targetAssignment.schoolId) ||
                     (currentUser.role === 'teacher' && currentUser.id === targetAssignment.teacherId)

    if (!canDelete) {
      return c.json({ error: 'Access denied' }, 403)
    }

    await db.update(assignments)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(assignments.id, assignmentId))

    return c.json({ message: 'Assignment deleted successfully' })
  } catch (error) {
    console.error('Delete assignment error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default assignmentsRouter