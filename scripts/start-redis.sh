#!/bin/bash

# Check if Redis container is running
if docker ps --format '{{.Names}}' | grep -q '^teammatch-redis$'; then
  echo "✅ Redis is already running"
else
  echo "🚀 Starting Redis container..."
  
  # Check if Docker is running
  if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
  fi
  
  # Check if container exists but is stopped
  if docker ps -a --format '{{.Names}}' | grep -q '^teammatch-redis$'; then
    echo "📦 Starting existing Redis container..."
    docker start teammatch-redis
  else
    echo "📦 Creating and starting Redis container..."
    docker-compose up -d redis
  fi
  
  # Wait for Redis to be healthy
  echo "⏳ Waiting for Redis to be ready..."
  max_attempts=30
  attempt=0
  
  while [ $attempt -lt $max_attempts ]; do
    if docker exec teammatch-redis redis-cli ping > /dev/null 2>&1; then
      echo "✅ Redis is ready!"
      break
    fi
    attempt=$((attempt + 1))
    sleep 1
  done
  
  if [ $attempt -eq $max_attempts ]; then
    echo "❌ Redis failed to start within 30 seconds"
    exit 1
  fi
fi

echo ""
echo "📊 Redis Status:"
docker exec teammatch-redis redis-cli INFO | grep "redis_version"
echo ""
