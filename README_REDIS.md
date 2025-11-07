# Redis Setup for Epic 4

## Overview

Redis is used for job queue management (BullMQ) in Epic 4 for features like:

- Gemini transcription processing
- Background job processing
- Task scheduling

## Automatic Startup

Redis will **automatically start** when you run:

```bash
npm run dev
```

The `predev` script checks if Redis is running and starts it if needed.

## Manual Control

### Start Redis Manually

```bash
./scripts/start-redis.sh
```

### Stop Redis

```bash
./scripts/stop-redis.sh
```

### Check Redis Status

```bash
docker ps | grep teammatch-redis
```

### Connect to Redis CLI

```bash
docker exec -it teammatch-redis redis-cli
```

## Docker Compose

The Redis service is defined in `docker-compose.yml`:

- **Image**: `redis:7-alpine`
- **Port**: `6379`
- **Data Persistence**: Volume `redis-data`
- **Container Name**: `teammatch-redis`

## Environment Variables

Add to your `.env.local`:

```env
REDIS_URL=redis://localhost:6379
```

## Troubleshooting

### Docker Not Running

```
❌ Docker is not running. Please start Docker Desktop first.
```

**Solution**: Start Docker Desktop application.

### Port Already in Use

```
Error: bind: address already in use
```

**Solution**: Another service is using port 6379. Stop it or change the port in `docker-compose.yml`.

### Container Won't Start

```bash
# View logs
docker logs teammatch-redis

# Remove and recreate
docker rm -f teammatch-redis
npm run dev
```

### Clear Redis Data

```bash
docker exec teammatch-redis redis-cli FLUSHALL
```

## Production Deployment

For production, use managed Redis services:

- **Vercel**: Vercel KV (Redis)
- **AWS**: ElastiCache
- **Azure**: Azure Cache for Redis
- **GCP**: Memorystore

Update `REDIS_URL` environment variable accordingly.

## Development Workflow

1. **First Time**: Docker will download Redis image (~5MB)
2. **Subsequent Runs**: Container starts instantly
3. **Data Persists**: Data survives container restarts
4. **Clean Shutdown**: `docker stop teammatch-redis` or `docker-compose down`

## Epic 4 Features Using Redis

- **Sprint 5**: Gemini transcription queue (Story 4.8)
- **Future**: Background job processing, email queues, caching
