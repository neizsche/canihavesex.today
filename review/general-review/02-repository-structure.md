# Phase 1 Inspection: Repository Structure

## Title: Missing Build Context in docker-compose.yml

**Severity:** High
**Confidence:** Certain

**Files:** `docker-compose.yml`, `README.md`
**Location:** Root

**Problem:** 
The README instructs self-hosters to run `docker compose up -d --build` immediately after cloning the repository. However, the `docker-compose.yml` file's `app` service only specifies an `image` (`ghcr.io/neizsche/canihavesex:latest`) and does not include a `build:` context. Because of this, the `--build` flag is ignored for the app service, and Docker will attempt to pull the pre-built image instead of building from the local source code.

**Evidence:** 
```yaml
# In docker-compose.yml
  app:
    image: ghcr.io/neizsche/canihavesex:latest
    restart: unless-stopped
    depends_on:
      - db
```
This is missing `build: .` beneath `app:`.

**Why it matters:** 
A new contributor or privacy-conscious self-hoster specifically cloning the repo to build it from source will be confused when Docker uses the pre-built remote image. This breaks the expected workflow for self-compilation.

**Suggested direction:** 
Either add `build: .` to the `app` service in `docker-compose.yml` (so users can build locally easily), or provide a `docker-compose.override.yml` example in the README for source builds.

**Should this block the public release?** 
Yes
