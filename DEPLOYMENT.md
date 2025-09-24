# School Management System - Deployment Guide

This guide covers deployment strategies for the School Management System in various environments.

## Quick Start

### Development Deployment

```bash
# Clone the repository
git clone <repository-url>
cd school-management-saas

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
nano .env

# Deploy using the deployment script
./scripts/deploy.sh development
```

### Production Deployment

```bash
# Ensure production environment variables are set
cp .env.example .env
# Update .env with production values

# Deploy to production
./scripts/deploy.sh production
```

## Environment Configuration

### Required Environment Variables

#### Database
- `DATABASE_URL` - PostgreSQL connection string
- `DB_PASSWORD` - Database password
- `REDIS_PASSWORD` - Redis password

#### Security
- `JWT_SECRET` - JWT signing secret (minimum 32 characters)
- `SESSION_SECRET` - Session secret (minimum 32 characters)
- `BCRYPT_SALT_ROUNDS` - Password hashing rounds (recommended: 12)

#### CORS
- `ALLOWED_ORIGINS` - Comma-separated list of allowed origins

### Optional Configuration

#### Email
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - Email service configuration
- `FROM_EMAIL`, `FROM_NAME` - Default sender information

#### File Uploads
- `MAX_FILE_SIZE` - Maximum upload size in bytes
- `ALLOWED_FILE_TYPES` - Allowed file extensions

#### Monitoring
- `SENTRY_DSN` - Error tracking
- `NEW_RELIC_LICENSE_KEY` - Application performance monitoring

## Deployment Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Nginx       │    │    Frontend     │    │    Backend      │
│  Load Balancer  │───▶│   Next.js App   │───▶│   Bun Server    │
│   Port 80/443   │    │    Port 3000    │    │    Port 8000    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                       ┌─────────────────┐    ┌─────────────────┐
                       │     Redis       │    │   PostgreSQL    │
                       │   Port 6379     │    │   Port 5432     │
                       └─────────────────┘    └─────────────────┘
```

## Services

### Core Services

1. **PostgreSQL Database**
   - Persistent data storage
   - Automated backups
   - Connection pooling

2. **Redis Cache**
   - Session storage
   - API rate limiting
   - Caching layer

3. **Backend API (Bun + Hono)**
   - RESTful API
   - JWT authentication
   - Role-based authorization

4. **Frontend (Next.js)**
   - Server-side rendering
   - Static asset optimization
   - Progressive Web App features

5. **Nginx Reverse Proxy**
   - Load balancing
   - SSL termination
   - Static file serving
   - Rate limiting

### Supporting Services

6. **Prometheus Monitoring** (Production only)
   - Metrics collection
   - Performance monitoring
   - Alerting

7. **Log Rotation**
   - Automated log cleanup
   - Storage optimization

## Deployment Scripts

### Main Deployment Script

```bash
./scripts/deploy.sh [environment] [branch]
```

**Parameters:**
- `environment` - `development` or `production` (default: `production`)
- `branch` - Git branch to deploy (default: `main`)

**Features:**
- Pre-deployment checks
- Automated backups (production only)
- Code updates from Git
- Service health checks
- Database migrations
- Cleanup of old Docker images

### Backup Script

```bash
./scripts/backup.sh [backup_name]
```

**Features:**
- Database backup with compression
- File system backup
- Metadata generation
- Automatic cleanup of old backups
- Backup listing (`--list` flag)

## Health Checks

The system includes comprehensive health checks:

- **Backend**: `http://localhost:8000/health`
- **Frontend**: `http://localhost:3000`
- **Database**: PostgreSQL connection test
- **Redis**: Redis ping test
- **Nginx**: Load balancer health check

## SSL/TLS Configuration

### Development
- HTTP only (port 80)
- No SSL certificates required

