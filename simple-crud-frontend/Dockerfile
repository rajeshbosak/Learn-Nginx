# Multi-stage Dockerfile for building and running the React app

# Build stage
FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Copy runtime config template
COPY runtime-config/runtime-config.js.template dist/

# Production stage
FROM nginx:alpine

# Copy built files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy runtime config template
COPY runtime-config/runtime-config.js.template /usr/share/nginx/html/

# Generate runtime config from template with environment variables
RUN sed \
  -e "s|__VITE_API_HOST__|${VITE_API_HOST:-http://localhost:5000}|g" \
  -e "s|__VITE_API_TIMEOUT__|${VITE_API_TIMEOUT:-30000}|g" \
  -e "s|__VITE_API_RETRY_COUNT__|${VITE_API_RETRY_COUNT:-3}|g" \
  -e "s|__APP_NAME__|${APP_NAME:-Simple CRUD App}|g" \
  -e "s|__APP_VERSION__|${APP_VERSION:-1.0.0}|g" \
  -e "s|__ENVIRONMENT__|${ENVIRONMENT:-production}|g" \
  -e "s|__ENABLE_ANALYTICS__|${ENABLE_ANALYTICS:-false}|g" \
  -e "s|__ENABLE_DEBUG_MODE__|${ENABLE_DEBUG_MODE:-false}|g" \
  /usr/share/nginx/html/runtime-config.js.template > /usr/share/nginx/html/runtime-config.js && \
  rm /usr/share/nginx/html/runtime-config.js.template

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]