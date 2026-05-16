# Nginx Demo: React Frontend and Node.js Backend

This repository contains a React dashboard and an Express backend. It is used to practice serving a frontend with Nginx, proxying API traffic, observing headers/logs/metrics, caching, rate limiting, timeout behavior, and load testing.

## Project Structure

```text
.
├── simple-crud-frontend/     # React + Vite operations dashboard
├── simple-crud-backend/      # Express backend API and learning endpoints
├── microservices-app/        # Extra Node.js microservice examples
└── samle-nginnx-config.conf  # Nginx examples and notes
```

## Backend

The backend runs on port `5000` by default and exposes these routes:

```text
GET    /
GET    /health
GET    /ready
GET    /metrics
GET    /debug/headers
GET    /debug/request-id
GET    /items
GET    /items/:id
POST   /items
DELETE /items/:id
GET    /api/v1/items?page=1&limit=10&q=proxy&category=cache
POST   /api/v1/items/bulk
POST   /api/v1/orders
GET    /api/v1/orders
POST   /admin/reset
GET    /stream/events
GET    /slow?ms=1000
GET    /unstable?failRate=0.5
GET    /status/:code
GET    /payload?kb=10
GET    /cpu?ms=100
GET    /cache/products
```

Run locally:

```bash
cd simple-crud-backend
npm install
cp .env.example .env
node server.js
```

Or:

```bash
npm start
```

The backend writes logs to:

```text
simple-crud-backend/logs/app.log       # all logs
simple-crud-backend/logs/verbose.log   # request/runtime logs
simple-crud-backend/logs/errors.log    # error logs only
```

Watch logs during testing:

```bash
tail -f simple-crud-backend/logs/verbose.log
tail -f simple-crud-backend/logs/errors.log
```

### What the Backend Teaches

```text
/health and /ready        uptime checks and load balancer probes
/metrics                  request counts, latency, errors, memory usage
/debug/headers            Host and X-Forwarded-* behavior through Nginx
/debug/request-id         request correlation with X-Request-ID
/slow                     proxy_read_timeout and slow upstream behavior
/unstable                 synthetic 500 errors for logs and retry testing
/status/:code             status-code routing and Nginx error behavior
/payload                  large response testing
/cpu                      CPU-bound endpoint for saturation tests
/cache/products           proxy_cache HIT/MISS behavior
/api/v1/items             pagination, search, and path-based API routing
/api/v1/items/bulk        data seeding before load tests
/api/v1/orders            idempotency-key behavior for safe retries
/admin/reset              protected admin route using x-admin-token
/stream/events            server-sent events and proxy buffering behavior
```

## Frontend

The frontend is a React + Vite dashboard for exercising the backend routes through direct backend calls or through Nginx.

Run locally:

```bash
cd simple-crud-frontend
npm install
cp .env.example .env
npm run dev
```

Build for Nginx:

```bash
cd simple-crud-frontend
npm run build
```

Copy the generated build to the Nginx web root:

```bash
sudo mkdir -p /var/www/react-crud-app
sudo cp -r dist/* /var/www/react-crud-app/
```

### Frontend Dashboard Guide

The frontend is not only a CRUD screen. It is an operations-style dashboard for learning how frontend traffic behaves when it goes through Nginx and reaches the backend.

#### Top Status Bar

The top bar shows the app name, app version, and API mode.

```text
API mode: same-domain proxy
```

means the frontend is calling relative URLs like `/items`. This is the recommended mode when React is served by Nginx and Nginx proxies API routes to the backend.

```text
API host: http://localhost:5000
```

means the frontend is directly calling the backend. This is useful during local Vite development.

#### Items API

This section uses the basic CRUD routes:

```text
GET    /items
POST   /items
DELETE /items/:id
```

Use it to confirm that the frontend can reach the backend. If this section loads data, your API connection is working.

What to learn:

