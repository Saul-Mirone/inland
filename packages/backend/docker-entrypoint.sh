#!/bin/sh
set -e

echo "Running database migrations..."
cd /app/packages/backend
npx prisma migrate deploy

echo "Starting backend server..."
exec node dist/main.js
