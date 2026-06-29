# Testing & Reliability Review: Priority Roadmap

This document ranks the testing and reliability improvements based on their impact on production stability.

## Must Fix Before Release
*None.* The system's foundational architecture (stateless backend, strict request validation, pure-function domain logic) provides enough inherent reliability to launch safely.

## Should Fix Soon (v1.x)
1. **Critical Path E2E Tests:** Implement Playwright. Cover the "Happy Path" (Account creation -> Onboarding -> Logging an observation -> Viewing the cycle prediction). This guarantees that the system works as a cohesive unit.
2. **Offline Mutation Queue:** Enhance the frontend's `@tanstack/react-query` implementation to queue log submissions when the user is offline, syncing them automatically when connectivity returns. This significantly improves the perceived reliability of the PWA.

## Can Wait Until After v1.0 (v2.0+)
1. **Automated Migration Testing:** Add a CI job that applies database migrations against a populated dummy database to catch breaking schema changes before they hit production.
2. **Visual Regression Testing:** Once the UI stabilizes, add visual snapshot testing to catch CSS regressions.
