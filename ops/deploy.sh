#!/bin/bash
set -euo pipefail

# Configuration
USER="ec2-user"
HOST="18.119.128.246"
REMOTE_DIR="/home/ec2-user/weneedwax"

echo "Building frontend..."
npm run build

echo "Copying files to server..."
scp -r dist/ $USER@$HOST:$REMOTE_DIR/
scp -r server/ $USER@$HOST:$REMOTE_DIR/
scp -r ops/ $USER@$HOST:$REMOTE_DIR/

echo "Installing dependencies and restarting server..."
ssh -tt $USER@$HOST << 'ENDSSH'
  cd /home/ec2-user/weneedwax
  (cd server && npm install --production)
  pm2 startOrReload /home/ec2-user/weneedwax/ops/ecosystem.config.js
  pm2 save
ENDSSH

echo "Deploy completed successfully."
