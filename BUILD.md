# Build Guide

## Backend Production Build

### Quick Start
```bash
# Navigate to backend
cd backend

# Build for production
bun run build:production

# Start production build
bun run start:production
```

### Available Build Commands

| Command | Description | Use Case |
|---------|-------------|----------|
| `bun run build` | Development build with sourcemaps | Debugging production issues |
| `bun run build:production` | Optimized production build | Production deployment |
| `bun run start:production` | Start production build | Running built application |
| `bun run preview` | Build and test locally | Pre-deployment testing |
| `bun run clean` | Remove build artifacts | Clean slate builds |
| `bun run typecheck` | TypeScript validation | CI/CD type checking |

### Build Features

#### Production Optimizations
- **Minification**: Code is minified for smaller bundle size
- **Tree Shaking**: Unused code is removed
- **Code Splitting**: Optimal bundle splitting for performance
- **Source Maps**: Optional debug information
- **Type Checking**: Full TypeScript validation

#### Build Output
```
dist/
├── index.js          # Main application bundle
├── index.js.map      # Source map (if enabled)
└── chunks/           # Split chunks (if enabled)
```

### Environment-Specific Builds

#### Development Build
```bash
bun run build
```
- Includes source maps
- Faster build time
- Larger bundle size
- Debug information included

#### Production Build
```bash
bun run build:production
```
- Minified and optimized
- No source maps (smaller size)
- Tree shaking enabled
- Code splitting enabled
- Environment set to production

### Docker Production Build

The Dockerfile automatically uses production build:

```dockerfile
# Build stage
RUN bun run build:production

# Runtime stage
CMD ["bun", "run", "start:production"]
```

### CI/CD Integration

#### GitHub Actions Example
```yaml
- name: Build Backend
  run: |
    cd backend
    bun install --frozen-lockfile
    bun run typecheck
    bun run build:production
```

#### Build Verification
```bash
# Build with testing
./scripts/build-backend.sh --test

# This will:
# 1. Clean previous builds
# 2. Install dependencies
# 3. Run type checking
# 4. Build for production
# 5. Test the build can start
# 6. Verify health endpoint
```

### Performance Optimization

#### Bundle Analysis
To analyze bundle size and dependencies:
```bash
# Build with analysis
bun run build:production

# Check build size
du -h dist/index.js

# List all files in build
find dist -type f -exec ls -lh {} \;
```

#### Build Metrics
The build script provides metrics:
- Bundle size
- Number of files
- Build time
- Type check results

### Troubleshooting

#### Common Issues

**Build Fails with Type Errors:**
```bash
# Check types first
bun run typecheck

# Fix type errors and rebuild
bun run build:production
```

**Bundle Size Too Large:**
```bash
# Check dependencies
bun deps

# Review imports for unused modules
# Consider code splitting optimizations
```

**Runtime Errors in Production:**
```bash
# Build with source maps for debugging
bun run build

# Test locally first
bun run preview
```

#### Debug Commands
```bash
# Clean build from scratch
bun run clean && bun run build:production

# Verbose build output
DEBUG=1 bun run build:production

# Test production build locally
bun run preview
```

### Best Practices

#### Before Building
- [ ] Run `bun run typecheck` to verify types
- [ ] Test application with `bun run dev`
- [ ] Update environment variables for production
- [ ] Review dependencies for security

#### Production Deployment
- [ ] Use `bun run build:production` for smallest bundle
- [ ] Test build with `./scripts/build-backend.sh --test`
- [ ] Verify health check endpoint works
- [ ] Monitor application startup and performance

#### Performance Monitoring
- [ ] Measure bundle size over time
- [ ] Monitor application startup time
- [ ] Track memory usage in production
- [ ] Set up error monitoring and logging

### Integration with Frontend

The backend build process integrates with the frontend deployment:

1. **Backend builds** to `dist/` directory
2. **Docker image** includes built backend
3. **Frontend connects** to backend API
4. **Nginx routes** requests appropriately

This ensures optimal performance and reliable deployments across the entire application stack.