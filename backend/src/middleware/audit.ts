import { Context, Next } from 'hono'
import { auditLogger, AuditEventType, AuditSeverity } from '../lib/audit-logger'

/**
 * Audit logging middleware for automatic security event tracking
 */
export function auditMiddleware() {
  return async (c: Context, next: Next) => {
    const startTime = Date.now()
    const method = c.req.method
    const path = c.req.path
    const userAgent = c.req.header('user-agent') || 'Unknown'
    const ipAddress = c.env?.CF_CONNECTING_IP || c.req.header('x-forwarded-for') || 'unknown'

    try {
      await next()
      
      const duration = Date.now() - startTime
      const status = c.res.status
      const user = c.get('user')

      // Log different types of events based on the endpoint and status
      if (path.startsWith('/api/auth/')) {
        await logAuthEvent(c, method, path, status, ipAddress, userAgent, user)
      } else if (status >= 400) {
        await logErrorEvent(c, method, path, status, ipAddress, userAgent, user)
      } else if (isSecurityRelevantEndpoint(path, method)) {
        await logSecurityEvent(c, method, path, status, ipAddress, userAgent, user)
      }

      // Log performance issues
      if (duration > 5000) { // More than 5 seconds
        await auditLogger.logSecurity(AuditEventType.SUSPICIOUS_ACTIVITY, {
          userId: user?.id,
          ipAddress,
          userAgent,
          resource: path,
          details: {
            slowRequest: true,
            duration,
            method,
            status,
          },
          severity: AuditSeverity.MEDIUM,
        })
      }

    } catch (error) {
      const duration = Date.now() - startTime
      const user = c.get('user')
      
      // Log the error
      await auditLogger.logFromContext(c, AuditEventType.SUSPICIOUS_ACTIVITY, AuditSeverity.HIGH, {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        details: {
          duration,
          method,
          path,
          error: error instanceof Error ? error.stack : String(error),
        },
      })

      throw error
    }
  }
}

/**
 * Log authentication-related events
 */
async function logAuthEvent(
  c: Context,
  method: string,
  path: string,
  status: number,
  ipAddress: string,
  userAgent: string,
  user?: any
) {
  const success = status < 400
  let eventType: AuditEventType
  let severity: AuditSeverity

  if (path.includes('/login')) {
    eventType = success ? AuditEventType.LOGIN_SUCCESS : AuditEventType.LOGIN_FAILED
    severity = success ? AuditSeverity.LOW : AuditSeverity.HIGH
  } else if (path.includes('/logout')) {
    eventType = AuditEventType.LOGOUT
    severity = AuditSeverity.LOW
  } else if (path.includes('/refresh')) {
    eventType = AuditEventType.TOKEN_REFRESH
    severity = success ? AuditSeverity.LOW : AuditSeverity.MEDIUM
  } else if (path.includes('/change-password')) {
    eventType = AuditEventType.PASSWORD_CHANGE
    severity = AuditSeverity.MEDIUM
  } else {
    return // Not an auth event we track
  }

  await auditLogger.log({
    eventType,
    severity,
    userId: user?.id,
    userEmail: user?.email,
    userRole: user?.role,
    schoolId: user?.schoolId,
    ipAddress,
    userAgent,
    resource: path,
    action: method,
    details: {
      endpoint: path,
      status,
      timestamp: new Date().toISOString(),
    },
    success,
  })
}

/**
 * Log error events
 */
async function logErrorEvent(
  c: Context,
  method: string,
  path: string,
  status: number,
  ipAddress: string,
  userAgent: string,
  user?: any
) {
  let eventType: AuditEventType
  let severity: AuditSeverity

  if (status === 401) {
    eventType = AuditEventType.ACCESS_DENIED
    severity = AuditSeverity.MEDIUM
  } else if (status === 403) {
    eventType = AuditEventType.ACCESS_DENIED
    severity = AuditSeverity.HIGH
  } else if (status === 429) {
    eventType = AuditEventType.RATE_LIMIT_EXCEEDED
    severity = AuditSeverity.HIGH
  } else if (status >= 500) {
    eventType = AuditEventType.SUSPICIOUS_ACTIVITY
    severity = AuditSeverity.CRITICAL
  } else {
    eventType = AuditEventType.SUSPICIOUS_ACTIVITY
    severity = AuditSeverity.MEDIUM
  }

  await auditLogger.log({
    eventType,
    severity,
    userId: user?.id,
    userEmail: user?.email,
    userRole: user?.role,
    schoolId: user?.schoolId,
    ipAddress,
    userAgent,
    resource: path,
    action: method,
    details: {
      endpoint: path,
      status,
      httpMethod: method,
      timestamp: new Date().toISOString(),
    },
    success: false,
  })
}

