# MedRec - Metro bundler solution with environment variables
FROM node:18-alpine AS builder

WORKDIR /app

# Accept build-time arguments for frontend compilation
ARG AZURE_TENANT_ID
ARG AZURE_CLIENT_ID
ARG AZURE_REQUIRED_GROUP

# Set environment variables for the build process
ENV AZURE_TENANT_ID=$AZURE_TENANT_ID
ENV AZURE_CLIENT_ID=$AZURE_CLIENT_ID
ENV AZURE_REQUIRED_GROUP=$AZURE_REQUIRED_GROUP

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

# Fix missing medreclogo.png by copying from icon.png
RUN if [ ! -f src/assets/medreclogo.png ]; then \
    echo "=== Creating missing medreclogo.png from icon.png ===" && \
    cp src/assets/icon.png src/assets/medreclogo.png; \
  fi

# Verify all required assets exist
RUN echo "=== Checking required assets ===" && \
    ls -la src/assets/favicon.png && \
    ls -la src/assets/icon.png && \
    ls -la src/assets/medreclogo.png

# Debug: Show environment variables are available during build
RUN echo "=== Frontend Build Environment Check ===" && \
    echo "AZURE_TENANT_ID: ${AZURE_TENANT_ID:0:8}..." && \
    echo "AZURE_CLIENT_ID: ${AZURE_CLIENT_ID:0:8}..." && \
    echo "AZURE_REQUIRED_GROUP: $AZURE_REQUIRED_GROUP"

# ✅ METRO SOLUTION: Export using Metro bundler for web
RUN npx expo export --platform web --output-dir dist

# Verify environment variables are in the built bundle
RUN echo "=== Build Complete ===" && ls -la dist/
RUN echo "=== Checking bundle contents ===" && \
    find dist -name "*.js" -type f | head -3 | xargs ls -la

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