#!/bin/bash
set -euo pipefail

# Configuration
USER="ec2-user"
HOST="18.119.128.246"
REMOTE_DIR="/home/ec2-user/weneedwax"

echo "Building frontend..."
npm run build

echo "Copying files to server..."
rsync -az --delete \
  --exclude ".DS_Store" \
  --exclude "dist/**/*.map" \
  dist/ $USER@$HOST:$REMOTE_DIR/dist/
rsync -az \
  --exclude "node_modules" \
  --exclude "uploads" \
  --exclude ".DS_Store" \
  server/ $USER@$HOST:$REMOTE_DIR/server/
rsync -az \
  --exclude ".DS_Store" \
  ops/ $USER@$HOST:$REMOTE_DIR/ops/

echo "Installing dependencies and restarting server..."
ssh -tt $USER@$HOST << 'ENDSSH'
  cd /home/ec2-user/weneedwax
  (cd server && npm install --production)
  pm2 startOrReload /home/ec2-user/weneedwax/ops/ecosystem.config.js
  pm2 save
ENDSSH

echo "Deploy completed successfully."
