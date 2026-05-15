# Simple CRUD Backend

- Rate limiting has been implemented in this project.

## Run Locally

Install dependencies:

```bash
npm install
```

Start the server:

```bash
npm start
```

By default, the app runs on port `5000`. To run on a custom port:

```bash
PORT=5001 npm start
```

## Run With PM2

This app reads the port from the `PORT` environment variable:

```js
const PORT = process.env.PORT || 5000;
```

Because of that, you can run the same `server.js` file on multiple ports by starting multiple PM2 apps.

### Start Multiple Ports Manually

Go to the backend folder:

```bash
cd /home/rajesh/Documents/Coding/nginx_demo/simple-crud-backend
```

Start one PM2 process for each port:

```bash
PORT=5000 pm2 start server.js --name crud-api-5000
PORT=5001 pm2 start server.js --name crud-api-5001
PORT=5002 pm2 start server.js --name crud-api-5002
```

Check running apps:

```bash
pm2 list
```

View logs:

```bash
pm2 logs
```

Test each port:

```bash
curl http://localhost:5000/health
curl http://localhost:5001/health
curl http://localhost:5002/health
```

Save the PM2 process list:

```bash
pm2 save
```

Enable PM2 startup after reboot:

```bash
pm2 startup
```

After running `pm2 startup`, PM2 may print one extra command. Copy and run that command once.

### Start Multiple Ports With Ecosystem File

Create `ecosystem.config.js` inside `simple-crud-backend`:

```js
module.exports = {
  apps: [
    {
      name: "crud-api-5000",
      script: "server.js",
      env: {
        PORT: 5000,
      },
    },
    {
      name: "crud-api-5001",
      script: "server.js",
      env: {
        PORT: 5001,
      },
    },
    {
      name: "crud-api-5002",
      script: "server.js",
      env: {
        PORT: 5002,
      },
    },
  ],
};
```

Start all apps:

```bash
pm2 start ecosystem.config.js
```

Save the PM2 process list:

```bash
pm2 save
```

Restart all apps from the ecosystem file:

```bash
pm2 restart ecosystem.config.js
```

Stop all apps from the ecosystem file:

```bash
pm2 stop ecosystem.config.js
```

Delete the apps from PM2:

```bash
pm2 delete crud-api-5000 crud-api-5001 crud-api-5002
```

## PM2 Cluster Mode Note

PM2 cluster mode is useful when you want multiple workers sharing the same port.

For this project, if you want the app running on different ports like `5000`, `5001`, and `5002`, use separate PM2 apps with separate `PORT` values.
