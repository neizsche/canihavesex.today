# Privacy Review: Browser Privacy

## Title: Minimal and Secure Local Storage

**Severity:** Informational
**Confidence:** Confirmed
**Category:** Browser Privacy
**Affected Files:** `apps/frontend/src/layouts/AppLayout.astro`, `apps/backend/src/auth.ts`

**Evidence:**
* **Cookies:** The only cookie is `uid`, heavily restricted via `HttpOnly`, `SameSite=lax`, and `Secure` (in prod).
* **LocalStorage:** Used exclusively for non-sensitive UI state: `theme`.
* **SessionStorage:** Used temporarily for PWA installation routing (`pwa-install-intent`).
* **Cache:** Service workers aggressively invalidate API caches, caching only static UI assets.

**Privacy Risk:**
Web apps often cache sensitive API JSON payloads in LocalStorage or IndexedDB, meaning anyone with physical access to the browser (or XSS) can easily read historical health data even after a user closes the tab.

**Potential User Impact:**
Local exposure of sensitive fertility data.

**Suggested Direction:**
Positive finding. Relying on HTTP API calls (and preventing them from being cached via `Cache-Control: no-store`) rather than heavily syncing to IndexedDB reduces the surface area for local snooping.

**Release Blocker:**
No
