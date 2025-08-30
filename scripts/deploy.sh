#!/bin/bash

# Production deployment script
set -e

echo "🚀 Starting deployment..."

# Load environment variables
if [ -f .env.production ]; then
    export $(cat .env.production | xargs)
fi

# Create necessary directories
mkdir -p logs
mkdir -p backups
mkdir -p nginx/ssl

# Backup database before deployment
echo "💾 Creating database backup..."
./scripts/backup.sh

# Stop existing services
echo "🛑 Stopping existing services..."
docker-compose down

# Pull latest code (if using Git)
if [ -d ".git" ]; then
    echo "📥 Pulling latest code..."
    git pull origin main
fi

# Build and start services
echo "🔨 Building and starting services..."
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
./scripts/health-check.sh

# Run database migrations
echo "🔄 Running database migrations..."
docker-compose exec backend bun run migrate

# Clean up old docker images
echo "🧹 Cleaning up..."
docker image prune -f

echo "✅ Deployment completed successfully!"
echo "📊 Service status:"
docker-compose ps