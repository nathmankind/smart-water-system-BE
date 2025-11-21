# Dockerfile for NestJS
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy package files
COPY package*.json ./

# Install ALL dependencies (we need typeorm CLI for migrations)
RUN npm ci && npm cache clean --force

# Install only production dependencies
# RUN npm ci --only=production

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Copy migrations and config
COPY --from=builder /app/src/migrations ./src/migrations
COPY --from=builder /app/src/config/typeorm.config.ts ./src/config/typeorm.config.ts

# Copy entities for migration (TypeORM needs them)
COPY --from=builder /app/src/users/entities ./src/users/entities
COPY --from=builder /app/src/companies/entities ./src/companies/entities
COPY --from=builder /app/src/locations/entities ./src/locations/entities

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001
USER nestjs

# Expose the port your NestJS app runs on (default is 3000)
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/main"]