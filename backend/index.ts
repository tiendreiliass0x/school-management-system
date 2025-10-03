import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { HTTPException } from 'hono/http-exception'

import authRoutes from './src/routes/auth'
import schoolsRoutes from './src/routes/schools'
import usersRoutes from './src/routes/users'
import classesRoutes from './src/routes/classes'
import assignmentsRoutes from './src/routes/assignments'
import gradesRoutes from './src/routes/grades'
import documentsRoutes from './src/routes/documents'

import { 
  rateLimit, 
  securityHeaders, 
  sanitizeInput, 
  requestLogger, 
  limitContentLength,
  corsConfig 
} from './src/middleware/security'
import { 
  auditMiddleware, 
  rateLimitAuditMiddleware, 
  tokenAuditMiddleware 
} from './src/middleware/audit'

const app = new Hono()

// Security middleware
app.use('*', securityHeaders())
app.use('*', requestLogger())
app.use('*', limitContentLength(5 * 1024 * 1024)) // 5MB limit

// Audit logging middleware
app.use('*', auditMiddleware())
app.use('*', tokenAuditMiddleware())

// CORS configuration - more permissive for development
console.log(`🌍 CORS Configuration - Environment: ${process.env.NODE_ENV}`)

if (process.env.NODE_ENV === 'development') {
  console.log('🔓 Development mode: Using secure localhost CORS settings')
  const developmentOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://localhost:8000',
    'http://127.0.0.1:8000'
  ]
  
  app.use('*', cors({
    origin: (origin) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return origin
      
      // Only allow localhost/127.0.0.1 origins in development
      const isAllowed = developmentOrigins.includes(origin) || 
                       origin.includes('localhost') || 
                       origin.includes('127.0.0.1')
      
      return isAllowed ? origin : null
    },
    allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Requested-With', 'Accept', 'Origin'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    credentials: true,
    maxAge: 86400, // Cache preflight response for 24 hours
  }))
} else {
  console.log('🔒 Production mode: Using strict CORS settings')
  // Production CORS configuration
  const corsOptions = corsConfig()
  app.use('*', cors({
    ...corsOptions,
    origin: (origin, c) => {
      // If corsOptions.origin is a function, call it with the origin
      if (typeof corsOptions.origin === 'function') {
        // If allowed, return the origin string, else return null
        return corsOptions.origin(origin) ? origin : null
      }
      // If it's a string or array, just return as is
      return corsOptions.origin
    }
  }))
}

// Rate limiting - different limits for different endpoints with audit logging
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Development mode: Using relaxed rate limits')
  app.use('/api/auth/login', rateLimitAuditMiddleware())
  app.use('/api/auth/login', rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // 20 attempts per window in development
    message: 'Too many login attempts, please try again later'
  }))

  app.use('/api/*', rateLimitAuditMiddleware())
  app.use('/api/*', rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 500, // 500 requests per window per IP in development
    message: 'Too many requests, please slow down'
  }))
} else {
  console.log('🔒 Production mode: Using strict rate limits')
  app.use('/api/auth/login', rateLimitAuditMiddleware())
  app.use('/api/auth/login', rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window in production
    message: 'Too many login attempts, please try again later'
  }))

  app.use('/api/*', rateLimitAuditMiddleware())
  app.use('/api/*', rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window per IP in production
    message: 'Too many requests, please slow down'
  }))
}

// Input sanitization
app.use('*', sanitizeInput())

// Request logging
app.use('*', logger())

app.get('/', (c) => {
  return c.json({ 
    message: 'School Management System API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  })
})

app.get('/health', (c) => {
  return c.json({ status: 'healthy', timestamp: new Date().toISOString() })
})

// CORS debugging endpoint
app.get('/cors-test', (c) => {
  return c.json({
    message: 'CORS is working!',
    origin: c.req.header('Origin'),
    method: c.req.method,
    headers: Object.fromEntries(
      Object.entries(c.req.header()).filter(([key]) => 
        key.toLowerCase().includes('origin') || key.toLowerCase().includes('access-control')
      )
    ),
    timestamp: new Date().toISOString()
  })
})

app.route('/api/auth', authRoutes)
app.route('/api/schools', schoolsRoutes)
app.route('/api/users', usersRoutes)
app.route('/api/classes', classesRoutes)
app.route('/api/assignments', assignmentsRoutes)
app.route('/api/grades', gradesRoutes)
app.route('/api/documents', documentsRoutes)

// Global error handler
app.onError((err, c) => {
  console.error('Global error handler:', err)
  
  if (err instanceof HTTPException) {
    return c.json({
      error: err.message,
      status: err.status
    }, err.status)
  }

  // Handle validation errors from Zod
  if (err.name === 'ZodError') {
    return c.json({
      error: 'Validation failed',
      details: (err as any).issues || (err as any).errors || 'Validation failed'
    }, 400)
  }

  // Handle database errors
  if (err.message.includes('duplicate key') || err.message.includes('unique constraint')) {
    return c.json({
      error: 'Resource already exists',
      details: 'A resource with these details already exists'
    }, 409)
  }

  if (err.message.includes('foreign key constraint')) {
    return c.json({
      error: 'Invalid reference',
      details: 'Referenced resource does not exist'
    }, 400)
  }

  // Production vs development error responses
  if (process.env.NODE_ENV === 'production') {
    return c.json({
      error: 'Internal server error',
      message: 'Something went wrong. Please try again later.'
    }, 500)
  } else {
    return c.json({
      error: 'Internal server error',
      message: err.message,
      stack: err.stack
    }, 500)
  }
})

// 404 handler
app.notFound((c) => {
  return c.json({
    error: 'Not found',
    message: 'The requested resource was not found'
  }, 404)
})

const port = Number(process.env.PORT) || 8000

console.log(`🚀 Server is running on http://localhost:${port}`)
console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`)

serve({
  fetch: app.fetch,
  port,
})