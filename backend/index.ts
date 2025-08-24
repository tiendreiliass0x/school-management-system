import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

import authRoutes from './src/routes/auth'
import schoolsRoutes from './src/routes/schools'
import usersRoutes from './src/routes/users'
import classesRoutes from './src/routes/classes'

const app = new Hono()

app.use('*', logger())
app.use('*', cors({
  origin: ['http://localhost:3000'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}))

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

app.route('/api/auth', authRoutes)
app.route('/api/schools', schoolsRoutes)
app.route('/api/users', usersRoutes)
app.route('/api/classes', classesRoutes)

const port = Number(process.env.PORT) || 8000

console.log(`Server is running on http://localhost:${port}`)

serve({
  fetch: app.fetch,
  port,
})