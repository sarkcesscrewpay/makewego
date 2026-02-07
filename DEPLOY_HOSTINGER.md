# Deploying to Hostinger

Follow these steps to deploy your Bus-Connect application to a Hostinger VPS.

## Prerequisites

1. A Hostinger VPS running Ubuntu (recommended).
2. SSH access to your VPS.
3. Your MongoDB connection string.

## Hostinger Dashboard Settings

If you are using Hostinger's **Deployment** or **Node.js** panel, use these specific values:

- **Install command**: `npm install`
- **Build command**: `npm run build`
- **Application Start File**: `server.js` (or `dist/index.js`)

## Step 1: Connect to your VPS

Open your terminal and connect via SSH:

```bash
ssh root@your_vps_ip
```

## Step 2: Clone or Upload your code

If you use Git:
```bash
git clone YOUR_REPOSITORY_URL
cd Bus-Connect
```

## Step 3: Set Environment Variables

Create a `.env` file in the root directory:

```bash
nano .env
```

Paste your production variables:

```env
MONGODB_URI=your_mongodb_atlas_uri
MONGODB_NAME=makewego
NODE_ENV=production
SERPIAPI_KEY=your_key
```
Note: You do **not** need to set `PORT` or `REDIRECT_URI` on the host server. The server automatically assigns the correct port.

Press `Ctrl+O`, `Enter`, and `Ctrl+X` to save.

## Step 4: Run the Setup Script

I have provided a `setup-hostinger.sh` script to automate everything:

```bash
chmod +x setup-hostinger.sh
./setup-hostinger.sh
```

This script will:
- Install Node.js (v20) and PM2.
- Install project dependencies.
- Build the frontend and backend.
- Start the app using PM2.

## Step 5: Configure Reverse Proxy (Nginx)

Hostinger usually provides a default Nginx setup. To point your domain to the app (running on port 5000), update your Nginx config:

```bash
sudo nano /etc/nginx/sites-available/default
```

Update the `location /` block:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Restart Nginx:
```bash
sudo systemctl restart nginx
```

### 503 Service Unavailable
This means Nginx cannot reach the Node.js process.
1. **App Crash**: Check logs with `pm2 logs bus-connect`.
2. **MongoDB Whitelist**: **CRITICAL!** Go to MongoDB Atlas > Network Access > Add IP Address. Add your Hostinger VPS IP address. If the app can't connect, it might crash constantly.
3. **Port Conflict**: Ensure no other app is using port 5000.
4. **Health Check**: Try visiting `yourdomain.com/health`. If you see "Server is alive", the issue is in your API/DB logic, not the connection to Nginx.

### Permission Denied (tsx)
If you see `Permission denied` for `tsx` during build:
1. Ensure you are using the latest `package.json` which uses `node --import tsx`.
2. Run `chmod -R +x node_modules/.bin` manually if not using `setup-hostinger.sh`.

### Module Not Found
Ensure you are running `npm run dev` or `npm run build`. 
**Do NOT run `npx tsx src/index.ts`** as the server entry point is `server/index.ts`.

