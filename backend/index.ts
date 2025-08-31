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

import { 
  rateLimit, 
  securityHeaders, 
  sanitizeInput, 
  requestLogger, 
  limitContentLength,
  corsConfig 
} from './src/middleware/security'

const app = new Hono()

// Security middleware
app.use('*', securityHeaders())
app.use('*', requestLogger())
app.use('*', limitContentLength(5 * 1024 * 1024)) // 5MB limit

// CORS configuration - more permissive for development
console.log(`🌍 CORS Configuration - Environment: ${process.env.NODE_ENV}`)

if (process.env.NODE_ENV === 'development') {
  console.log('🔓 Development mode: Using permissive CORS settings')
  app.use('*', cors({
    origin: true, // Allow all origins in development
    allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Requested-With', 'Accept', 'Origin'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    credentials: true,
  }))
  
  // Additional CORS debugging middleware for development
  app.use('*', async (c, next) => {
    const origin = c.req.header('Origin')
    if (origin) {
      c.header('Access-Control-Allow-Origin', origin)
      c.header('Access-Control-Allow-Credentials', 'true')
    }
    await next()
  })
} else {
  console.log('🔒 Production mode: Using strict CORS settings')
  // Production CORS configuration
  const corsOptions = corsConfig()
  app.use('*', cors(corsOptions))
}

// Rate limiting - different limits for different endpoints
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many login attempts, please try again later'
}))

app.use('/api/*', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP
  message: 'Too many requests, please slow down'
}))

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
      details: err.issues || err.errors
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