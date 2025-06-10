# MedRec - Simple Dockerfile with favicon support
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps --ignore-scripts

# Copy configuration files
COPY app.json ./
COPY metro.config.js ./
COPY babel.config.js ./

# Copy entry points and source
COPY App.js ./
COPY index.js ./
COPY src/ ./src/

# Verify favicon exists
RUN echo "=== Checking favicon ===" && ls -la src/assets/favicon.png

# Export for web
RUN npx expo export --platform web --output-dir dist

# Verify output
RUN echo "=== Export Complete ===" && ls -la dist/

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy package files and install production deps
COPY package*.json ./
RUN npm ci --only=production --legacy-peer-deps --ignore-scripts

# Copy built web app and backend
COPY --from=builder /app/dist ./web-build
COPY backend/ ./backend/
COPY src/assets/ ./src/assets/

# Start server
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "backend/server.js"]