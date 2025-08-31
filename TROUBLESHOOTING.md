# Troubleshooting Guide

## CORS Issues

### Error: "Response body is not available to scripts (Reason: CORS Allow Origin Not Matching Origin)"

This error occurs when the frontend and backend have mismatched CORS origins. Here's how to fix it:

#### 1. Check Environment Configuration

**Backend (.env):**
```bash
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

**Frontend (.env.local):**
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

#### 2. Verify Services are Running

```bash
# Check backend
curl http://localhost:8000/health

# Check frontend
curl http://localhost:3000

# Test CORS specifically
./scripts/test-cors.sh
```

#### 3. Common Solutions

**Solution 1: Restart Services**
```bash
# Backend
cd backend
bun run dev

# Frontend (new terminal)
cd frontend
npm run dev
```

**Solution 2: Check URLs Match**
- Frontend should call `http://localhost:8000`
- Backend should allow `http://localhost:3000`
- Make sure no trailing slashes or typos

**Solution 3: Browser Cache**
```bash
# Clear browser cache or try incognito mode
# Or disable browser cache in DevTools
```

**Solution 4: Check Docker Setup**
If using Docker, make sure services can communicate:
```bash
docker-compose ps
docker-compose logs backend
docker-compose logs frontend
```

#### 4. Development vs Production

**Development (Permissive):**
- Allows all localhost origins
- More debugging information
- Less strict security headers

**Production (Strict):**
- Only allows specified origins
- Strict security headers
- No debugging endpoints

#### 5. Testing CORS

Use the built-in test endpoint:
```bash
curl -H "Origin: http://localhost:3000" http://localhost:8000/cors-test
```

Expected response should include CORS headers.

## Authentication Issues

### Error: "No authentication token" or 401 Unauthorized

#### Solutions:
1. **Login again** - Token may have expired
2. **Check localStorage** - Token should be stored in browser
3. **Verify JWT secret** - Backend `.env` should have `JWT_SECRET`
4. **Check token format** - Should be `Bearer <token>`

## Database Issues

### Error: "Connection refused" or database errors

#### Solutions:
1. **Start database:**
   ```bash
   docker-compose up -d postgres
   ```

2. **Check connection string:**
   ```bash
   DATABASE_URL="postgresql://postgres:postgres123%23@localhost:5432/school_management"
   ```

3. **Run migrations:**
   ```bash
   bun run migrate
   bun run seed
   ```

## Performance Issues

### Slow loading or timeouts

#### Solutions:
1. **Check network tab** in browser DevTools
2. **Verify API responses** are reasonable size
3. **Check database queries** for missing indexes
4. **Enable caching** with Redis

## Development Setup

### Quick Start Checklist

- [ ] Backend running on port 8000
- [ ] Frontend running on port 3000
- [ ] Database running (PostgreSQL)
- [ ] Environment files configured
- [ ] CORS allows localhost origins
- [ ] JWT secret is set
- [ ] Database migrated and seeded

### Environment Variables Required

**Backend:**
- `DATABASE_URL`
- `JWT_SECRET`
- `NODE_ENV=development`
- `ALLOWED_ORIGINS=http://localhost:3000`

**Frontend:**
- `NEXT_PUBLIC_API_URL=http://localhost:8000`

## Getting Help

1. **Check browser console** for detailed error messages
2. **Check server logs** for backend errors
3. **Use network tab** to see actual HTTP requests/responses
4. **Test API directly** with curl or Postman
5. **Check this troubleshooting guide** for common solutions

## Useful Commands

```bash
# Test API health
curl http://localhost:8000/health

# Test CORS
./scripts/test-cors.sh

# Check running services
docker-compose ps

# View logs
docker-compose logs backend
docker-compose logs frontend

# Restart everything
docker-compose restart

# Reset database
docker-compose down -v
docker-compose up -d
bun run migrate && bun run seed
```