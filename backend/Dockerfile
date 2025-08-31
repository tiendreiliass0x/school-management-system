# Use Bun base image for better performance
FROM oven/bun:1.1.42 as base

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN groupadd -g 1001 -r nodejs && \
    useradd -r -g nodejs -u 1001 nodejs

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# Copy source code
COPY . .

# Build the application for production
RUN bun run build:production

# Create logs directory and set permissions
RUN mkdir -p logs dist && \
    chown -R nodejs:nodejs logs dist

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun run healthcheck || exit 1

# Start the production build
CMD ["bun", "run", "start:production"]