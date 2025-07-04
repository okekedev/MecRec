# MedRec - Proper Expo Metro solution with EXPO_PUBLIC_ environment variables
# Enhanced with no-cache flags for clean builds every time
FROM node:18-alpine AS builder

WORKDIR /app

# Accept build-time arguments for frontend compilation
ARG AZURE_TENANT_ID
ARG AZURE_CLIENT_ID
ARG AZURE_REQUIRED_GROUP

# ✅ CRITICAL: Set EXPO_PUBLIC_ prefixed environment variables
ENV EXPO_PUBLIC_AZURE_TENANT_ID=$AZURE_TENANT_ID
ENV EXPO_PUBLIC_AZURE_CLIENT_ID=$AZURE_CLIENT_ID
ENV EXPO_PUBLIC_AZURE_REQUIRED_GROUP=$AZURE_REQUIRED_GROUP

# Copy package files
COPY package*.json ./

# Install dependencies with no cache to ensure fresh packages
RUN npm install --legacy-peer-deps --ignore-scripts --no-cache

# Copy configuration files
COPY app.config.js ./
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

# Debug: Show environment variables are available during build
RUN echo "=== Frontend Build Environment Check ===" && \
    echo "EXPO_PUBLIC_AZURE_TENANT_ID: ${EXPO_PUBLIC_AZURE_TENANT_ID:0:8}..." && \
    echo "EXPO_PUBLIC_AZURE_CLIENT_ID: ${EXPO_PUBLIC_AZURE_CLIENT_ID:0:8}..." && \
    echo "EXPO_PUBLIC_AZURE_REQUIRED_GROUP: $EXPO_PUBLIC_AZURE_REQUIRED_GROUP"

# ✅ METRO SOLUTION: Export using Metro bundler for web with aggressive cache clearing
RUN echo "=== Clearing all caches and exporting ===" && \
    # Clear npm cache
    npm cache clean --force && \
    # Clear Expo cache
    npx expo install --fix && \
    # Clear Metro cache and export with multiple cache-busting flags
    npx expo export --platform web --output-dir dist --clear --reset-cache --no-minify

# Debug: Check if environment variables are actually in the bundle
RUN echo "=== Checking if EXPO_PUBLIC variables are in the bundle ===" && \
    find dist -name "*.js" -type f -exec grep -l "EXPO_PUBLIC_AZURE_TENANT_ID\|${EXPO_PUBLIC_AZURE_TENANT_ID:0:8}" {} \; | head -3 || echo "Variables not found in bundle - this may be normal if they're fully inlined"

# Debug: Show bundle structure
RUN echo "=== Bundle structure ===" && \
    ls -la dist/ && \
    echo "=== Static assets ===" && \
    ls -la dist/_expo/static/js/ | head -5

# Verify build output
RUN echo "=== Build Complete ===" && ls -la dist/

# Production stage - Start fresh for minimal image
FROM node:18-alpine AS production

WORKDIR /app

# Only install the backend dependencies we actually need (no cache)
RUN npm init -y && \
    npm install --no-cache express@^4.21.2 cors@^2.8.5 dotenv@^16.5.0 openai@^5.0.1

# Copy built web app and backend
COPY --from=builder /app/dist ./web-build
COPY backend/ ./backend/

# Final verification
RUN echo "=== Production stage verification ===" && \
    ls -la web-build/ && \
    ls -la backend/

# Start server
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "backend/server.js"]