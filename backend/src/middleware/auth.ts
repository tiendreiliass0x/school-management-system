import { Context, Next } from 'hono'
import { verifyToken, JWTPayload } from '../lib/auth'
import { db } from '../db'
import { users } from '../db/schema'
import { eq } from 'drizzle-orm'

declare module 'hono' {
  interface ContextVariableMap {
    user: JWTPayload & {
      id: string
      email: string
      role: string
      schoolId?: string
    }
  }
}

export const authMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'No valid authorization header' }, 401)
  }

  const token = authHeader.substring(7)
  const payload = verifyToken(token)

  if (!payload) {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }

  // Verify user still exists and is active
  const user = await db.select().from(users).where(eq(users.id, payload.id)).limit(1)
  
  if (!user.length || !user[0].isActive) {
    return c.json({ error: 'User not found or inactive' }, 401)
  }

  c.set('user', payload as JWTPayload & {
    id: string
    email: string
    role: string
    schoolId?: string
  })

  await next()
}

export const requireRole = (...roles: string[]) => {
  return async (c: Context, next: Next) => {
    const user = c.get('user')
    
    if (!user) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    if (!roles.includes(user.role)) {
      return c.json({ error: 'Insufficient permissions' }, 403)
    }

    await next()
  }
}

export const requireSchoolAccess = async (c: Context, next: Next) => {
  const user = c.get('user')
  
  if (!user) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  // Super admins can access any school
  if (user.role === 'super_admin') {
    await next()
    return
  }

  // All other users must belong to a school
  if (!user.schoolId) {
    return c.json({ error: 'No school access' }, 403)
  }

  await next()
}