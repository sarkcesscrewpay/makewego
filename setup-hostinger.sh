#!/bin/bash

# setup-hostinger.sh - Script to automate Bus-Connect deployment on Hostinger VPS

echo "Starting deployment setup..."

# 1. Install Node.js if not present (assuming Ubuntu/Debian)
if ! command -v node &> /dev/null
then
    echo "Node.js not found, installing..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# 2. Install PM2 globally
if ! command -v pm2 &> /dev/null
then
    echo "PM2 not found, installing..."
    sudo npm install -g pm2
fi

# 3. Install dependencies
echo "Installing project dependencies..."
npm install

# 3.5 Fix permissions for binaries
echo "Setting permissions for binaries..."
chmod -R +x node_modules/.bin

# 4. Build the project
echo "Building the project..."
npm run build

# 5. Verify Build
if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
    echo "❌ Build failed: 'dist' directory or 'index.html' missing!"
    exit 1
fi


# 6. Check .env
if [ ! -f ".env" ]; then
    echo "⚠️ Warning: .env file not found! Please create it using DEPLOY_HOSTINGER.md instructions."
fi

# 7. Start with PM2
echo "Starting application with PM2..."
pm2 delete bus-connect 2>/dev/null || true
pm2 start ecosystem.config.cjs

# 8. Save PM2 list and set to start on boot
pm2 save
# pm2 startup  # This often requires sudo/manual intervention on Hostinger

echo "--------------------------------------------------"
echo "Deployment complete! Application should be running."
echo "Check logs with: pm2 logs bus-connect"
echo "If you see a 503 error, check if the app crashed: pm2 status"
echo "--------------------------------------------------"
