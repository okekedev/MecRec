# MedRec - Fixed Dockerfile using webpack export command
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

# Copy configuration files (including webpack.config.js!)
COPY app.json ./
COPY webpack.config.js ./
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

# ✅ FIXED: Use webpack export command instead of regular export for web
RUN npx expo export:web --output-dir dist

# Verify environment variables are in the built bundle
RUN echo "=== Build Complete ===" && ls -la dist/
RUN echo "=== Checking for environment variables in bundle ===" && \
    if find dist -name "*.js" -type f -exec grep -l "79865dd8" {} \; | head -1; then \
      echo "✅ Environment variables found in bundle!"; \
    else \
      echo "❌ Environment variables NOT found in bundle"; \
      echo "Checking what values were actually used:"; \
      find dist -name "*.js" -type f -exec grep -o "AZURE_[A-Z_]*" {} \; | head -5 || echo "No AZURE variables found"; \
    fi

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