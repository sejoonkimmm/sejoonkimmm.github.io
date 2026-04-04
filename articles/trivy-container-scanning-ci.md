---
title: "Adding Trivy Scans to Our CI Pipeline"
date: "05.11.2025"
description: "Integrated Trivy into GitLab CI to scan container images for vulnerabilities before deployment. Found 47 high-severity issues we didn't know about. Some were fixable, some weren't."
tags: ["Security", "Trivy", "Container Scanning", "CI/CD", "GitLab"]
readTime: "7 min read"
---

# Adding Trivy Scans to Our CI Pipeline

We were building container images and deploying them to Kubernetes without scanning for vulnerabilities. Last week I decided to fix that by adding Trivy to our CI pipeline.

Trivy is a vulnerability scanner that checks container images for known CVEs. It's free, it's fast, and it plugs into CI/CD without much effort.

I scanned our existing images. Found 47 high-severity vulnerabilities across 12 services. Most came from base images we hadn't updated in months.

## Installing Trivy in GitLab CI

I added a security scanning stage to `.gitlab-ci.yml`:

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

The pipeline builds the Docker image, scans it with Trivy, fails if HIGH or CRITICAL vulnerabilities show up, and only deploys if the scan passes.

## What Trivy found

I ran the scan on our main API service:

```
Total: 47 (HIGH: 31, CRITICAL: 16)

│ Library  │ Vulnerability │ Severity │ Title                        │
│ openssl  │ CVE-2024-XXXX │ CRITICAL │ Memory leak in SSL handling  │
│ curl     │ CVE-2024-YYYY │ HIGH     │ Buffer overflow in HTTP/2    │
│ python3  │ CVE-2024-ZZZZ │ HIGH     │ Privilege escalation         │
...
```

Most vulnerabilities were in system packages (openssl, curl, libssl) from the base image. Our application code was fine. The problems were in the OS layer underneath.

## Fixing vulnerabilities

**Easy fixes - update the base image:**

Our Dockerfile started with:

```dockerfile
FROM python:3.11-slim
```

This pulled an image from 6 months ago. I updated to a specific recent version:

```dockerfile
FROM python:3.11.9-slim
```

Rebuilt, re-scanned. Vulnerabilities dropped from 47 to 12.

Lesson: don't use floating tags like `python:3.11-slim`. Pin to specific versions like `python:3.11.9-slim` and update them on a schedule.

**Medium fixes - update dependencies:**

Some vulnerabilities were in Python packages. Our `requirements.txt`:

```
requests==2.28.0
flask==2.2.0
```

Both had known CVEs. Updated to the latest versions:

```
requests==2.31.0
flask==3.0.0
```

Ran tests, nothing broke. Deployed.

**Can't fix - no patch available:**

After all the updates, 3 HIGH vulnerabilities remained in system packages with no patches yet:
- `libgcrypt` - used by the OS, no fix available
- `systemd` - not actually used by our container but installed anyway

For these, I documented them and added exceptions:

```yaml
# .trivyignore
CVE-2024-XXXX  # libgcrypt - no patch available, doesn't affect us
CVE-2024-YYYY  # systemd - not used in container
```

Not ideal. But sometimes you accept the risk when there's literally no fix.

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

**During CI**: every image build gets scanned before deployment. This catches new vulnerabilities from code or dependency changes.

**Scheduled scans**: weekly scan of all deployed images. Vulnerabilities get disclosed all the time. An image that was clean last week might have new CVEs today.

I set up a CronJob in Kubernetes to scan running images:

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

This scans everything currently deployed and sends a report. New CVEs trigger a notification.

## What to do about false positives

Trivy sometimes flags vulnerabilities that don't actually affect your application.

Example: a CVE in the `curl` command-line tool. If your app uses libcurl (the library) but never calls the curl binary, the CVE might not apply.

Or a CVE in PostgreSQL client libraries when you don't use PostgreSQL.

For these, use `.trivyignore`:

```
# CVE doesn't apply to our use case
CVE-2024-12345

# Fixed in our custom build
CVE-2024-67890
```

Be careful with ignores though. Document why you're ignoring each CVE. Future you (or your coworkers) will want to know the reasoning.

## Failing builds vs warnings

We set `--exit-code 1` which fails the build on vulnerabilities. This blocks deploying vulnerable images.

It can be annoying during development. Sometimes you just want to deploy to staging and deal with CVEs later.

Alternative approach:

```yaml
trivy-scan:
  stage: scan
  script:
    - trivy image --severity HIGH,CRITICAL $IMAGE || true
  allow_failure: true  # warn but don't block
```

This runs the scan and shows results but doesn't stop the deployment.

We use strict mode (`--exit-code 1`, `allow_failure: false`) on the main branch, but allow failures on feature branches. Developers can deploy to staging without fixing every CVE, but production requires clean scans.

## Trivy cache

Trivy downloads vulnerability databases on every run. In CI, this is slow and wasteful.

Use a cache:

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

First run takes about 30 seconds to download databases. After that, runs take about 5 seconds.

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

This scans the filesystem during build and fails on vulnerabilities. It's slower than scanning the final image though, so we don't use this approach.

## Results after 2 months

Since adding Trivy:
- Caught 8 new HIGH/CRITICAL CVEs before they hit production
- Reduced vulnerabilities in deployed images by 85%
- Forced us to keep base images up to date
- Development slowed down a little (builds fail more often)

The security improvement is worth the friction. Developers got used to fixing CVEs before merging, and it became just part of the workflow.

## Tools besides Trivy

**Snyk**: commercial, better vulnerability data and fix suggestions. Costs money.

**Grype**: from Anchore, similar to Trivy. I tried it but Trivy was faster.

**Clair**: older scanner, more complex to set up.

Trivy is free, fast, and accurate enough for what we need. Unless you need enterprise features, I'd start here.

## Bottom line

Container scanning should be part of every CI pipeline. Trivy makes it straightforward. Add a 30-second scan step and catch vulnerabilities before they reach production.

Don't wait for a security incident to start scanning. Just set it up.
