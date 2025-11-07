#!/bin/bash

# Stop Redis container
if docker ps --format '{{.Names}}' | grep -q '^teammatch-redis$'; then
  echo "🛑 Stopping Redis container..."
  docker stop teammatch-redis
  echo "✅ Redis stopped"
else
  echo "ℹ️  Redis container is not running"
fi
