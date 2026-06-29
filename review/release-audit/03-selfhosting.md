# Release Audit: Self-Hosting Experience

## Title: Maintenance Commands Explicitly Documented

**Severity:** Informational
**Confidence:** Confirmed
**Category:** Self-Hosting
**Affected Files:** `README.md`
**Evidence:** 
The README explicitly documents `docker compose exec db pg_dump ...` for backups and `cat backup.sql | docker compose exec -T db psql ...` for restores. It also provides a CLI script for resetting lost passwords.

**Impact:**
Most self-hosted apps tell users to "backup your database" without providing the exact Docker syntax, leading to broken pipes or failed restores. Providing the exact commands massively reduces the operational burden on the end user and inspires immediate trust.

**Recommended Direction:**
Positive finding. 

**Estimated Fix Time:** N/A
**Release Blocker:** No
