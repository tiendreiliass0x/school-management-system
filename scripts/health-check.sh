#!/bin/bash

# Health check script for all services
set -e

TIMEOUT=300  # 5 minutes timeout
INTERVAL=5   # Check every 5 seconds

check_service() {
    local service_name=$1
    local health_url=$2
    local elapsed=0

    echo "⏳ Checking $service_name..."

    while [ $elapsed -lt $TIMEOUT ]; do
        if curl -f -s $health_url > /dev/null 2>&1; then
            echo "✅ $service_name is healthy"
            return 0
        fi
        
        echo "⏳ Waiting for $service_name... (${elapsed}s)"
        sleep $INTERVAL
        elapsed=$((elapsed + INTERVAL))
    done

    echo "❌ $service_name failed to become healthy within ${TIMEOUT}s"
    return 1
}

echo "🔍 Starting health checks..."

# Check backend API
check_service "Backend API" "http://localhost:8000/health"

# Check frontend
check_service "Frontend" "http://localhost:3000"

# Check nginx (if running)
if docker-compose ps nginx | grep -q "Up"; then
    check_service "Nginx" "http://localhost:80/health"
fi

echo "🎉 All services are healthy!"