#!/bin/bash

echo "🔍 Testing CORS configuration..."

# Test 1: Basic health check
echo "1. Testing basic health check..."
curl -i -X GET http://localhost:8000/health

echo -e "\n\n2. Testing CORS preflight request..."
curl -i -X OPTIONS \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type, Authorization" \
  http://localhost:8000/api/auth/login

echo -e "\n\n3. Testing CORS debugging endpoint..."
curl -i -X GET \
  -H "Origin: http://localhost:3000" \
  http://localhost:8000/cors-test

echo -e "\n\n4. Testing actual API call with CORS headers..."
curl -i -X POST \
  -H "Origin: http://localhost:3000" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}' \
  http://localhost:8000/api/auth/login

echo -e "\n\n✅ CORS tests completed!"