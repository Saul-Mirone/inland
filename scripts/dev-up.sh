#!/bin/bash

echo "🚀 Starting Inland CMS infrastructure services..."

# Start database and cache services
docker-compose -f docker-compose.dev.yml up -d

echo "✅ Infrastructure services started!"
echo ""
echo "🗄️ PostgreSQL: localhost:5432"
echo "📦 Redis: localhost:6379"
echo ""
echo "Next steps:"
echo "1. yarn workspace @inland/backend db:migrate  # Apply database migrations"
echo "2. yarn dev:be                                # Start backend on :3001" 
echo "3. yarn dev:fe                                # Start frontend on :3000"