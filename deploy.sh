#!/bin/bash
echo "Starting deployment..."

cd /home/ec2-user/weneedwax || exit

echo "Pulling latest changes from main branch..."
git pull origin main

echo "Installing dependencies..."
npm install

echo "Building frontend..."
npm run build

echo "Restarting server with PM2..."
pm2 restart ecosystem.config.js

echo "Deployment finished successfully!"
