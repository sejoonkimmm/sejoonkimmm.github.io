---
title: "Reducing Docker Image Sizes by 70%"
date: "24.12.2025"
description: "Our Docker images were 800MB+. Build times were slow, pulling images took forever. Spent a day optimizing - got images down to 200MB using multi-stage builds and Alpine base images."
tags: ["Docker", "Containers", "Image Optimization", "CI/CD", "Build Performance"]
readTime: "7 min read"
---

# Reducing Docker Image Sizes by 70%

Our Docker images were huge. The main API service image was 850MB. Build time: 6 minutes. Pull time on fresh nodes: 3 minutes.

This was annoying during development (slow builds) and a real problem in production (slow deployments when scaling up).

I spent a day on this. Got the image down to 180MB. Build time: 2 minutes. Pull time: 30 seconds.

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

The problems were obvious once I looked. It uses the full Python image with a ton of packages we don't need. Build tools like gcc and make are in there even though we don't compile anything at runtime. The pip cache is still sitting in the image. No layer optimization at all.

## Optimization 1: Use slim base image

Changed from `python:3.11` to `python:3.11-slim`:

```dockerfile
FROM python:3.11-slim
...
```

The slim image strips out packages we don't need at runtime. Just the Python interpreter, not the build toolchain.

Image size: 600MB (down from 850MB)

Savings: 250MB (29%)

## Optimization 2: Multi-stage build

Split the build and runtime into separate stages:

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

The builder stage has the full Python image with gcc and build tools. The runtime stage only has the slim image plus the built packages copied over.

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

Alpine is a minimal Linux distribution. The base image is 5MB vs 120MB for Debian. Big difference.

Image size: 280MB (down from 420MB)

Savings: 140MB (33%)

## Optimization 4: Reduce layer count

Combined RUN commands to reduce layers:

```dockerfile
RUN apk add --no-cache libffi && \
    rm -rf /var/cache/apk/*
```

Each RUN creates a layer. Fewer layers means a smaller image.

I also cleaned up unnecessary files:

```dockerfile
COPY . .
RUN find . -type d -name __pycache__ -exec rm -r {} + && \
    find . -type f -name '*.pyc' -delete
```

Image size: 240MB (down from 280MB)

Savings: 40MB (14%)

## Optimization 5: .dockerignore

Created a `.dockerignore` to keep unnecessary files out of the build context:

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

This prevents test files, documentation, and git history from being copied into the image.

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

Smaller base images download faster, layer caching works better when the requirements layer rarely changes, and there's just less data to process and compress.

## Pull time improvements

Before: 3 minutes on fresh nodes
After: 30 seconds

670MB less data to download. The image layers are smaller and compress better too.

## Registry storage savings

We keep the last 10 image versions in our registry.

Before: 10 x 850MB = 8.5GB per service
After: 10 x 180MB = 1.8GB per service

Savings: 6.7GB per service, times 8 services = 53GB total.

Our registry is on Azure Container Registry. Storage is about 0.10 euro/GB/month, so we save about 5.30 euro/month. Not huge, but a nice side effect.

## Tradeoffs with Alpine

Alpine uses musl libc instead of glibc. Some Python packages don't play well with musl.

We ran into problems with:
- `cryptography` package needed extra build flags
- `psycopg2` needed `postgresql-dev` at build time and `libpq` at runtime

Debugging these took about 2 hours. Not terrible, but worth knowing about upfront.

If you don't want to deal with Alpine compatibility issues, `python:3.11-slim-bullseye` (Debian-based) is a good middle ground. Not as small as Alpine, but fewer surprises.

## When not to bother

If you deploy rarely and image size doesn't affect anything, don't spend time on this.

If your image is already under 200MB, the effort probably isn't worth the marginal gains.

If you're using Java or .NET, there's a baseline runtime size you can't really avoid. Focus optimization elsewhere.

## Monitoring image sizes

I added a check to our CI pipeline:

```yaml
check-image-size:
  stage: build
  script:
    - docker images $IMAGE_NAME:$CI_COMMIT_SHA --format "{{.Size}}"
    - SIZE=$(docker images $IMAGE_NAME:$CI_COMMIT_SHA --format "{{.Size}}" | sed 's/MB//')
    - if [ $SIZE -gt 250 ]; then echo "Image too large!" && exit 1; fi
```

This fails the build if the image exceeds 250MB. Prevents accidental bloat from creeping back in.

## Lessons

1. Start with slim or Alpine base images
2. Multi-stage builds keep build tools out of the final image
3. .dockerignore is easy to forget but makes a real difference
4. Combine RUN commands when you can
5. Clean up caches and temp files in the same layer that creates them

This optimization took one day. Every build and deploy after that is faster. For us, that was a good trade.