/**
 * Log security-relevant operations
 */
async function logSecurityEvent(
  c: Context,
  method: string,
  path: string,
  status: number,
  ipAddress: string,
  userAgent: string,
  user?: any
) {
  const success = status < 400
  let eventType: AuditEventType
  let severity: AuditSeverity = AuditSeverity.MEDIUM

  // Determine event type based on endpoint and method
  if (path.includes('/users') && method === 'POST') {
    eventType = AuditEventType.USER_CREATED
  } else if (path.includes('/users') && method === 'PUT') {
    eventType = AuditEventType.USER_UPDATED
  } else if (path.includes('/users') && method === 'DELETE') {
    eventType = AuditEventType.USER_DELETED
    severity = AuditSeverity.HIGH
  } else if (path.includes('/schools') && method === 'POST') {
    eventType = AuditEventType.SCHOOL_CREATED
    severity = AuditSeverity.HIGH
  } else if (path.includes('/schools') && method === 'PUT') {
    eventType = AuditEventType.SCHOOL_UPDATED
  } else if (path.includes('/schools') && method === 'DELETE') {
    eventType = AuditEventType.SCHOOL_DELETED
    severity = AuditSeverity.CRITICAL
  } else if (path.includes('/grades') && method === 'POST' && path.includes('/bulk')) {
    eventType = AuditEventType.BULK_OPERATION
    severity = AuditSeverity.HIGH
  } else {
    return // Not a security-relevant event we track
  }

  await auditLogger.log({
    eventType,
    severity,
    userId: user?.id,
    userEmail: user?.email,
    userRole: user?.role,
    schoolId: user?.schoolId,
    ipAddress,
    userAgent,
    resource: path,
    action: method,
    details: {
      endpoint: path,
      status,
      httpMethod: method,
      timestamp: new Date().toISOString(),
    },
    success,
  })
}

/**
 * Check if an endpoint is security-relevant
 */
function isSecurityRelevantEndpoint(path: string, method: string): boolean {
  const securityEndpoints = [
    '/api/users',
    '/api/schools',
    '/api/grades/bulk',
  ]

  const relevantMethods = ['POST', 'PUT', 'DELETE']

  return securityEndpoints.some(endpoint => path.startsWith(endpoint)) &&
         relevantMethods.includes(method)
}

/**
 * Rate limiting audit middleware - logs when rate limits are hit
 */
export function rateLimitAuditMiddleware() {
  return async (c: Context, next: Next) => {
    try {
      await next()
    } catch (error) {
      // Check if this is a rate limit error
      if (error instanceof Error && error.message.includes('Too many')) {
        const ipAddress = c.env?.CF_CONNECTING_IP || c.req.header('x-forwarded-for') || 'unknown'
        const userAgent = c.req.header('user-agent') || 'Unknown'
        const user = c.get('user')

        await auditLogger.logSecurity(AuditEventType.RATE_LIMIT_EXCEEDED, {
          userId: user?.id,
          ipAddress,
          userAgent,
          resource: c.req.path,
          details: {
            endpoint: c.req.path,
            method: c.req.method,
            timestamp: new Date().toISOString(),
            rateLimitType: c.req.path.includes('/login') ? 'login_attempts' : 'api_requests',
          },
          severity: AuditSeverity.HIGH,
        })
      }
      
      throw error
    }
  }
}

/**
 * Token validation audit middleware - logs invalid token attempts
 */
export function tokenAuditMiddleware() {
  return async (c: Context, next: Next) => {
    try {
      await next()
    } catch (error) {
      // Check if this is an authentication error
      if (error instanceof Error && (
        error.message.includes('Invalid token') ||
        error.message.includes('Token expired') ||
        error.message.includes('No token')
      )) {
        const ipAddress = c.env?.CF_CONNECTING_IP || c.req.header('x-forwarded-for') || 'unknown'
        const userAgent = c.req.header('user-agent') || 'Unknown'
        const authHeader = c.req.header('Authorization')

        await auditLogger.logSecurity(AuditEventType.INVALID_TOKEN, {
          ipAddress,
          userAgent,
          resource: c.req.path,
          details: {
            endpoint: c.req.path,
            method: c.req.method,
            hasAuthHeader: !!authHeader,
            authHeaderFormat: authHeader ? 'Bearer ***' : 'none',
            errorMessage: error.message,
            timestamp: new Date().toISOString(),
          },
          severity: AuditSeverity.MEDIUM,
        })
      }
      
      throw error
    }
  }
}
