import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, and, count } from 'drizzle-orm'
import { db } from '../db'
import { grades, assignments, classes, users, insertGradeSchema } from '../db/schema'
import { authMiddleware, requireSchoolAccess } from '../middleware/auth'

const gradesRouter = new Hono()

const createGradeSchema = insertGradeSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  gradedAt: true,
  gradedBy: true,
})

const updateGradeSchema = createGradeSchema.partial()

const bulkGradeSchema = z.object({
  assignmentId: z.string(),
  grades: z.array(z.object({
    studentId: z.string(),
    points: z.number().nullable(),
    feedback: z.string().optional(),
    status: z.enum(['draft', 'published']).optional().default('draft'),
  }))
})

// Get grades with filtering
gradesRouter.get('/', authMiddleware, requireSchoolAccess, async (c) => {
  try {
    const currentUser = c.get('user')
    const assignmentId = c.req.query('assignmentId')
    const studentId = c.req.query('studentId')
    
    let query = db.select({
      id: grades.id,
      studentId: grades.studentId,
      assignmentId: grades.assignmentId,
      points: grades.points,
      feedback: grades.feedback,
      status: grades.status,
      gradedAt: grades.gradedAt,
      gradedBy: grades.gradedBy,
      createdAt: grades.createdAt,
      updatedAt: grades.updatedAt,
      studentName: users.firstName,
      studentLastName: users.lastName,
      assignmentTitle: assignments.title,
      className: classes.name,
    }).from(grades)
      .innerJoin(users, eq(grades.studentId, users.id))
      .innerJoin(assignments, eq(grades.assignmentId, assignments.id))
      .innerJoin(classes, eq(assignments.classId, classes.id))

    let conditions = []
    
    // School access filter
    if (currentUser.role !== 'super_admin') {
      conditions.push(eq(classes.schoolId, currentUser.schoolId!))
    }

    // Teacher can only see grades for their classes
    if (currentUser.role === 'teacher') {
      conditions.push(eq(classes.teacherId, currentUser.id))
    }

    // Student can only see their own grades
    if (currentUser.role === 'student') {
      conditions.push(eq(grades.studentId, currentUser.id))
      conditions.push(eq(grades.status, 'published')) // Only published grades
    }

    if (assignmentId) conditions.push(eq(grades.assignmentId, assignmentId))
    if (studentId && currentUser.role !== 'student') {
      conditions.push(eq(grades.studentId, studentId))
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions))
    }

    const gradesList = await query.orderBy(grades.createdAt)

    return c.json({ grades: gradesList })
  } catch (error) {
    console.error('Get grades error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get grade by ID
gradesRouter.get('/:id', authMiddleware, async (c) => {
  try {
    const gradeId = c.req.param('id')
    const currentUser = c.get('user')

    const grade = await db.select({
      id: grades.id,
      studentId: grades.studentId,
      assignmentId: grades.assignmentId,
      points: grades.points,
      feedback: grades.feedback,
      status: grades.status,
      gradedAt: grades.gradedAt,
      gradedBy: grades.gradedBy,
      createdAt: grades.createdAt,
      updatedAt: grades.updatedAt,
      schoolId: classes.schoolId,
      teacherId: classes.teacherId,
    }).from(grades)
      .innerJoin(assignments, eq(grades.assignmentId, assignments.id))
      .innerJoin(classes, eq(assignments.classId, classes.id))
      .where(eq(grades.id, gradeId))
      .limit(1)

    if (!grade.length) {
      return c.json({ error: 'Grade not found' }, 404)
    }

    const gradeInfo = grade[0]

    // Permission check
    const canView = currentUser.role === 'super_admin' || 
                   (currentUser.role === 'school_admin' && currentUser.schoolId === gradeInfo.schoolId) ||
                   (currentUser.role === 'teacher' && currentUser.id === gradeInfo.teacherId) ||
                   (currentUser.role === 'student' && currentUser.id === gradeInfo.studentId && gradeInfo.status === 'published')

    if (!canView) {
      return c.json({ error: 'Access denied' }, 403)
    }

    return c.json({ grade: gradeInfo })
  } catch (error) {
    console.error('Get grade error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Create or update grade
gradesRouter.post('/', authMiddleware, async (c) => {
  try {
    const rawBody = await c.req.json()
    
    const result = createGradeSchema.safeParse(rawBody)
    if (!result.success) {
      return c.json({ 
        error: 'Validation failed', 
        details: result.error.issues 
      }, 400)
    }
    
    const gradeData = result.data
    const currentUser = c.get('user')

    // Check if assignment exists and user has permission
    const assignmentInfo = await db.select({
      id: assignments.id,
      schoolId: classes.schoolId,
      teacherId: classes.teacherId,
    }).from(assignments)
      .innerJoin(classes, eq(assignments.classId, classes.id))
      .where(eq(assignments.id, gradeData.assignmentId))
      .limit(1)
    
    if (!assignmentInfo.length) {
      return c.json({ error: 'Assignment not found' }, 404)
    }

    const targetAssignment = assignmentInfo[0]

    // Permission check - only teachers and admins can grade
    const canGrade = currentUser.role === 'super_admin' || 
                    (currentUser.role === 'school_admin' && currentUser.schoolId === targetAssignment.schoolId) ||
                    (currentUser.role === 'teacher' && currentUser.id === targetAssignment.teacherId)

    if (!canGrade) {
      return c.json({ error: 'Access denied' }, 403)
    }

    // Check if grade already exists
    const existingGrade = await db.select().from(grades)
      .where(and(
        eq(grades.assignmentId, gradeData.assignmentId),
        eq(grades.studentId, gradeData.studentId)
      ))
      .limit(1)

    let savedGrade
    if (existingGrade.length > 0) {
      // Update existing grade
      savedGrade = await db.update(grades)
        .set({
          ...gradeData,
          gradedAt: new Date(),
          gradedBy: currentUser.id,
          updatedAt: new Date(),
        })
        .where(eq(grades.id, existingGrade[0].id))
        .returning()
    } else {
      // Create new grade
      savedGrade = await db.insert(grades).values({
        ...gradeData,
        gradedAt: new Date(),
        gradedBy: currentUser.id,
      }).returning()
    }

    return c.json({
      message: 'Grade saved successfully',
      grade: savedGrade[0],
    }, existingGrade.length > 0 ? 200 : 201)
  } catch (error) {
    console.error('Create/Update grade error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Bulk grade update
gradesRouter.post('/bulk', authMiddleware, async (c) => {
  try {
    const rawBody = await c.req.json()
    
    const result = bulkGradeSchema.safeParse(rawBody)
    if (!result.success) {
      return c.json({ 
        error: 'Validation failed', 
        details: result.error.issues 
      }, 400)
    }
    
    const { assignmentId, grades: gradesData } = result.data
    const currentUser = c.get('user')

    // Check permissions for assignment
    const assignmentInfo = await db.select({
      id: assignments.id,
      schoolId: classes.schoolId,
      teacherId: classes.teacherId,
    }).from(assignments)
      .innerJoin(classes, eq(assignments.classId, classes.id))
      .where(eq(assignments.id, assignmentId))
      .limit(1)
    
    if (!assignmentInfo.length) {
      return c.json({ error: 'Assignment not found' }, 404)
    }

    const targetAssignment = assignmentInfo[0]

    const canGrade = currentUser.role === 'super_admin' || 
                    (currentUser.role === 'school_admin' && currentUser.schoolId === targetAssignment.schoolId) ||
                    (currentUser.role === 'teacher' && currentUser.id === targetAssignment.teacherId)

    if (!canGrade) {
      return c.json({ error: 'Access denied' }, 403)
    }

    const savedGrades = []
    
    for (const gradeData of gradesData) {
      // Check if grade exists
      const existingGrade = await db.select().from(grades)
        .where(and(
          eq(grades.assignmentId, assignmentId),
          eq(grades.studentId, gradeData.studentId)
        ))
        .limit(1)

      let savedGrade
      if (existingGrade.length > 0) {
        // Update existing grade
        savedGrade = await db.update(grades)
          .set({
            ...gradeData,
            assignmentId,
            gradedAt: new Date(),
            gradedBy: currentUser.id,
            updatedAt: new Date(),
          })
          .where(eq(grades.id, existingGrade[0].id))
          .returning()
      } else {
        // Create new grade
        savedGrade = await db.insert(grades).values({
          ...gradeData,
          assignmentId,
          gradedAt: new Date(),
          gradedBy: currentUser.id,
        }).returning()
      }
      
      savedGrades.push(savedGrade[0])
    }

    return c.json({
      message: 'Grades saved successfully',
      grades: savedGrades,
    })
  } catch (error) {
    console.error('Bulk grade error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Update grade
gradesRouter.put('/:id', authMiddleware, async (c) => {
  try {
    const gradeId = c.req.param('id')
    const rawBody = await c.req.json()
    
    const result = updateGradeSchema.safeParse(rawBody)
    if (!result.success) {
      return c.json({ 
        error: 'Validation failed', 
        details: result.error.issues 
      }, 400)
    }
    
    const gradeData = result.data
    const currentUser = c.get('user')

    // Check if grade exists
    const existingGrade = await db.select({
      id: grades.id,
      schoolId: classes.schoolId,
      teacherId: classes.teacherId,
    }).from(grades)
      .innerJoin(assignments, eq(grades.assignmentId, assignments.id))
      .innerJoin(classes, eq(assignments.classId, classes.id))
      .where(eq(grades.id, gradeId))
      .limit(1)

    if (!existingGrade.length) {
      return c.json({ error: 'Grade not found' }, 404)
    }

    const targetGrade = existingGrade[0]

    // Permission check
    const canEdit = currentUser.role === 'super_admin' || 
                   (currentUser.role === 'school_admin' && currentUser.schoolId === targetGrade.schoolId) ||
                   (currentUser.role === 'teacher' && currentUser.id === targetGrade.teacherId)

    if (!canEdit) {
      return c.json({ error: 'Access denied' }, 403)
    }

    const updatedGrade = await db.update(grades)
      .set({ 
        ...gradeData, 
        gradedAt: new Date(),
        gradedBy: currentUser.id,
        updatedAt: new Date() 
      })
      .where(eq(grades.id, gradeId))
      .returning()

    return c.json({
      message: 'Grade updated successfully',
      grade: updatedGrade[0],
    })
  } catch (error) {
    console.error('Update grade error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Delete grade
gradesRouter.delete('/:id', authMiddleware, async (c) => {
  try {
    const gradeId = c.req.param('id')
    const currentUser = c.get('user')

    // Check permissions
    const existingGrade = await db.select({
      id: grades.id,
      schoolId: classes.schoolId,
      teacherId: classes.teacherId,
    }).from(grades)
      .innerJoin(assignments, eq(grades.assignmentId, assignments.id))
      .innerJoin(classes, eq(assignments.classId, classes.id))
      .where(eq(grades.id, gradeId))
      .limit(1)

    if (!existingGrade.length) {
      return c.json({ error: 'Grade not found' }, 404)
    }

    const targetGrade = existingGrade[0]

    const canDelete = currentUser.role === 'super_admin' || 
                     (currentUser.role === 'school_admin' && currentUser.schoolId === targetGrade.schoolId) ||
                     (currentUser.role === 'teacher' && currentUser.id === targetGrade.teacherId)

    if (!canDelete) {
      return c.json({ error: 'Access denied' }, 403)
    }

    await db.delete(grades).where(eq(grades.id, gradeId))

    return c.json({ message: 'Grade deleted successfully' })
  } catch (error) {
    console.error('Delete grade error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default gradesRouter