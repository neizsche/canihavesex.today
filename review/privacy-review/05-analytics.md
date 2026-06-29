# Privacy Review: Analytics & Telemetry

## Title: Zero Active Tracking & Environment-Aware Crash Reporting

**Severity:** Informational
**Confidence:** Confirmed
**Category:** Analytics
**Affected Files:** `apps/frontend/astro.config.mjs`, `apps/backend/src/index.ts`

**Evidence:**
A thorough inspection of the frontend and backend confirms that there are **no** third-party product analytics, behavioral trackers, or marketing pixels installed (no Google Analytics, PostHog, Mixpanel, etc.).
Furthermore, Sentry (for crash reporting) is conditionally guarded by a strict `!isSelfHost` check:
```javascript
const isSelfHost = env.IS_MANAGED_CLOUD !== 'true';
if (sentryDsn && !isSelfHost) {
  integrations.push(sentry({ ... }));
}
```

**Privacy Risk:**
Adding product analytics to a fertility tracker fundamentally undermines "no tracking" claims, as it hands third parties behavioral data. Sentry could accidentally capture PII in stack traces.

**Potential User Impact:**
Users are tracked without consent or have their IP addresses aggregated by ad networks.

**Suggested Direction:**
Positive finding. By explicitly checking the environment and disabling Sentry automatically for self-hosting users, the project perfectly honors its privacy claims. Ensure no front-end features silently break if third-party domains are blocked.

**Release Blocker:**
No
