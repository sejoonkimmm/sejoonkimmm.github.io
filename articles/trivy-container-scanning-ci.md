---
title: "Adding Trivy Scans to Our CI Pipeline"
date: "05.11.2025"
description: "Integrated Trivy into GitLab CI to scan container images for vulnerabilities before deployment. Found 47 high-severity issues we didn't know about. Some were fixable, some weren't."
tags: ["Security", "Trivy", "Container Scanning", "CI/CD", "GitLab"]
readTime: "7 min read"
---

# Adding Trivy Scans to Our CI Pipeline

We build container images and deploy them to Kubernetes without scanning for vulnerabilities. Decided to fix that last week by adding Trivy to our CI pipeline.

Trivy is a vulnerability scanner that checks container images for known CVEs. It's free, fast, and integrates easily with CI/CD.

Scanned our existing images. Found 47 high-severity vulnerabilities across 12 services. Most were in base images we hadn't updated in months.

## Installing Trivy in GitLab CI

Added a security scanning stage to `.gitlab-ci.yml`:

```yaml
stages:
  - build
  - scan
  - deploy

build-image:
  stage: build
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA

trivy-scan:
  stage: scan
  image: aquasec/trivy:latest
  script:
    - trivy image \
        --severity HIGH,CRITICAL \
        --exit-code 1 \
        --no-progress \
        $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  allow_failure: false  # fail the pipeline if vulnerabilities found

deploy:
  stage: deploy
  script:
    - kubectl set image deployment/app app=$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  only:
    - main
```

This pipeline:
1. Builds the Docker image
2. Scans it with Trivy
3. Fails if HIGH or CRITICAL vulnerabilities found
4. Only deploys if scan passes

## What Trivy found

Ran the scan on our main API service. Output:

```
Total: 47 (HIGH: 31, CRITICAL: 16)

│ Library  │ Vulnerability │ Severity │ Title                        │
│ openssl  │ CVE-2024-XXXX │ CRITICAL │ Memory leak in SSL handling  │
│ curl     │ CVE-2024-YYYY │ HIGH     │ Buffer overflow in HTTP/2    │
│ python3  │ CVE-2024-ZZZZ │ HIGH     │ Privilege escalation         │
...
```

Most vulnerabilities were in system packages (openssl, curl, libssl) from the base image. Our application code was fine - the problems were in the OS layer.

## Fixing vulnerabilities

**Easy fixes - base image updates:**

Our Dockerfile started with:

```dockerfile
FROM python:3.11-slim
```

This pulled an image from 6 months ago. Updated to explicitly use the latest patch:

```dockerfile
FROM python:3.11.9-slim
```

Rebuilt the image, re-scanned. Vulnerabilities dropped from 47 to 12.

Lesson: Don't use floating tags like `python:3.11-slim`. Use specific versions like `python:3.11.9-slim` and update them regularly.

**Medium fixes - package updates:**

Some vulnerabilities were in Python dependencies. Our `requirements.txt`:

```
requests==2.28.0
flask==2.2.0
```

Both had known CVEs. Updated to latest versions:

```
requests==2.31.0
flask==3.0.0
```

Ran tests to make sure nothing broke. Tests passed. Deployed.

**Can't fix - distro packages:**

After updates, we still had 3 HIGH vulnerabilities in system packages that didn't have patches yet. These were in:
- `libgcrypt` - used by the OS, no patch available
- `systemd` - not actually used by our container but installed anyway

For these, we documented them and added exceptions to Trivy:

```yaml
# .trivyignore
CVE-2024-XXXX  # libgcrypt - no patch available, doesn't affect us
CVE-2024-YYYY  # systemd - not used in container
```

Not ideal, but sometimes you have to accept risk when there's no fix available.

## Trivy in different CI systems

**GitHub Actions:**

```yaml
- name: Run Trivy scanner
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: 'myimage:latest'
    severity: 'HIGH,CRITICAL'
    exit-code: '1'
```

**Jenkins:**

```groovy
stage('Security Scan') {
  steps {
    sh 'trivy image --severity HIGH,CRITICAL myimage:latest'
  }
}
```

**Local development:**

```bash
docker build -t myapp:local .
trivy image myapp:local
```