### Production
1. Obtain SSL certificates (Let's Encrypt recommended)
2. Place certificates in `./nginx/ssl/`
   - `cert.pem` - SSL certificate
   - `key.pem` - Private key
3. Uncomment HTTPS configuration in `nginx/nginx.conf`
4. Update `ALLOWED_ORIGINS` to use HTTPS URLs

### Let's Encrypt Setup

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot

# Generate certificates
sudo certbot certonly --standalone -d yourdomain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./nginx/ssl/key.pem

# Set proper permissions
sudo chown $(whoami):$(whoami) ./nginx/ssl/*
chmod 600 ./nginx/ssl/*
```

## Monitoring and Logging

### Application Logs
- Backend logs: `./logs/app.log`
- Docker logs: `docker-compose logs [service]`
- Nginx logs: `./nginx/logs/`

### Metrics Collection
- Prometheus metrics: `http://localhost:9090`
- Application metrics exposed at `/metrics` endpoints

### Log Rotation
- Automated daily rotation
- 7-day retention for application logs
- 3-file rotation for Docker container logs

## Backup and Recovery

### Automated Backups
- Daily database backups (configurable)
- 30-day retention policy
- Compressed storage
- Metadata tracking

### Manual Backup
```bash
./scripts/backup.sh manual_backup_$(date +%Y%m%d)
```

### Disaster Recovery
1. Stop all services: `docker-compose down`
2. Restore database from backup
3. Restore configuration files
4. Restart services: `./scripts/deploy.sh production`

## Performance Optimization

### Database
- Connection pooling enabled
- Proper indexing configured
- Query optimization
- Regular VACUUM and ANALYZE

### Frontend
- Static asset compression
- Image optimization
- Code splitting
- CDN integration (configurable)

### Backend
- Request/response compression
- API rate limiting
- Caching headers
- Connection keep-alive

### Infrastructure
- Nginx gzip compression
- HTTP/2 support
- Static file caching
- Load balancing ready

## Security Measures

### Application Security
- JWT token authentication
- Role-based access control
- Input validation and sanitization
- CORS protection
- Rate limiting
- Password hashing (bcrypt)

### Infrastructure Security
- Security headers (HSTS, CSP, etc.)
- Non-root container users
- Network isolation
- Secrets management
- Regular security updates

### Database Security
- Encrypted connections
- User privilege separation
- Backup encryption
- Connection limits

## Troubleshooting

### Common Issues

#### Services Won't Start
```bash
# Check service logs
docker-compose logs [service-name]

# Check resource usage
docker stats

# Restart specific service
docker-compose restart [service-name]
```

#### Database Connection Issues
```bash
# Check database status
docker-compose exec postgres pg_isready

# Check connection from backend
docker-compose exec backend bun run db:test
```

#### Performance Issues
```bash
# Monitor resource usage
docker stats

# Check application metrics
curl http://localhost:8000/health

# View detailed logs
docker-compose logs -f backend
```

### Logs Analysis
```bash
# View real-time logs
docker-compose logs -f

# Search logs for errors
docker-compose logs | grep ERROR

# Export logs for analysis
docker-compose logs > system_logs_$(date +%Y%m%d).log
```

## Scaling

### Horizontal Scaling
- Load balancer ready (Nginx)
- Stateless backend design
- Shared Redis cache
- Database connection pooling

### Vertical Scaling
- Configurable resource limits
- Memory optimization
- CPU allocation tuning

### Database Scaling
- Read replicas support
- Connection pooling
- Query optimization
- Partitioning strategies

## Maintenance

### Regular Tasks
- Database backups verification
- Log rotation monitoring
- Security updates
- Performance monitoring
- Certificate renewal (if using SSL)

### Scheduled Maintenance
```bash
# Update system packages
sudo apt update && sudo apt upgrade

# Update Docker images
docker-compose pull
./scripts/deploy.sh production

# Clean up unused resources
docker system prune -f
```

## Support and Monitoring

### Health Monitoring
- Service availability checks
- Response time monitoring
- Error rate tracking
- Resource utilization alerts

### Alerting
- Email notifications for failures
- Slack integration (configurable)
- PagerDuty integration (configurable)

### Performance Metrics
- Request/response times
- Database query performance
- Memory and CPU usage
- User session metrics

## Contact and Support

For deployment issues or questions:
1. Check this documentation
2. Review application logs
3. Check Docker container status
4. Verify environment configuration
5. Consult system monitoring tools

Remember to never commit sensitive information like passwords or API keys to version control. Always use environment variables for configuration.