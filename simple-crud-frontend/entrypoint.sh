#!/bin/sh

# Generate runtime config from template with environment variables
sed \
  -e "s|__VITE_API_HOST__|${VITE_API_HOST:-}|g" \
  -e "s|__VITE_API_TIMEOUT__|${VITE_API_TIMEOUT:-30000}|g" \
  -e "s|__VITE_API_RETRY_COUNT__|${VITE_API_RETRY_COUNT:-3}|g" \
  -e "s|__APP_NAME__|${APP_NAME:-Simple CRUD App}|g" \
  -e "s|__APP_VERSION__|${APP_VERSION:-1.0.0}|g" \
  -e "s|__ENVIRONMENT__|${ENVIRONMENT:-production}|g" \
  -e "s|__ENABLE_ANALYTICS__|${ENABLE_ANALYTICS:-false}|g" \
  -e "s|__ENABLE_DEBUG_MODE__|${ENABLE_DEBUG_MODE:-false}|g" \
  /usr/share/nginx/html/runtime-config.js.template > /usr/share/nginx/html/runtime-config.js

# Start nginx
exec nginx -g "daemon off;"
