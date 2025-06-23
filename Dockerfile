# MedRec - Enhanced Dockerfile with runtime secrets support
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

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S medrec -u 1001

WORKDIR /app

# Copy package files and install production deps
COPY package*.json ./
RUN npm ci --only=production --legacy-peer-deps --ignore-scripts

# Copy built web app and backend
COPY --from=builder /app/dist ./web-build
COPY backend/ ./backend/
COPY src/assets/ ./src/assets/

# Change ownership to non-root user
RUN chown -R medrec:nodejs /app
USER medrec

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); const options = { host: 'localhost', port: 3000, timeout: 2000 }; const request = http.request(options, (res) => { console.log('OK'); process.exit(0); }); request.on('error', () => process.exit(1)); request.end();"

# Expose port
EXPOSE 3000

# Runtime environment variables (will be injected by Azure)
ENV NODE_ENV=production
ENV PORT=3000
# These will be set at runtime by Azure Container Apps:
# ENV DATABASE_URL=
# ENV JWT_SECRET=
# ENV API_KEY=

# Start server
CMD ["node", "backend/server.js"]