```text
Frontend -> Nginx -> Backend proxy flow
Basic request logging
Rate limiting on write operations
4xx errors when validation fails
```

#### Scenario Runner

This section runs common backend diagnostics.

```text
Health check          GET /health
Readiness check       GET /ready
Metrics               GET /metrics
Forwarded headers     GET /debug/headers
Cacheable products    GET /cache/products
```

Use `Forwarded headers` to verify that Nginx is passing headers like:

```text
Host
X-Real-IP
X-Forwarded-For
X-Forwarded-Proto
```

Use `Cacheable products` with Nginx `proxy_cache`. When configured correctly, repeated requests should show cache behavior using the `X-Cache` response header from Nginx.

What to learn:

```text
Health checks
Readiness checks
Reverse proxy headers
Backend metrics
Nginx proxy caching
```

#### Synthetic Endpoints

This section lets you intentionally create different backend behaviors.

```text
Slow response          GET /slow?ms=1000
Unstable error rate    GET /unstable?failRate=0.5
Synthetic status       GET /status/:code
Payload size           GET /payload?kb=10
CPU work               GET /cpu?ms=100
```

Use these when learning timeout handling, error logs, large responses, and CPU saturation.

Examples:

```text
/slow?ms=8000
```

can help you test `proxy_read_timeout`.

```text
/unstable?failRate=1
```

always throws a backend error, which should appear in `errors.log`.

```text
/payload?kb=1024
```

returns a larger response body so you can test compression, transfer time, and client behavior.

What to learn:

```text
Nginx timeout behavior
Backend error logging
Status code handling
Large payload behavior
CPU-bound request impact
```

#### Advanced Backend Features

This section demonstrates patterns that are common in production services.

Search and pagination:

```text
GET /api/v1/items?page=1&limit=10&q=proxy&category=cache
```

Use this to learn query strings, pagination, filtered APIs, and path-based routing through `/api/`.

Seed test data:

```text
POST /api/v1/items/bulk
```

This creates many in-memory items quickly. Use it before load testing pagination or larger list responses.

Protected admin route:

```text
POST /admin/reset
Header: x-admin-token: local-dev-token
```

This resets demo data. Use it to learn protected routes and how headers pass through Nginx.

Idempotent writes:

```text
POST /api/v1/orders
Header: idempotency-key: order-123
```

If you send the same `idempotency-key` again, the backend returns the same order instead of creating a duplicate. This is a common production pattern for safe retries.

Request correlation:

```text
GET /debug/request-id
Header: x-request-id: web-123
```

The backend returns the request ID and also sets `X-Request-ID` in the response. Use this to connect frontend errors, Nginx access logs, and backend logs.

Server-sent events:

```text
GET /stream/events
```

This opens a short event stream. Use it to learn long-lived HTTP connections and why Nginx needs `proxy_buffering off` for streaming endpoints.

What to learn:

```text
Pagination and filtering
Bulk data setup before load tests
Protected admin operations
Idempotency keys for safe retries
Request IDs for tracing
SSE streaming through Nginx
```

#### Commands to Try

The frontend also shows useful `autocannon` commands. These are examples for testing direct backend traffic and Nginx-routed traffic.

Direct backend:

```bash
autocannon -c 100 -d 20 http://localhost:5000/items
```

Through Nginx:

```bash
autocannon -c 100 -d 20 http://localhost/items
```

Start with small concurrency and increase gradually.

## Recommended Nginx Setup: Same Domain

Use this setup when the frontend and backend are accessed from the same domain. The browser calls `/items`, and Nginx forwards only API requests to the backend.

