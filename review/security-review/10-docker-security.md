# Security Review: Docker & Self-Hosting Security

## Title: Privilege Dropping Implemented Successfully

**Severity:** Informational
**Confidence:** Confirmed
**Category:** Docker
**Affected Files:** `Dockerfile`
**Location:** Stage: Runtime

**Evidence:**
```dockerfile
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --gid 1001 nodejs
USER nodejs
```

**Attack Scenario:**
An attacker discovers an RCE in the Node application. Because the container runs as root, they attempt to modify the underlying container environment, install additional malicious packages, or escape to the host.

**Potential Impact:**
Container escape or persistent container compromise.

**Recommended Direction:**
Positive finding. By explicitly running as the non-root `nodejs` user, the blast radius of any potential code execution vulnerability is strictly contained. 
*Safe to Defer:* For future hardening, consider dropping all Linux capabilities (`--cap-drop=ALL`) in the provided `docker-compose.yml` and making the root filesystem read-only.

**Relevant Standard:**
OWASP ASVS V10.2 Container Security

**Release Blocker:**
No
