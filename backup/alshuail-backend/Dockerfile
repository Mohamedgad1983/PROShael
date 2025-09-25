# Al-Shuail Backend API - Production Docker Image
# Multi-stage build for optimized production deployment
# Supports Arabic text processing and Islamic calendar features

# ================================
# Stage 1: Build Dependencies
# ================================
FROM node:18-alpine AS dependencies

# Set working directory
WORKDIR /app

# Install system dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    librsvg-dev

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci --only=production && npm cache clean --force

# ================================
# Stage 2: Production Runtime
# ================================
FROM node:18-alpine AS production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S alshuail -u 1001

# Set working directory
WORKDIR /app

# Install runtime system dependencies
RUN apk add --no-cache \
    cairo \
    jpeg \
    pango \
    giflib \
    librsvg \
    tzdata \
    curl

# Set timezone for proper Islamic calendar calculations
ENV TZ=Asia/Riyadh

# Copy production dependencies from dependencies stage
COPY --from=dependencies --chown=alshuail:nodejs /app/node_modules ./node_modules

# Copy application source code
COPY --chown=alshuail:nodejs . .

# Create necessary directories
RUN mkdir -p /app/logs /app/uploads /app/temp && \
    chown -R alshuail:nodejs /app/logs /app/uploads /app/temp

# Set file permissions
RUN chmod +x healthcheck.js

# Environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Expose application port
EXPOSE 3001

# Switch to non-root user
USER alshuail

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node healthcheck.js

# Start the application
CMD ["node", "server.js"]

# Labels for metadata
LABEL \
    name="alshuail-backend" \
    version="1.0.0" \
    description="Al-Shuail Family Management System API" \
    maintainer="Al-Shuail Development Team" \
    org.opencontainers.image.title="Al-Shuail Backend API" \
    org.opencontainers.image.description="Premium Arabic RTL Family Management System Backend" \
    org.opencontainers.image.version="1.0.0" \
    org.opencontainers.image.created="2024-09-21" \
    org.opencontainers.image.revision="${GITHUB_SHA}" \
    org.opencontainers.image.source="https://github.com/Mohamedgad1983/PROShael"