## Scan frequency

**During CI**: Every image build gets scanned before deployment. This catches new vulnerabilities introduced by code or dependency changes.

**Scheduled scans**: Weekly scan of all deployed images. Vulnerabilities get disclosed constantly - an image that was clean last week might have new CVEs today.

Set up a CronJob in Kubernetes to scan running images:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: trivy-scan-deployed
spec:
  schedule: "0 2 * * 0"  # Sunday 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: trivy
            image: aquasec/trivy:latest
            command:
            - /bin/sh
            - -c
            - |
              # Get all images running in cluster
              kubectl get pods --all-namespaces -o json | \
                jq -r '.items[].spec.containers[].image' | \
                sort -u | \
              while read image; do
                echo "Scanning $image"
                trivy image --severity HIGH,CRITICAL "$image"
              done
          restartPolicy: OnFailure
```

This scans all images currently deployed and sends a report. If new CVEs are found, we get a notification.

## What to do about false positives

Trivy sometimes reports vulnerabilities that don't actually affect your application.

Example: A CVE in `curl` command-line tool. If your application uses libcurl (the library) but doesn't call the curl binary, the CVE might not apply.

Or a CVE in PostgreSQL client libraries when you're not using PostgreSQL.

For these, use `.trivyignore`:

```
# CVE doesn't apply to our use case
CVE-2024-12345

# Fixed in our custom build
CVE-2024-67890
```

But be careful with ignores. Document why you're ignoring each CVE so future you (or your coworkers) understand the reasoning.

## Failing builds vs warnings

We set `--exit-code 1` which fails the build if vulnerabilities are found. This prevents deploying vulnerable images.

But this can be annoying during development. Sometimes you want to deploy quickly and fix vulnerabilities later.

Alternative approach:

```yaml
trivy-scan:
  stage: scan
  script:
    - trivy image --severity HIGH,CRITICAL $IMAGE || true
  allow_failure: true  # warn but don't block
```

This runs the scan and shows results, but doesn't block deployment.

We use strict mode (`--exit-code 1`, `allow_failure: false`) on main branch, but allow failures on feature branches. Developers can deploy to staging without fixing all CVEs, but production deployments require clean scans.

## Trivy cache

Trivy downloads vulnerability databases on every run. This is slow and wasteful in CI.

Use a cache to speed things up:

```yaml
trivy-scan:
  stage: scan
  image: aquasec/trivy:latest
  cache:
    paths:
      - .trivycache/
  script:
    - trivy image \
        --cache-dir .trivycache \
        --severity HIGH,CRITICAL \
        $IMAGE
```

First run takes 30 seconds to download databases. Subsequent runs take 5 seconds.

## Scanning during image build

Trivy can also scan during the build process using Docker BuildKit:

```dockerfile
# syntax=docker/dockerfile:1.4
FROM python:3.11-slim AS base

# Install dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# Scan stage
FROM base AS scan
RUN apk add --no-cache curl
RUN curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh
RUN trivy filesystem --severity HIGH,CRITICAL /

# Final stage
FROM base AS final
COPY . /app
CMD ["python", "app.py"]
```

This scans the filesystem during build and fails if vulnerabilities are found. But it's slower than scanning the final image, so we don't use this approach.

## Results after 2 months

Since adding Trivy:
- Caught 8 new HIGH/CRITICAL CVEs before they reached production
- Reduced vulnerabilities in deployed images by 85%
- Forced us to update base images regularly
- Development slowed slightly (builds fail more often)

The security improvement is worth the extra friction. And developers got used to fixing CVEs before merging.

## Tools besides Trivy

**Snyk**: Commercial tool with better vulnerability data and fix suggestions. Costs money.

**Grype**: From Anchore, similar to Trivy. We tried it but found Trivy faster.

**Clair**: Older scanner, more complex to set up. Trivy is simpler.

Trivy is free, fast, and accurate enough for our needs. Unless you need enterprise features, it's the best choice.

## Bottom line

Container scanning should be part of every CI pipeline. Trivy makes it easy. Add a 30-second scan step and catch vulnerabilities before they reach production.

Don't wait until you have a security incident to start scanning. Do it now.
