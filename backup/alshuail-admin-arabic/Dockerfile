# Al-Shuail Frontend - Production Dockerfile
# Multi-stage build for optimized production deployment
# Supports Arabic RTL layout and premium design components

# ================================
# Stage 1: Build Dependencies
# ================================
FROM node:18-alpine AS dependencies

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm ci --prefer-offline && npm cache clean --force

# ================================
# Stage 2: Build Application
# ================================
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build arguments
ARG REACT_APP_API_URL
ARG REACT_APP_ENV=production
ARG GENERATE_SOURCEMAP=false

# Set environment variables for build
ENV NODE_ENV=production
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_ENV=$REACT_APP_ENV
ENV GENERATE_SOURCEMAP=$GENERATE_SOURCEMAP
ENV INLINE_RUNTIME_CHUNK=false

# Build the application
RUN npm run build

# Optimize build output
RUN ls -la build/ && \
    du -sh build/

# ================================
# Stage 3: Production Runtime
# ================================
FROM nginx:alpine AS production

# Install additional tools
RUN apk add --no-cache \
    curl \
    tzdata

# Set timezone for Arabic regions
ENV TZ=Asia/Riyadh

# Create non-root user
RUN addgroup -g 1001 -S alshuail && \
    adduser -S frontend -u 1001 -G alshuail

# Copy built application
COPY --from=builder --chown=frontend:alshuail /app/build /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create directories for logs and cache
RUN mkdir -p /var/log/nginx /var/cache/nginx && \
    chown -R frontend:alshuail /var/log/nginx /var/cache/nginx && \
    chown -R frontend:alshuail /usr/share/nginx/html

# Set file permissions
RUN chmod -R 755 /usr/share/nginx/html

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Create health check endpoint
RUN echo '<!DOCTYPE html><html><head><title>Health Check</title></head><body><h1>Al-Shuail Frontend - Healthy</h1><p>Status: OK</p><p>Environment: Production</p></body></html>' > /usr/share/nginx/html/health

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# Labels for metadata
LABEL \
    name="alshuail-frontend" \
    version="1.0.0" \
    description="Al-Shuail Family Management System Frontend" \
    maintainer="Al-Shuail Development Team" \
    org.opencontainers.image.title="Al-Shuail Frontend" \
    org.opencontainers.image.description="Premium Arabic RTL Family Management System Frontend" \
    org.opencontainers.image.version="1.0.0" \
    org.opencontainers.image.created="2024-09-21" \
    org.opencontainers.image.revision="${GITHUB_SHA}" \
    org.opencontainers.image.source="https://github.com/Mohamedgad1983/PROShael"