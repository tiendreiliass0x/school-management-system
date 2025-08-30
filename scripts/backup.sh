#!/bin/bash

# Database backup script
set -e

BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="${POSTGRES_DB:-school_management}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Create database backup
echo "📦 Creating database backup..."
docker-compose exec -T postgres pg_dump -U $DB_USER -d $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Compress the backup
gzip $BACKUP_DIR/backup_$DATE.sql

echo "✅ Database backup created: $BACKUP_DIR/backup_$DATE.sql.gz"

# Clean up old backups (keep last 30 days)
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "🧹 Cleaned up old backups"