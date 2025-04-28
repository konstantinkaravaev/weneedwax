#!/bin/bash

# Configuration
USER="ec2-user"
HOST="18.119.128.246"
REMOTE_DIR="/home/ec2-user/weneedwax"

echo "Building frontend..."
npm run build

echo "Copying files to server..."
scp -r dist/ $USER@$HOST:$REMOTE_DIR/
scp server.js $USER@$HOST:$REMOTE_DIR/
scp package.json $USER@$HOST:$REMOTE_DIR/

echo "Installing dependencies and restarting server..."
ssh $USER@$HOST << 'ENDSSH'
  cd /home/ec2-user/weneedwax
  npm install --production
  pm2 restart all
  pm2 save
ENDSSH

echo "Deploy completed successfully."
