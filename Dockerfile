# MedRec - Final Metro-only solution
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

# Copy configuration files and CSS
COPY app.config.js ./
COPY metro.config.js ./
COPY babel.config.js ./
COPY *.css ./ || true

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
    echo "AZURE_TENANT_ID: ${AZURE_TENANT_ID:0:8}..." && \
    echo "AZURE_CLIENT_ID: ${AZURE_CLIENT_ID:0:8}..." && \
    echo "AZURE_REQUIRED_GROUP: $AZURE_REQUIRED_GROUP"

# ✅ METRO SOLUTION: Export using Metro bundler for web
RUN npx expo export --platform web --output-dir dist

# Verify build output
RUN echo "=== Build Complete ===" && ls -la dist/

# Production stage - Start fresh for minimal image
FROM node:18-alpine AS production

WORKDIR /app

# Only install the backend dependencies we actually need
RUN npm init -y && \
    npm install express@^4.21.2 cors@^2.8.5 dotenv@^16.5.0 openai@^5.0.1

# Copy built web app and backend
COPY --from=builder /app/dist ./web-build
COPY backend/ ./backend/

# Start server
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "backend/server.js"]