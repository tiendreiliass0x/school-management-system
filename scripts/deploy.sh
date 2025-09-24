#!/bin/bash

# School Management System Deployment Script
# Usage: ./scripts/deploy.sh [environment] [branch]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=${1:-production}
BRANCH=${2:-main}
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"

echo -e "${GREEN}🚀 Starting deployment to $ENVIRONMENT...${NC}"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Pre-deployment checks
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if docker is running
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    
    # Check if docker-compose is available
    if ! command -v docker-compose &> /dev/null; then
        log_error "docker-compose is not installed"
        exit 1
    fi
    
    # Check if .env file exists
    if [ ! -f ".env" ]; then
        log_warn ".env file not found. Copying from .env.example..."
        if [ -f ".env.example" ]; then
            cp .env.example .env
            log_warn "Please update .env with your production values"
        else
            log_error ".env.example not found. Please create .env file manually"
            exit 1
        fi
    fi
    
    log_info "Prerequisites check completed ✅"
}

# Create backup
create_backup() {
    log_info "Creating backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup database
    if docker-compose ps postgres | grep -q "Up"; then
        log_info "Backing up database..."
        docker-compose exec -T postgres pg_dump -U postgres school_management > "$BACKUP_DIR/database.sql"
        
        # Backup uploaded files (if any)
        if [ -d "./uploads" ]; then
            cp -r ./uploads "$BACKUP_DIR/"
        fi
        
        log_info "Backup created at $BACKUP_DIR ✅"
    else
        log_warn "Database not running, skipping backup"
    fi
}

# Pull latest code
update_code() {
    log_info "Updating code from $BRANCH branch..."
    
    if [ -d ".git" ]; then
        # Stash any local changes
        git stash push -m "Pre-deployment stash $(date)" || true
        
        # Pull latest changes
        git fetch origin
        git checkout "$BRANCH"
        git pull origin "$BRANCH"
        
        log_info "Code updated ✅"
    else
        log_warn "Not a git repository, skipping code update"
    fi
}

# Build and deploy
deploy() {
    log_info "Building and deploying services..."
    
    # Create necessary directories
    mkdir -p logs backups nginx/ssl
    
    # Set environment
    export NODE_ENV=$ENVIRONMENT
    
    # Build and start services
    if [ "$ENVIRONMENT" = "production" ]; then
        log_info "Building for production..."
        docker-compose build --no-cache
        docker-compose up -d
    else
        log_info "Building for development..."
        docker-compose up -d --build
    fi
    
    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    sleep 15
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    # Wait for database to be ready
    sleep 5
    
    # Check if backend service is running
    if docker-compose ps backend | grep -q "Up"; then
        # Run migrations
        if docker-compose exec backend bun run db:migrate; then
            log_info "Database migrations completed ✅"
        else
            log_error "Database migrations failed"
            return 1
        fi
        
        # Seed database if needed (only in development)
        if [ "$ENVIRONMENT" != "production" ]; then
            log_info "Seeding database with demo data..."
            docker-compose exec backend bun run db:seed || log_warn "Database seeding failed (this might be expected)"
        fi
    else
        log_error "Backend service is not running"
        return 1
    fi
}

# Health check
health_check() {
    log_info "Performing health checks..."
    
    # Check services are running
    local failed_services=()
    
    for service in postgres redis backend frontend; do
        if docker-compose ps "$service" | grep -q "Up"; then
            log_info "$service is running ✅"
        else
            log_error "$service failed to start"
            failed_services+=("$service")
        fi
    done
    
    if [ ${#failed_services[@]} -ne 0 ]; then
        log_error "The following services failed to start: ${failed_services[*]}"
        log_info "Showing logs for failed services..."
        for service in "${failed_services[@]}"; do
            echo "=== $service logs ==="
            docker-compose logs --tail=50 "$service"
        done
        return 1
    fi
    
    # Wait a bit for services to fully initialize
    sleep 10
    
    # Check backend health endpoint
    local backend_health_url="http://localhost:8000/health"
    if curl -f "$backend_health_url" > /dev/null 2>&1; then
        log_info "Backend health check passed ✅"
    else
        log_warn "Backend health check failed (endpoint might not be ready yet)"
    fi
    
    # Check frontend health endpoint  
    local frontend_health_url="http://localhost:3000"
    if curl -f "$frontend_health_url" > /dev/null 2>&1; then
        log_info "Frontend health check passed ✅"
    else
        log_warn "Frontend health check failed (endpoint might not be ready yet)"
    fi
}

# Cleanup old images and containers
cleanup() {
    log_info "Cleaning up old Docker images and containers..."
    
    # Remove unused containers
    docker container prune -f
    
    # Remove unused images
    docker image prune -f
    
    log_info "Cleanup completed ✅"
}

# Main execution
main() {
    log_info "=== School Management System Deployment ==="
    log_info "Environment: $ENVIRONMENT"
    log_info "Branch: $BRANCH"
    log_info "Timestamp: $(date)"
    echo ""
    
    check_prerequisites
    
    # Create backup only for production
    if [ "$ENVIRONMENT" = "production" ]; then
        create_backup
    fi
    
    update_code
    deploy
    
    if run_migrations; then
        log_info "Database setup completed ✅"
    else
        log_error "Database setup failed ❌"
        exit 1
    fi
    
    health_check
    cleanup
    
    echo ""
    log_info "🎉 Deployment completed successfully!"
    log_info "Application is available at:"
    log_info "  - Frontend: http://localhost:3000"
    log_info "  - Backend API: http://localhost:8000"
    log_info "  - API Health: http://localhost:8000/health"
    
    if [ "$ENVIRONMENT" = "production" ] && [ -d "$BACKUP_DIR" ]; then
        log_info "  - Backup created: $BACKUP_DIR"
    fi
    
    echo ""
    log_info "📊 Service status:"
    docker-compose ps
    echo ""
    log_info "To view logs: docker-compose logs -f [service-name]"
    log_info "To stop services: docker-compose down"
}

# Execute main function
main