# Requirements Tracking & Priority Order

This document aggregates the required changes identified across all review categories (Security, Sales, Engineering, Clinical, Design, Release Audit) into a single tracking list, ordered by priority.

> **Note:** This document is for requirement gathering and tracking purposes only. Some items may require further scoping before implementation. Quick wins that were already marked as `(COMPLETED)` in the general review have been excluded or noted.

## 🔴 Must Fix Before Release (High Priority)

These items are critical for the initial v1.0 public launch and address significant security, sales, or release blockers.

1. **Implement Session Revocation [Security]**
   - **Requirement:** The signed `uid` cookie does not map to a stateful session. Logging out only instructs the browser to clear the cookie. 
   - **Action:** Introduce a `sessions` table (`id`, `user_id`, `created_at`, `expires_at`). Issue a `session_id` to the cookie, validate it in `plugins/auth.ts`, and delete the row on logout.
2. **Marketing Landing Page [Sales]**
   - **Requirement:** A clear `index.html` marketing page is missing.
   - **Action:** Create a landing page with a visible pricing table before the user attempts to sign up to prevent non-technical traffic bounces.
3. **Pre-Release Documentation & Checks [Release Audit]**
   - **Requirement:** Essential open-source community and security files are missing.
   - **Action:** Add `SECURITY.md`, `CODE_OF_CONDUCT.md`, verify `LICENSE` coverage, and ensure no secrets are hardcoded in `.env.example` or source files.
4. **Publishing Preparation [Release Audit]**
   - **Requirement:** Provide a history of changes and verify deployment.
   - **Action:** Create a `CHANGELOG.md` (or use GitHub Releases). Test a completely fresh VPS deployment using the exact Docker instructions from the README.

## 🟡 Should Fix Soon (v1.x)

These items significantly improve user experience, code maintainability, and trust, but won't block the initial launch.

1. **Frontend API Client [Engineering]**
   - **Requirement:** Replace manual `fetch` calls.
   - **Action:** Implement a strongly-typed API client that shares schema definitions with the backend to eliminate boundary errors.
2. **End-to-End Tests [Engineering]**
   - **Requirement:** Lack of automated E2E coverage for core flows.
   - **Action:** Introduce a Playwright test suite to simulate PWA install, data logging, and engine prediction.
3. **Structured Error Handling [Engineering]**
   - **Requirement:** Better error propagation to the frontend.
   - **Action:** Introduce a `DomainError` class on the backend to provide precise, typed failure codes instead of generic 500s.
4. **Methodology Whitepaper [Clinical]**
   - **Requirement:** Scientific transparency for the fertility engine.
   - **Action:** Publish a `METHODOLOGY.md` file citing the exact symptothermal guidelines (e.g., Sensiplan) implemented in `engine.ts`.
5. **Hormonal Contraception Warning [Clinical]**
   - **Requirement:** Clear clinical safety disclaimers.
   - **Action:** Add a disclaimer during onboarding/settings stating the app is for *natural* cycles and won't work with active hormonal birth control.
6. **Pricing Table Clarity & "Cancel Anytime" [Sales]**
   - **Requirement:** Improve pricing communication and subscription trust.
   - **Action:** Explicitly list "Open Source" (Free) vs "Cloud Hosted" (Paid) options. Prominently link the Stripe Customer Portal for cancellations.
7. **14-Day Full Trial [Sales]**
   - **Requirement:** Improve conversion from demo to paid.
   - **Action:** Give users 14 days of full historical access before falling back to the restrictive "Demo" mode.
8. **Offline Indicator & Mutation Queue [Design]**
   - **Requirement:** Improve the PWA offline experience.
   - **Action:** Add a global `navigator.onLine` listener for an "Offline" badge. Enhance React Query to store offline form submissions in IndexedDB and sync them when online.
9. **Accessibility Audit [Design]**
   - **Requirement:** Ensure WCAG 2.2 AA compliance.
   - **Action:** Manually test low-opacity background colors against text in Dark Mode using axe-core.
10. **Post-Launch Operations [Release Audit]**
    - **Requirement:** First week post-launch documentation updates.
    - **Action:** Add reverse-proxy (Caddy, Traefik, Nginx) configuration examples to the documentation based on community requests.

## 🟢 Can Wait Until After v1.0 (v2.0+ / Safe to Defer)

These items are nice-to-haves, scaling improvements, or expansion features that can be scheduled for future roadmaps.

1. **Content Security Policy (CSP) & Docker Hardening [Security]**
   - **Action:** Add a strict CSP header. Document running Docker with `--cap-drop=ALL` and `--security-opt no-new-privileges:true`.
2. **Data Export Tool [Sales]**
   - **Action:** Build a JSON/CSV data export feature to increase trust ("We don't hold your data hostage").
3. **Couples Sharing [Sales]**
   - **Action:** Allow users to invite a partner to view their status (read-only) for a small fee/higher tier.
4. **Monorepo Orchestration & Engine Refactoring [Engineering]**
   - **Action:** Introduce Turborepo for caching/builds. Break down `runFusionEngine` into highly composable pure functions for easier testing.
5. **PCOS Explicit Support & Postpartum Guidance [Clinical]**
   - **Action:** Add an "Irregular / PCOS Mode" with specific educational nudges. Add specific UI disclaimers for users who recently gave birth.
6. **Data Visualization & Micro-interactions [Design]**
   - **Action:** Upgrade charts with interactive tooltips (Recharts/Visx). Add subtle layout animations to expandable UI sections.