```nginx
proxy_cache_path /var/cache/nginx/react-crud-app
    levels=1:2
    keys_zone=react_crud_cache:10m
    max_size=100m
    inactive=10m
    use_temp_path=off;

limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

upstream simple_crud_backend {
    least_conn;
    server 127.0.0.1:5000 max_fails=3 fail_timeout=10s;
}

server {
    listen 80;
    server_name _;

    root /var/www/react-crud-app;
    index index.html;

    location ~ ^/(health|ready|metrics)$ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location ~ ^/(items|api|debug|slow|unstable|status|payload|cpu|admin) {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location = /stream/events {
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 60s;
        proxy_set_header Connection "";
        proxy_pass http://localhost:5000;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location = /cache/products {
        proxy_cache react_crud_cache;
        proxy_cache_valid 200 30s;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        add_header X-Cache $upstream_cache_status always;
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri /index.html;
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

With this config:

```text
http://your-domain.com/                 -> React frontend
http://your-domain.com/items            -> Express backend at http://localhost:5000/items
http://your-domain.com/debug/headers    -> inspect forwarded headers
http://your-domain.com/cache/products   -> cacheable upstream response
http://your-domain.com/stream/events    -> long-lived SSE stream
```

This works because `proxy_pass http://localhost:5000;` keeps the original request path. So `/items` remains `/items` when forwarded to the backend.

## Alternative Nginx Setup: Separate API Domain

Use this setup when the frontend and backend have different domains:

```text
myapp.com       -> React frontend
api.myapp.com   -> Express backend
```

Frontend server:

```nginx
server {
    listen 80;
    server_name myapp.com www.myapp.com;

    root /var/www/react-crud-app;
    index index.html;

    location / {
        try_files $uri /index.html;
    }
}
```

Backend API server:

```nginx
server {
    listen 80;
    server_name api.myapp.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

For this subdomain setup, the frontend runtime config should point to the API domain:

```js
window.RUNTIME_CONFIG = {
  VITE_API_HOST: "http://api.myapp.com",
};
```

For same-domain routing, use an empty API host:

```js
window.RUNTIME_CONFIG = {
  VITE_API_HOST: "",
};
```

## Enable Nginx Config

Place your config in `/etc/nginx/sites-available/`, then symlink it into `sites-enabled`:

```bash
sudo nano /etc/nginx/sites-available/react-crud-app
sudo ln -s /etc/nginx/sites-available/react-crud-app /etc/nginx/sites-enabled/react-crud-app
sudo nginx -t
sudo systemctl reload nginx
```

If testing fake domains locally, add them to `/etc/hosts`:

```text
127.0.0.1 myapp.com www.myapp.com api.myapp.com
```

## Load Testing

Example backend load test:

```bash
autocannon -c 100 -d 20 http://localhost:5000/items
autocannon -c 100 -d 20 http://localhost:5000/health
autocannon -c 50 -d 20 http://localhost:5000/slow?ms=250
autocannon -c 25 -d 20 http://localhost:5000/cpu?ms=100
autocannon -c 50 -d 20 'http://localhost:5000/api/v1/items?page=1&limit=20'
```

Example Nginx-routed load test:

```bash
autocannon -c 100 -d 20 http://localhost/items
autocannon -c 100 -d 20 http://localhost/health
autocannon -c 50 -d 20 http://localhost/slow?ms=250
autocannon -c 50 -d 20 'http://localhost/api/v1/items?page=1&limit=20'
```

Increase concurrency gradually. Very high values like `-c 1000000` can crash the load-testing client itself before the backend produces useful logs.

Useful things to watch while testing:

```bash
tail -f simple-crud-backend/logs/verbose.log
tail -f simple-crud-backend/logs/errors.log
curl http://localhost:5000/metrics
curl -I http://localhost/cache/products
```

## Git Notes

The root `.gitignore` ignores dependencies, build output, `.env` files, generated logs, editor files, and crash dumps across all subprojects.

Generated log files are intentionally not committed. The backend keeps `simple-crud-backend/logs/.gitkeep` only so the logs folder exists in the repo.




/api/auth/*     -> localhost:4001
/api/users/*    -> localhost:4002
/api/products/* -> localhost:4003