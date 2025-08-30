import { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'

// Rate limiter using in-memory store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export interface RateLimitOptions {
  windowMs: number
  max: number
  message?: string
  keyGenerator?: (c: Context) => string
}

export function rateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    message = 'Too many requests',
    keyGenerator = (c) => c.env?.CF_CONNECTING_IP || c.req.header('x-forwarded-for') || 'unknown'
  } = options

  return async (c: Context, next: Next) => {
    const key = keyGenerator(c)
    const now = Date.now()
    
    // Clean up expired entries
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetTime < now) {
        rateLimitStore.delete(k)
      }
    }

    let record = rateLimitStore.get(key)
    
    if (!record || record.resetTime < now) {
      record = { count: 1, resetTime: now + windowMs }
      rateLimitStore.set(key, record)
    } else {
      record.count++
    }

    if (record.count > max) {
      throw new HTTPException(429, { message })
    }

    await next()
  }
}

// Security headers middleware
export function securityHeaders() {
  return async (c: Context, next: Next) => {
    await next()
    
    // Set security headers
    c.header('X-Content-Type-Options', 'nosniff')
    c.header('X-Frame-Options', 'DENY')
    c.header('X-XSS-Protection', '1; mode=block')
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    
    // Only set HSTS in production
    if (process.env.NODE_ENV === 'production') {
      c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
    }
  }
}

// Input sanitization middleware
export function sanitizeInput() {
  return async (c: Context, next: Next) => {
    try {
      const contentType = c.req.header('content-type')
      
      if (contentType?.includes('application/json')) {
        const body = await c.req.json()
        
        // Recursively sanitize object values
        const sanitized = sanitizeObject(body)
        
        // Replace the request body with sanitized version
        c.req.json = () => Promise.resolve(sanitized)
      }
    } catch (error) {
      // If JSON parsing fails, let the route handler deal with it
    }
    
    await next()
  }
}

function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj
  }
  
  if (typeof obj === 'string') {
    return sanitizeString(obj)
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject)
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value)
    }
    return sanitized
  }
  
  return obj
}

function sanitizeString(str: string): string {
  // Remove potentially dangerous characters
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim()
}

// Request logging middleware for security monitoring
export function requestLogger() {
  return async (c: Context, next: Next) => {
    const start = Date.now()
    const method = c.req.method
    const path = c.req.path
    const userAgent = c.req.header('user-agent')
    const ip = c.env?.CF_CONNECTING_IP || c.req.header('x-forwarded-for') || 'unknown'
    
    try {
      await next()
      
      const duration = Date.now() - start
      const status = c.res.status
      
      // Log successful requests (you might want to use a proper logging library)
      console.log(`${new Date().toISOString()} ${ip} ${method} ${path} ${status} ${duration}ms ${userAgent}`)
      
      // In production, you might want to send this to a monitoring service
      if (process.env.NODE_ENV === 'production') {
        // Send to monitoring service like DataDog, New Relic, etc.
        // monitoringService.log({ method, path, status, duration, ip, userAgent })
      }
      
    } catch (error) {
      const duration = Date.now() - start
      const status = error instanceof HTTPException ? error.status : 500
      
      // Log errors with more detail
      console.error(`${new Date().toISOString()} ${ip} ${method} ${path} ${status} ${duration}ms ERROR:`, error)
      
      // In production, send error to error tracking service
      if (process.env.NODE_ENV === 'production') {
        // errorTracking.captureException(error, { method, path, ip, userAgent })
      }
      
      throw error
    }
  }
}

// API key validation middleware (for external integrations)
export function validateApiKey() {
  return async (c: Context, next: Next) => {
    const apiKey = c.req.header('x-api-key')
    
    if (!apiKey) {
      throw new HTTPException(401, { message: 'API key required' })
    }
    
    // In production, validate against database or environment variables
    const validApiKeys = process.env.API_KEYS?.split(',') || []
    
    if (!validApiKeys.includes(apiKey)) {
      throw new HTTPException(401, { message: 'Invalid API key' })
    }
    
    await next()
  }
}

// Content length limiter
export function limitContentLength(maxBytes: number = 1024 * 1024) { // 1MB default
  return async (c: Context, next: Next) => {
    const contentLength = c.req.header('content-length')
    
    if (contentLength && parseInt(contentLength) > maxBytes) {
      throw new HTTPException(413, { message: 'Request payload too large' })
    }
    
    await next()
  }
}

// CORS configuration for production
export function corsConfig() {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000']
  
  return {
    origin: (origin: string) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return true
      return allowedOrigins.includes(origin)
    },
    allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  }
}