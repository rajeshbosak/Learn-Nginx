# Nginx Demo: React Frontend and Node.js Backend

This repository contains a simple React CRUD frontend and an Express backend. It is used to practice serving a frontend with Nginx and proxying API traffic to a backend Node.js application.

## Project Structure

```text
.
├── simple-crud-frontend/     # React + Vite frontend
├── simple-crud-backend/      # Express backend API
├── microservices-app/        # Extra Node.js microservice examples
└── samle-nginnx-config.conf  # Nginx examples and notes
```

## Backend

The backend runs on port `5000` by default and exposes these routes:

```text
GET    /items
GET    /items/:id
POST   /items
DELETE /items/:id
```

Run locally:

```bash
cd simple-crud-backend
npm install
node server.js
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

## Frontend

The frontend is a React + Vite app.

Run locally:

```bash
cd simple-crud-frontend
npm install
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

## Recommended Nginx Setup: Same Domain

Use this setup when the frontend and backend are accessed from the same domain. The browser calls `/items`, and Nginx forwards only API requests to the backend.

```nginx
server {
    listen 80;
    server_name _;

    root /var/www/react-crud-app;
    index index.html;

    location = /items {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /items/ {
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
http://your-domain.com/        -> React frontend
http://your-domain.com/items   -> Express backend at http://localhost:5000/items
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
```

Example Nginx-routed load test:

```bash
autocannon -c 100 -d 20 http://localhost/items
```

Increase concurrency gradually. Very high values like `-c 1000000` can crash the load-testing client itself before the backend produces useful logs.

## Git Notes

The root `.gitignore` ignores dependencies, build output, `.env` files, generated logs, editor files, and crash dumps across all subprojects.

Generated log files are intentionally not committed. The backend keeps `simple-crud-backend/logs/.gitkeep` only so the logs folder exists in the repo.
