# Design Review: User Flows

## Title: Contextual Coaching on First Log

**Severity:** Informational
**Confidence:** Confirmed
**Category:** User Flows
**Affected Screens:** `LogScreen.tsx`
**Evidence:** 
```typescript
if (localStorage.getItem(COACH_SEEN_KEY) !== 'true') setCoachOpen(true);
```
The `LogScreen` automatically opens a `LogCoachSheet` for first-time users.

**User Impact:**
Fertility tracking requires specific methods (e.g., taking BBT before getting out of bed). Providing contextual education *at the exact moment* the user attempts to log data for the first time is significantly more effective than a generic onboarding carousel.

**Suggested Direction:**
Positive finding. Ensure the `LogCoachSheet` is easily dismissible via swipe-down gestures on mobile.

**Estimated Effort:** N/A
**Release Blocker:** No
