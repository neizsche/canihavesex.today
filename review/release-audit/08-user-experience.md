# Release Audit: User Experience

## Title: Offline Service Worker Resiliency

**Severity:** Low
**Confidence:** Confirmed
**Category:** User Experience
**Affected Files:** `apps/frontend/astro.config.mjs`
**Evidence:** 
The application configures `vite-plugin-pwa` to cache static assets and provides an `offline.html` fallback.

**Impact:**
Because this is a daily tracker, users will often open it in low-connectivity areas (bathrooms, subways). While the UI will load due to the PWA cache, the lack of an offline mutation queue means they cannot successfully save data until their connection is restored. 

**Recommended Direction:**
While not a blocker for v1.0, an offline mutation queue (via React Query's experimental offline support or IndexedDB) should be a high priority post-launch to make the app feel truly native.

**Estimated Fix Time:** Large
**Release Blocker:** No
