# MedRec - Fixed Dockerfile with Required Dependencies
# Canvas package needs native compilation tools

# Stage 1: Build the React Native Web app
FROM node:18-alpine AS builder

# Install build dependencies (needed for canvas package)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    pixman-dev \
    musl-dev

WORKDIR /app

# Copy package files and install with legacy peer deps
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source and build
COPY . .
RUN npm run web:build

# Stage 2: Production runtime
FROM node:18-alpine AS production

# Install runtime dependencies (needed for canvas at runtime)
RUN apk add --no-cache \
    cairo \
    pango \
    jpeg \
    giflib \
    pixman

WORKDIR /app

# Production install with legacy peer deps
COPY package*.json ./
RUN npm ci --only=production --legacy-peer-deps

# Copy built app and backend
COPY --from=builder /app/web-build ./web-build
COPY backend/ ./backend/
COPY src/assets/ ./src/assets/

# Expose port and start
EXPOSE 3000
CMD ["node", "backend/server.js"]