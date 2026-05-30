# =====================================================
# BUILD STAGE
# =====================================================

FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the React/Vite app
RUN npm run build

# =====================================================
# PRODUCTION STAGE
# =====================================================

FROM nginx:alpine

# Copy built frontend files
COPY --from=build /app/dist /usr/share/nginx/html

# Copy runtime config template
COPY runtime-config/runtime-config.js.template /usr/share/nginx/html/

# Copy runtime entrypoint script
COPY entrypoint.sh /entrypoint.sh

# Make script executable
RUN chmod +x /entrypoint.sh

# Expose nginx port
EXPOSE 80

# Start container using entrypoint
ENTRYPOINT ["/entrypoint.sh"]