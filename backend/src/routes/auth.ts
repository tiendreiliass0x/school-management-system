import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { users, insertUserSchema } from '../db/schema'
import { hashPassword, verifyPassword, generateToken } from '../lib/auth'
import { authMiddleware } from '../middleware/auth'

const auth = new Hono()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const registerSchema = insertUserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isActive: true,
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
})

// Login
auth.post('/login', zValidator('json', loginSchema), async (c) => {
  try {
    const { email, password } = c.req.valid('json')

    // Find user by email
    const user = await db.select().from(users).where(eq(users.email, email)).limit(1)

    if (!user.length) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    const foundUser = user[0]

    // Check if user is active
    if (!foundUser.isActive) {
      return c.json({ error: 'Account is inactive' }, 401)
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, foundUser.password)

    if (!isValidPassword) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    // Generate token
    const { password: _, ...userWithoutPassword } = foundUser
    const token = generateToken(userWithoutPassword)

    return c.json({
      message: 'Login successful',
      token,
      user: userWithoutPassword,
    })
  } catch (error) {
    console.error('Login error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Register (admin only for creating accounts)
auth.post('/register', zValidator('json', registerSchema), async (c) => {
  try {
    const userData = c.req.valid('json')

    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, userData.email)).limit(1)

    if (existingUser.length) {
      return c.json({ error: 'User already exists with this email' }, 409)
    }

    // Hash password
    const hashedPassword = await hashPassword(userData.password)

    // Create user
    const newUser = await db.insert(users).values({
      ...userData,
      password: hashedPassword,
    }).returning()

    const { password: _, ...userWithoutPassword } = newUser[0]

    return c.json({
      message: 'User created successfully',
      user: userWithoutPassword,
    }, 201)
  } catch (error) {
    console.error('Registration error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get current user profile
auth.get('/me', authMiddleware, async (c) => {
  try {
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
    }).from(users).where(eq(users.id, currentUser.id)).limit(1)

    if (!user.length) {
      return c.json({ error: 'User not found' }, 404)
    }

    return c.json({ user: user[0] })
  } catch (error) {
    console.error('Get profile error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Change password
auth.put('/change-password', authMiddleware, zValidator('json', changePasswordSchema), async (c) => {
  try {
    const currentUser = c.get('user')
    const { currentPassword, newPassword } = c.req.valid('json')

    // Get user with password
    const user = await db.select().from(users).where(eq(users.id, currentUser.id)).limit(1)

    if (!user.length) {
      return c.json({ error: 'User not found' }, 404)
    }

    // Verify current password
    const isValidPassword = await verifyPassword(currentPassword, user[0].password)

    if (!isValidPassword) {
      return c.json({ error: 'Current password is incorrect' }, 400)
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword)

    // Update password
    await db.update(users)
      .set({ password: hashedNewPassword, updatedAt: new Date() })
      .where(eq(users.id, currentUser.id))

    return c.json({ message: 'Password updated successfully' })
  } catch (error) {
    console.error('Change password error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default auth