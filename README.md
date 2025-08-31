# School Management System

A comprehensive, production-ready school management SaaS application built with modern technologies.

## 🏗️ Architecture

- **Backend**: Bun + Hono (TypeScript)
- **Frontend**: Next.js 15 + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Cache**: Redis
- **Deployment**: Docker + Docker Compose
- **Reverse Proxy**: Nginx

## ✨ Features

### Core Functionality
- 🏫 **Multi-tenant Architecture** - Support multiple schools
- 👥 **Role-based Access Control** - Super Admin, School Admin, Teacher, Student, Parent
- 🎓 **Class Management** - Create and manage classes with enrollment
- 📚 **Assignment System** - Create assignments with due dates and instructions
- 📊 **Grading System** - Individual and bulk grading with feedback
- 📈 **Academic Year Management** - Track multiple academic periods
- 👤 **User Management** - Comprehensive user profiles and permissions

### Security Features
- 🔒 **JWT Authentication** with secure session management
- 🛡️ **Rate Limiting** - Prevents abuse and DDoS attacks
- 🔐 **Input Sanitization** - Prevents XSS and injection attacks
- 🚫 **CORS Protection** - Configurable cross-origin policies
- 🔑 **Password Security** - Bcrypt hashing with salt rounds
- 🎯 **Security Headers** - HSTS, CSP, XSS protection

### Performance & Reliability
- ⚡ **Caching System** - Redis for session and application caching
- 🔄 **API Retry Logic** - Automatic retry with exponential backoff
- 📊 **Health Monitoring** - Comprehensive health checks
- 🔧 **Error Boundary** - Graceful error handling and recovery
- 📈 **Performance Optimization** - Code splitting and lazy loading
- 💾 **Database Optimization** - Indexed queries and connection pooling

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Bun (for local development)
- Node.js 18+ (for frontend)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd school-management-saas
   ```

2. **Set up environment variables**
   ```bash
   # Backend
   cp backend/.env.example backend/.env
   
   # Frontend
   cp frontend/.env.example frontend/.env.local
   ```

3. **Start with Docker Compose**
   ```bash
   # Development
   docker-compose up -d
   
   # Production
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

4. **Run database migrations and seed data**
   ```bash
   # Wait for services to start, then:
   docker-compose exec backend bun run migrate
   docker-compose exec backend bun run seed
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

## 👤 Demo Accounts

After seeding the database, you can use these accounts:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@system.com | admin123! |
| School Admin | admin@demoschool.edu | admin123! |
| Teacher | alice.johnson@demoschool.edu | teacher123! |
| Student | emma.davis@student.demoschool.edu | student123! |
| Parent | michael.davis@parent.demoschool.edu | parent123! |

## 🔧 Development

### Backend Development
```bash
cd backend
bun install
bun run dev
```

### Backend Production Build
```bash
cd backend

# Build for production
bun run build:production

# Start production server
bun run start:production

# Build with testing
./scripts/build-backend.sh --test

# All available commands:
bun run build              # Build with sourcemaps
bun run build:production   # Optimized production build
bun run preview            # Build and run production locally
bun run clean              # Clean build artifacts
bun run typecheck          # Run TypeScript checks
bun run healthcheck        # Health check endpoint test
```

### Frontend Development
```bash
cd frontend
npm install
npm run dev
```

### Database Operations
```bash
# Run migrations
bun run migrate

# Seed database
bun run seed

# Reset database (caution: destroys all data)
bun run reset
```

## 📦 Deployment

### Production Deployment
```bash
# Make scripts executable
chmod +x scripts/*.sh

# Deploy to production
./scripts/deploy.sh
```

### Environment Configuration

#### Backend Environment Variables
```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=your-super-secret-jwt-key
ALLOWED_ORIGINS=https://yourdomain.com
NODE_ENV=production
```

#### Frontend Environment Variables
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_APP_NAME="Your School Name"
NODE_ENV=production
```

## 🔒 Security Best Practices

### Authentication & Authorization
- JWT tokens with configurable expiration
- Role-based access control (RBAC)
- Multi-tenant data isolation
- Secure password hashing (bcrypt)

### API Security
- Rate limiting on all endpoints
- Input validation and sanitization
- CORS configuration
- Security headers (HSTS, CSP, etc.)
- Request/response logging

### Data Protection
- Encrypted database connections
- Secure session management
- Data validation at all layers
- SQL injection prevention

## 📊 Monitoring & Maintenance

### Health Checks
```bash
# Check all services
./scripts/health-check.sh

# Individual service status
docker-compose ps
```

### Database Backup
```bash
# Manual backup
./scripts/backup.sh

# Automated daily backups are configured in docker-compose
```

### Logs
```bash
# View application logs
docker-compose logs backend
docker-compose logs frontend

# Nginx access logs
docker-compose logs nginx
```

## 🛠️ API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/change-password` - Change password

### School Management
- `GET /api/schools` - List schools
- `POST /api/schools` - Create school
- `PUT /api/schools/:id` - Update school
- `DELETE /api/schools/:id` - Delete school

### User Management
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Deactivate user

### Class Management
- `GET /api/classes` - List classes
- `POST /api/classes` - Create class
- `PUT /api/classes/:id` - Update class
- `DELETE /api/classes/:id` - Delete class

### Assignment & Grading
- `GET /api/assignments` - List assignments
- `POST /api/assignments` - Create assignment
- `GET /api/grades` - List grades
- `POST /api/grades/bulk` - Bulk grade assignment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📧 Email: support@yourschool.com
- 📖 Documentation: [docs.yourschool.com](https://docs.yourschool.com)
- 🐛 Bug Reports: [GitHub Issues](https://github.com/yourrepo/issues)

## 🔄 Version History

- **v1.0.0** - Initial release with core functionality
  - Multi-tenant school management
  - User roles and permissions
  - Class and assignment management
  - Grading system
  - Production-ready deployment