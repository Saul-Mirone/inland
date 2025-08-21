#!/bin/bash

echo "🛑 Stopping Inland CMS development environment..."

# Stop and remove containers
docker-compose -f docker-compose.dev.yml down -v

echo "✅ Development environment stopped!"
