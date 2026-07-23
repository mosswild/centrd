# Stage 1: Build static frontend assets
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production runtime container
FROM node:20-alpine AS runner

WORKDIR /app

# Install su-exec for Linuxserver-style runtime user/group mapping (PUID/PGID)
RUN apk add --no-cache su-exec

# Copy package metadata and install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy backend server code and entrypoint script
COPY server/ ./server/
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Copy built frontend assets from builder stage
COPY --from=builder /app/dist ./dist

# Environment variables for default Docker configuration
ENV NODE_ENV=production \
    PORT=5001 \
    DATA_DIR=/config/data \
    UPLOADS_DIR=/config/uploads \
    PUID=1000 \
    PGID=1000

# Declare persistent volume mount point
VOLUME ["/config"]

EXPOSE 5001

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "start"]
