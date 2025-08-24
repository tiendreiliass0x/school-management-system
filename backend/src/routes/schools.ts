import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, and, count } from 'drizzle-orm'
import { db } from '../db'
import { schools, users, insertSchoolSchema } from '../db/schema'
import { authMiddleware, requireRole, requireSchoolAccess } from '../middleware/auth'

const schoolsRouter = new Hono()

const createSchoolSchema = insertSchoolSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

const updateSchoolSchema = createSchoolSchema.partial()

// Get all schools (super admin only)
schoolsRouter.get('/', authMiddleware, requireRole('super_admin'), async (c) => {
  try {
    const allSchools = await db.select().from(schools).orderBy(schools.name)
    return c.json({ schools: allSchools })
  } catch (error) {
    console.error('Get schools error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get current user's school
schoolsRouter.get('/current', authMiddleware, requireSchoolAccess, async (c) => {
  try {
    const currentUser = c.get('user')
    
    // Super admin can access any school, but they need to specify which one
    if (currentUser.role === 'super_admin') {
      return c.json({ error: 'Super admin must specify school ID' }, 400)
    }

    const school = await db.select().from(schools).where(eq(schools.id, currentUser.schoolId!)).limit(1)
    
    if (!school.length) {
      return c.json({ error: 'School not found' }, 404)
    }

    return c.json({ school: school[0] })
  } catch (error) {
    console.error('Get current school error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get school by ID
schoolsRouter.get('/:id', authMiddleware, async (c) => {
  try {
    const schoolId = c.req.param('id')
    const currentUser = c.get('user')

    // Check permissions
    if (currentUser.role !== 'super_admin' && currentUser.schoolId !== schoolId) {
      return c.json({ error: 'Access denied to this school' }, 403)
    }

    const school = await db.select().from(schools).where(eq(schools.id, schoolId)).limit(1)
    
    if (!school.length) {
      return c.json({ error: 'School not found' }, 404)
    }

    return c.json({ school: school[0] })
  } catch (error) {
    console.error('Get school error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Create school (super admin only)
schoolsRouter.post('/', authMiddleware, requireRole('super_admin'), zValidator('json', createSchoolSchema), async (c) => {
  try {
    const schoolData = c.req.valid('json')

    const newSchool = await db.insert(schools).values(schoolData).returning()

    return c.json({ 
      message: 'School created successfully',
      school: newSchool[0] 
    }, 201)
  } catch (error) {
    console.error('Create school error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Update school
schoolsRouter.put('/:id', authMiddleware, zValidator('json', updateSchoolSchema), async (c) => {
  try {
    const schoolId = c.req.param('id')
    const schoolData = c.req.valid('json')
    const currentUser = c.get('user')

    // Check permissions - super admin or school admin of this school
    if (currentUser.role !== 'super_admin' && 
        (currentUser.role !== 'school_admin' || currentUser.schoolId !== schoolId)) {
      return c.json({ error: 'Access denied' }, 403)
    }

    // Check if school exists
    const existingSchool = await db.select().from(schools).where(eq(schools.id, schoolId)).limit(1)
    
    if (!existingSchool.length) {
      return c.json({ error: 'School not found' }, 404)
    }

    const updatedSchool = await db.update(schools)
      .set({ ...schoolData, updatedAt: new Date() })
      .where(eq(schools.id, schoolId))
      .returning()

    return c.json({ 
      message: 'School updated successfully',
      school: updatedSchool[0] 
    })
  } catch (error) {
    console.error('Update school error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Delete school (super admin only)
schoolsRouter.delete('/:id', authMiddleware, requireRole('super_admin'), async (c) => {
  try {
    const schoolId = c.req.param('id')

    // Check if school exists
    const existingSchool = await db.select().from(schools).where(eq(schools.id, schoolId)).limit(1)
    
    if (!existingSchool.length) {
      return c.json({ error: 'School not found' }, 404)
    }

    // Check if school has users (prevent deletion if it has users)
    const schoolUsers = await db.select().from(users).where(eq(users.schoolId, schoolId)).limit(1)
    
    if (schoolUsers.length > 0) {
      return c.json({ 
        error: 'Cannot delete school with existing users. Transfer or delete users first.' 
      }, 400)
    }

    await db.delete(schools).where(eq(schools.id, schoolId))

    return c.json({ message: 'School deleted successfully' })
  } catch (error) {
    console.error('Delete school error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get school statistics
schoolsRouter.get('/:id/stats', authMiddleware, async (c) => {
  try {
    const schoolId = c.req.param('id')
    const currentUser = c.get('user')

    // Check permissions
    if (currentUser.role !== 'super_admin' && currentUser.schoolId !== schoolId) {
      return c.json({ error: 'Access denied to this school' }, 403)
    }

    // Get user counts by role
    const userStats = await db.select({
      role: users.role,
      count: count()
    }).from(users)
      .where(and(eq(users.schoolId, schoolId), eq(users.isActive, true)))
      .groupBy(users.role)

    const stats = {
      totalUsers: userStats.reduce((sum, stat) => sum + stat.count, 0),
      usersByRole: userStats.reduce((acc, stat) => {
        acc[stat.role] = stat.count
        return acc
      }, {} as Record<string, number>)
    }

    return c.json({ stats })
  } catch (error) {
    console.error('Get school stats error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default schoolsRouter