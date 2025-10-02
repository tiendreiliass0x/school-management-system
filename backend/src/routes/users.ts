import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, and, or, ilike, count } from 'drizzle-orm'
import { db } from '../db'
import { users, insertUserSchema, schools } from '../db/schema'
import { hashPassword } from '../lib/auth'
import { authMiddleware, requireRole, requireSchoolAccess } from '../middleware/auth'

const usersRouter = new Hono()

const createUserSchema = insertUserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isActive: true,
  passwordHash: true,
}).extend({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  dateOfBirth: z.union([z.string(), z.date(), z.null()]).optional().nullable()
})

const updateUserSchema = insertUserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  passwordHash: true,
}).extend({
  dateOfBirth: z.union([z.string(), z.date(), z.null()]).optional().nullable()
}).partial()

const querySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  role: z.string().optional(),
  search: z.string().optional(),
  schoolId: z.string().optional(),
})

// Get users with pagination and filtering
usersRouter.get('/', authMiddleware, requireSchoolAccess, zValidator('query', querySchema), async (c) => {
  try {
    const { page, limit, role, search, schoolId } = c.req.valid('query')
    const currentUser = c.get('user')
    
    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const offset = (pageNum - 1) * limitNum

    const baseQuery = db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      schoolId: users.schoolId,
      phone: users.phone,
      dateOfBirth: users.dateOfBirth,
      address: users.address,
      isActive: users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    }).from(users)

    // Apply school filter based on user role
    let schoolFilter
    if (currentUser.role === 'super_admin') {
      if (schoolId) {
        schoolFilter = eq(users.schoolId, schoolId)
      }
    } else {
      schoolFilter = eq(users.schoolId, currentUser.schoolId!)
    }

    const conditions: Parameters<typeof and> = []
    if (schoolFilter) conditions.push(schoolFilter)
    if (role && ['super_admin', 'school_admin', 'teacher', 'student', 'parent'].includes(role)) {
      conditions.push(eq(users.role, role as 'super_admin' | 'school_admin' | 'teacher' | 'student' | 'parent'))
    }
    if (search) {
      conditions.push(
        or(
          ilike(users.firstName, `%${search}%`),
          ilike(users.lastName, `%${search}%`),
          ilike(users.email, `%${search}%`)
        )
      )
    }

    const filters = conditions.length > 0 ? and(...conditions) : undefined

    const usersListQuery = filters ? baseQuery.where(filters) : baseQuery

    const usersList = await usersListQuery.offset(offset).limit(limitNum).orderBy(users.createdAt)

    // Get total count for pagination
    const countBaseQuery = db.select({ count: count() }).from(users)
    const countQuery = filters ? countBaseQuery.where(filters) : countBaseQuery
    const [{ count: total }] = await countQuery

    return c.json({
      users: usersList,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    })
  } catch (error) {
    console.error('Get users error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get user by ID
usersRouter.get('/:id', authMiddleware, async (c) => {
  try {
    const userId = c.req.param('id')
    const currentUser = c.get('user')

    const user = await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      schoolId: users.schoolId,
      phone: users.phone,
      dateOfBirth: users.dateOfBirth,
      address: users.address,
      isActive: users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    }).from(users).where(eq(users.id, userId)).limit(1)

    if (!user.length) {
      return c.json({ error: 'User not found' }, 404)
    }

    // Check permissions
    const targetUser = user[0]
    if (currentUser.role !== 'super_admin' && 
        currentUser.schoolId !== targetUser.schoolId &&
        currentUser.id !== targetUser.id) {
      return c.json({ error: 'Access denied' }, 403)
    }

    return c.json({ user: targetUser })
  } catch (error) {
    console.error('Get user error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Create user
usersRouter.post('/', authMiddleware, async (c) => {
  try {
    const rawBody = await c.req.json()

    // Validate with zod manually to get better error messages
    const result = createUserSchema.safeParse(rawBody)
    if (!result.success) {
      return c.json({
        error: 'Validation failed',
        details: result.error.issues
      }, 400)
    }
    
    const userData = result.data
    
    // Transform dateOfBirth if it's a string
    if (userData.dateOfBirth && typeof userData.dateOfBirth === 'string') {
      userData.dateOfBirth = new Date(userData.dateOfBirth)
    }
    const currentUser = c.get('user')

    // Permission check
    if (currentUser.role !== 'super_admin' && currentUser.role !== 'school_admin') {
      return c.json({ error: 'Insufficient permissions' }, 403)
    }

    // School admin can only create users for their school
    if (currentUser.role === 'school_admin') {
      if (userData.schoolId !== currentUser.schoolId) {
        return c.json({ error: 'Can only create users for your school' }, 403)
      }
    }

    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, userData.email)).limit(1)
    if (existingUser.length) {
      return c.json({ error: 'User already exists with this email' }, 409)
    }

    // Hash password
    const hashedPassword = await hashPassword(userData.password)

    // Create user
    const { password, ...userDataWithoutPassword } = userData
    const newUser = await db.insert(users).values({
      ...userDataWithoutPassword,
      passwordHash: hashedPassword,
      dateOfBirth: userData.dateOfBirth instanceof Date ? userData.dateOfBirth : 
                   userData.dateOfBirth ? new Date(userData.dateOfBirth) : null,
    }).returning({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      schoolId: users.schoolId,
      phone: users.phone,
      dateOfBirth: users.dateOfBirth,
      address: users.address,
      isActive: users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })

    return c.json({
      message: 'User created successfully',
      user: newUser[0],
    }, 201)
  } catch (error) {
    console.error('Create user error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Update user
usersRouter.put('/:id', authMiddleware, zValidator('json', updateUserSchema), async (c) => {
  try {
    const userId = c.req.param('id')
    const userData = c.req.valid('json')
    const currentUser = c.get('user')

    // Check if target user exists
    const existingUser = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    if (!existingUser.length) {
      return c.json({ error: 'User not found' }, 404)
    }

    const targetUser = existingUser[0]

    // Permission check
    const canEdit = currentUser.role === 'super_admin' || 
                   (currentUser.role === 'school_admin' && currentUser.schoolId === targetUser.schoolId) ||
                   currentUser.id === targetUser.id

    if (!canEdit) {
      return c.json({ error: 'Access denied' }, 403)
    }

    // Users can only edit their own basic info (not role or school)
    if (currentUser.id === targetUser.id && currentUser.role !== 'super_admin' && currentUser.role !== 'school_admin') {
      const allowedFields = ['firstName', 'lastName', 'phone', 'dateOfBirth', 'address']
      const hasDisallowedField = Object.keys(userData).some(key => !allowedFields.includes(key))
      
      if (hasDisallowedField) {
        return c.json({ error: 'Cannot modify role or school assignments' }, 403)
      }
    }

    // Transform dateOfBirth if it's a string
    const updateData = {
      ...userData,
      updatedAt: new Date(),
      dateOfBirth: userData.dateOfBirth instanceof Date ? userData.dateOfBirth : 
                   userData.dateOfBirth ? new Date(userData.dateOfBirth) : 
                   userData.dateOfBirth === null ? null : undefined
    }
    
    const updatedUser = await db.update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        schoolId: users.schoolId,
        phone: users.phone,
        dateOfBirth: users.dateOfBirth,
        address: users.address,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })

    return c.json({
      message: 'User updated successfully',
      user: updatedUser[0],
    })
  } catch (error) {
    console.error('Update user error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Deactivate user (soft delete)
usersRouter.delete('/:id', authMiddleware, async (c) => {
  try {
    const userId = c.req.param('id')
    const currentUser = c.get('user')

    // Check if target user exists
    const existingUser = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    if (!existingUser.length) {
      return c.json({ error: 'User not found' }, 404)
    }

    const targetUser = existingUser[0]

    // Permission check
    const canDeactivate = currentUser.role === 'super_admin' || 
                         (currentUser.role === 'school_admin' && currentUser.schoolId === targetUser.schoolId)

    if (!canDeactivate) {
      return c.json({ error: 'Access denied' }, 403)
    }

    // Cannot deactivate yourself
    if (currentUser.id === targetUser.id) {
      return c.json({ error: 'Cannot deactivate your own account' }, 400)
    }

    await db.update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(users.id, userId))

    return c.json({ message: 'User deactivated successfully' })
  } catch (error) {
    console.error('Deactivate user error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Reactivate user
usersRouter.post('/:id/activate', authMiddleware, async (c) => {
  try {
    const userId = c.req.param('id')
    const currentUser = c.get('user')

    // Check if target user exists
    const existingUser = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    if (!existingUser.length) {
      return c.json({ error: 'User not found' }, 404)
    }

    const targetUser = existingUser[0]

    // Permission check
    const canActivate = currentUser.role === 'super_admin' || 
                       (currentUser.role === 'school_admin' && currentUser.schoolId === targetUser.schoolId)

    if (!canActivate) {
      return c.json({ error: 'Access denied' }, 403)
    }

    await db.update(users)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(users.id, userId))

    return c.json({ message: 'User activated successfully' })
  } catch (error) {
    console.error('Activate user error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default usersRouter