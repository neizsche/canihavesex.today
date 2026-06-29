# Testing & Reliability Review: Frontend Reliability

## Title: Service Worker Navigation Fallback Strategy

**Severity:** Low
**Confidence:** Needs Runtime Verification
**Category:** Frontend Reliability
**Affected Files:** `apps/frontend/astro.config.mjs`

**Evidence:**
The VitePWA plugin is configured with `navigateFallback: null` to prevent the service worker from breaking OAuth redirect loops. It falls back to catching `handlerDidError` and returning an `/offline.html` page when the network fails.

**Reliability Risk:**
Because this is a Progressive Web App designed to look like a native app, users will frequently launch it from their home screen while in subway stations or areas with no cell service. If the offline fallback fails, they will see a generic browser "No Internet Connection" dinosaur screen rather than a branded offline experience.

**Suggested Direction:**
Manually verify the PWA offline behavior by turning on Airplane mode on a physical device, launching the app from the home screen, and ensuring the `/offline.html` page renders instantly.

**Recommended Test Type:** Manual
**Estimated Effort:** Small
**Release Blocker:** No
