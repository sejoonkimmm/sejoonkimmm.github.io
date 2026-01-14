---
title: "Reducing Docker Image Sizes by 70%"
date: "24.12.2025"
description: "Our Docker images were 800MB+. Build times were slow, pulling images took forever. Spent a day optimizing - got images down to 200MB using multi-stage builds and Alpine base images."
tags: ["Docker", "Containers", "Image Optimization", "CI/CD", "Build Performance"]
readTime: "7 min read"
---

# Reducing Docker Image Sizes by 70%

Our Docker images were huge. The main API service image was 850MB. Build time: 6 minutes. Pull time on fresh nodes: 3 minutes.

This was annoying during development (slow builds) and problematic in production (slow deployments when scaling up).

Spent a day optimizing. Got the image down to 180MB. Build time: 2 minutes. Pull time: 30 seconds.

## The starting point

Original Dockerfile:

```dockerfile
FROM python:3.11

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["python", "app.py"]
```

Image size: 850MB

Problems:
- Uses full Python image with lots of unnecessary packages
- Includes build tools (gcc, make) not needed at runtime
- Contains pip cache
- No layer optimization

## Optimization 1: Use slim base image

Changed from `python:3.11` to `python:3.11-slim`:

```dockerfile
FROM python:3.11-slim
...
```

Slim image strips out unnecessary packages. Just has Python runtime, not build tools.

Image size: 600MB (down from 850MB)

Savings: 250MB (29%)

## Optimization 2: Multi-stage build

Split build and runtime into separate stages:

```dockerfile
# Build stage
FROM python:3.11 AS builder

WORKDIR /app

COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Runtime stage
FROM python:3.11-slim

WORKDIR /app

# Copy only the installed packages, not build tools
COPY --from=builder /root/.local /root/.local
COPY . .

# Make sure scripts are in PATH
ENV PATH=/root/.local/bin:$PATH

CMD ["python", "app.py"]
```

Builder stage has full Python image with gcc and build tools. Runtime stage only has slim image with the built packages.

Image size: 420MB (down from 600MB)

Savings: 180MB (30%)

## Optimization 3: Alpine base image

Switched to Alpine Linux:

```dockerfile
# Build stage
FROM python:3.11-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache gcc musl-dev libffi-dev

COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Runtime stage
FROM python:3.11-alpine

WORKDIR /app

# Install runtime dependencies only
RUN apk add --no-cache libffi

COPY --from=builder /root/.local /root/.local
COPY . .

ENV PATH=/root/.local/bin:$PATH

CMD ["python", "app.py"]
```

Alpine is a minimal Linux distribution. Base image is 5MB vs 120MB for Debian.

Image size: 280MB (down from 420MB)

Savings: 140MB (33%)

## Optimization 4: Reduce layer count

Combined RUN commands to reduce layers:

```dockerfile
RUN apk add --no-cache libffi && \
    rm -rf /var/cache/apk/*
```

Each RUN creates a layer. Fewer layers = smaller image.

Also removed unnecessary files:

```dockerfile
COPY . .
RUN find . -type d -name __pycache__ -exec rm -r {} + && \
    find . -type f -name '*.pyc' -delete
```

Image size: 240MB (down from 280MB)

Savings: 40MB (14%)

## Optimization 5: .dockerignore

Created `.dockerignore` to exclude unnecessary files:

```
.git
.gitignore
.pytest_cache
__pycache__
*.pyc
*.pyo
*.pyd
.Python
*.md
Dockerfile
docker-compose.yml
.venv
venv/
tests/
docs/
```

This prevents copying test files, documentation, git history into the image.

Image size: 180MB (down from 240MB)

Savings: 60MB (25%)

## Final Dockerfile

```dockerfile
# Build stage
FROM python:3.11-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    gcc \
    musl-dev \
    libffi-dev \
    postgresql-dev

# Install Python packages
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt && \
    find /root/.local -type d -name __pycache__ -exec rm -r {} + && \
    find /root/.local -type f -name '*.pyc' -delete

# Runtime stage
FROM python:3.11-alpine

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    libffi \
    libpq && \
    adduser -D app

# Copy installed packages from builder
COPY --from=builder /root/.local /root/.local

# Copy application code
COPY --chown=app:app . .

# Run as non-root user
USER app

ENV PATH=/root/.local/bin:$PATH

CMD ["python", "app.py"]
```

Final image size: 180MB (down from 850MB)

Total savings: 670MB (79%)

## Build time improvements

Before: 6 minutes
After: 2 minutes

Why faster:
- Smaller base images download faster
- Layer caching works better (requirements layer rarely changes)
- Less data to process and compress

## Pull time improvements

Before: 3 minutes on fresh nodes
After: 30 seconds

Why faster:
- 670MB less data to download
- Image layers are smaller and compress better

## Registry storage savings

We keep the last 10 image versions in our registry.

Before: 10 × 850MB = 8.5GB per service
After: 10 × 180MB = 1.8GB per service

Savings: 6.7GB per service × 8 services = 53GB total

Our registry storage is on Azure Container Registry. Storage costs about €0.10/GB/month.

Savings: €5.30/month

Not huge, but nice side benefit.

## Tradeoffs with Alpine

Alpine uses musl libc instead of glibc. Some Python packages have issues with musl.

We hit problems with:
- `cryptography` package needed extra build flags
- `psycopg2` needed `postgresql-dev` at build time, `libpq` at runtime

Had to debug these during migration. Took about 2 hours to get all dependencies working.

Alternative: Use `python:3.11-slim-bullseye` (Debian-based). Not as small as Alpine but fewer compatibility issues.

## When not to optimize

If you deploy rarely and image size doesn't matter, don't bother optimizing.

If your image is already small (< 200MB), marginal gains aren't worth the effort.

If you use languages with larger runtimes (Java, .NET), there's a baseline size you can't avoid.

## Monitoring image sizes

Added to CI pipeline:

```yaml
check-image-size:
  stage: build
  script:
    - docker images $IMAGE_NAME:$CI_COMMIT_SHA --format "{{.Size}}"
    - SIZE=$(docker images $IMAGE_NAME:$CI_COMMIT_SHA --format "{{.Size}}" | sed 's/MB//')
    - if [ $SIZE -gt 250 ]; then echo "Image too large!" && exit 1; fi
```

This fails the build if image exceeds 250MB. Prevents accidental bloat from being introduced.

## Lessons

1. Use slim or Alpine base images
2. Multi-stage builds separate build and runtime
3. .dockerignore excludes unnecessary files
4. Combine RUN commands to reduce layers
5. Clean up caches and temp files

Image optimization took one day but saves time on every build and deployment going forward.

Smaller images = faster builds, faster deploys, lower costs.
