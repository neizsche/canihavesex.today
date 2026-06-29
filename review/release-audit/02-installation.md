# Release Audit: Installation Experience

## Title: Flawless One-Liner Docker Installation

**Severity:** Informational
**Confidence:** Confirmed
**Category:** Installation
**Affected Files:** `README.md`
**Evidence:** 
```bash
printf 'COOKIE_SECRET=%s\nPOSTGRES_PASSWORD=%s\n' "$(openssl rand -hex 32)" "$(openssl rand -hex 16)" > .env
docker compose up -d --build
```

**Impact:**
Self-hosting users, particularly from `r/selfhosted`, heavily index on the "Time to First Value". Providing a single snippet that securely generates cryptographic keys and boots the application without requiring users to manually edit files is an elite user experience.

**Recommended Direction:**
Positive finding. Do not change this.

**Estimated Fix Time:** N/A
**Release Blocker:** No
