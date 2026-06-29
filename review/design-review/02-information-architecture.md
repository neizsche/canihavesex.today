# Design Review: Information Architecture

## Title: Flat Hierarchy via Bottom Navigation

**Severity:** Informational
**Confidence:** Confirmed
**Category:** Information Architecture
**Affected Screens:** `BottomNav.tsx`, `AppShell.tsx`
**Evidence:** 
The application utilizes a `BottomNav` component, keeping the primary actions (Today, Log, Charts) at the root level of the hierarchy.

**User Impact:**
Because this is designed as a mobile-first PWA, bottom navigation places the most critical actions within reach of the user's thumb. The architecture is incredibly flat; users are never more than one tap away from logging data.

**Suggested Direction:**
Positive finding. Ensure the active state of the BottomNav icons is highly distinguishable (e.g., solid vs outlined icons) to clearly indicate current location.

**Estimated Effort:** Small
**Release Blocker:** No
