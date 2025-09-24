import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { users, insertUserSchema } from '../db/schema'
import { hashPassword, verifyPassword, generateToken, generateAuthTokens } from '../lib/auth'
import { passwordSchema, validatePassword } from '../lib/password-validation'
import { verifyRefreshToken, revokeRefreshToken, revokeAllUserTokens } from '../lib/refresh-token'
import { authMiddleware } from '../middleware/auth'
import { auditLogger } from '../lib/audit-logger'

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
  passwordHash: true,
}).extend({
  password: passwordSchema,
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
})

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
})

const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
  logoutAll: z.boolean().optional().default(false),
})

// Login
auth.post('/login', zValidator('json', loginSchema), async (c) => {
  try {
    const { email, password } = c.req.valid('json')

    const ipAddress = (c.env as any)?.CF_CONNECTING_IP || c.req.header('x-forwarded-for') || 'unknown'
    const userAgent = c.req.header('user-agent') || 'Unknown'

    // Find user by email
    const user = await db.select().from(users).where(eq(users.email, email)).limit(1)

    if (!user.length) {
      // Log failed login attempt
      await auditLogger.logAuth('login', {
        email,
        ipAddress,
        userAgent,
        success: false,
        errorMessage: 'User not found',
        details: { email }
      })
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    const foundUser = user[0]

    // Check if user is active
    if (!foundUser.isActive) {
      // Log failed login attempt for inactive user
      await auditLogger.logAuth('login', {
        userId: foundUser.id,
        email: foundUser.email,
        ipAddress,
        userAgent,
        success: false,
        errorMessage: 'Account is inactive',
        details: { email, userId: foundUser.id }
      })
      return c.json({ error: 'Account is inactive' }, 401)
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, foundUser.passwordHash)

    if (!isValidPassword) {
      // Log failed login attempt for wrong password
      await auditLogger.logAuth('login', {
        userId: foundUser.id,
        email: foundUser.email,
        ipAddress,
        userAgent,
        success: false,
        errorMessage: 'Invalid password',
        details: { email, userId: foundUser.id }
      })
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    // Generate both access and refresh tokens
    const { passwordHash: _, ...userWithoutPassword } = foundUser
    const tokens = await generateAuthTokens(userWithoutPassword, userAgent, ipAddress)

    // Log successful login
    await auditLogger.logAuth('login', {
      userId: foundUser.id,
      email: foundUser.email,
      ipAddress,
      userAgent,
      success: true,
      details: { 
        email, 
        userId: foundUser.id,
        role: foundUser.role,
        schoolId: foundUser.schoolId 
      }
    })

    return c.json({
      message: 'Login successful',
      ...tokens,
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

    // Additional password validation with detailed feedback
    const passwordValidation = validatePassword(userData.password)
    if (!passwordValidation.isValid) {
      return c.json({ 
        error: 'Password validation failed',
        details: passwordValidation.errors,
        strength: passwordValidation.strength
      }, 400)
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
    }).returning()

    const { passwordHash: _, ...userWithoutPassword } = newUser[0]

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

    // Additional password validation for new password
    const passwordValidation = validatePassword(newPassword)
    if (!passwordValidation.isValid) {
      return c.json({ 
        error: 'New password validation failed',
        details: passwordValidation.errors,
        strength: passwordValidation.strength
      }, 400)
    }

    // Get user with password
    const user = await db.select().from(users).where(eq(users.id, currentUser.id)).limit(1)

    if (!user.length) {
      return c.json({ error: 'User not found' }, 404)
    }

    // Verify current password
    const isValidPassword = await verifyPassword(currentPassword, user[0].passwordHash)

    if (!isValidPassword) {
      return c.json({ error: 'Current password is incorrect' }, 400)
    }

    // Check if new password is same as current password
    const isSamePassword = await verifyPassword(newPassword, user[0].passwordHash)
    if (isSamePassword) {
      return c.json({ error: 'New password must be different from current password' }, 400)
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword)

    // Update password
    await db.update(users)
      .set({ passwordHash: hashedNewPassword, updatedAt: new Date() })
      .where(eq(users.id, currentUser.id))

    return c.json({ message: 'Password updated successfully' })
  } catch (error) {
    console.error('Change password error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Refresh access token
auth.post('/refresh', zValidator('json', refreshTokenSchema), async (c) => {
  try {
    const { refreshToken } = c.req.valid('json')

    // Verify the refresh token
    const tokenVerification = await verifyRefreshToken(refreshToken)
    
    if (!tokenVerification.isValid || !tokenVerification.userId) {
      return c.json({ error: 'Invalid or expired refresh token' }, 401)
    }

    // Get user data
    const user = await db.select().from(users).where(eq(users.id, tokenVerification.userId)).limit(1)

    if (!user.length || !user[0].isActive) {
      return c.json({ error: 'User not found or inactive' }, 401)
    }

    // Generate new access token (keep same refresh token)
    const { passwordHash: _, ...userWithoutPassword } = user[0]
    const accessToken = generateToken(userWithoutPassword)

    return c.json({
      message: 'Token refreshed successfully',
      accessToken,
      expiresIn: 4 * 60 * 60 // 4 hours in seconds
    })
  } catch (error) {
    console.error('Refresh token error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Logout
auth.post('/logout', zValidator('json', logoutSchema), async (c) => {
  try {
    const { refreshToken, logoutAll } = c.req.valid('json')
    const ipAddress = (c.env as any)?.CF_CONNECTING_IP || c.req.header('x-forwarded-for') || 'unknown'
    const userAgent = c.req.header('user-agent') || 'Unknown'

    // Get user info from refresh token for logging
    const tokenVerification = await verifyRefreshToken(refreshToken)
    
    if (logoutAll) {
      // Logout from all devices
      if (tokenVerification.isValid && tokenVerification.userId) {
        const revokedCount = await revokeAllUserTokens(tokenVerification.userId)
        
        // Log logout from all devices
        await auditLogger.logAuth('logout', {
          userId: tokenVerification.userId,
          ipAddress,
          userAgent,
          success: true,
          details: { 
            logoutType: 'all_devices',
            revokedSessionsCount: revokedCount 
          }
        })
        
        return c.json({ 
          message: `Logged out from all devices (${revokedCount} sessions)` 
        })
      }
    }

    // Single device logout
    const revoked = await revokeRefreshToken(refreshToken)
    
    if (!revoked) {
      // Log failed logout attempt
      await auditLogger.logAuth('logout', {
        ipAddress,
        userAgent,
        success: false,
        errorMessage: 'Invalid refresh token',
        details: { logoutType: 'single_device' }
      })
      return c.json({ error: 'Invalid refresh token' }, 400)
    }

    // Log successful logout
    await auditLogger.logAuth('logout', {
      userId: tokenVerification.userId,
      ipAddress,
      userAgent,
      success: true,
      details: { logoutType: 'single_device' }
    })

    return c.json({ message: 'Logged out successfully' })
  } catch (error) {
    console.error('Logout error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default auth