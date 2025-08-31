#!/bin/bash

# Backend Production Build Script
set -e

echo "🔨 Building School Management Backend for Production..."

# Navigate to backend directory
cd backend

# Clean previous build
echo "🧹 Cleaning previous build..."
bun run clean

# Install production dependencies
echo "📦 Installing dependencies..."
bun install --frozen-lockfile

# Type checking
echo "🔍 Running type checks..."
if ! bun run typecheck; then
    echo "❌ Type checking failed!"
    exit 1
fi

# Build for production
echo "🏗️ Building for production..."
bun run build:production

# Verify build output exists
if [ ! -f "dist/index.js" ]; then
    echo "❌ Build failed - dist/index.js not found!"
    exit 1
fi

# Display build info
echo "✅ Build completed successfully!"
echo "📊 Build information:"
echo "   - Output: dist/index.js"
echo "   - Size: $(du -h dist/index.js | cut -f1)"
echo "   - Files: $(find dist -type f | wc -l) files"

# Test the build can start (optional)
if [ "$1" = "--test" ]; then
    echo "🧪 Testing production build..."
    timeout 10s bun run start:production &
    PID=$!
    sleep 5
    
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        echo "✅ Production build test passed!"
    else
        echo "❌ Production build test failed!"
        exit 1
    fi
    
    kill $PID 2>/dev/null || true
fi

echo "🎉 Backend production build ready for deployment!"