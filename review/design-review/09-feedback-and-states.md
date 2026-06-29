# Design Review: Feedback & States

## Title: Missing Granular Offline Feedback

**Severity:** Low
**Confidence:** Confirmed
**Category:** Feedback & States
**Affected Screens:** Global
**Evidence:** 
React Query handles generic errors and network retries gracefully. However, there is no explicit visual indicator in the UI that the device is currently offline (e.g., a "You are offline" banner at the top of the screen).

**User Impact:**
If a user loses cell service, they might interact with the application and encounter generic failure messages rather than a helpful explanation that their network is down.

**Suggested Direction:**
Implement a global `window.navigator.onLine` listener and display a subtle, non-intrusive "Offline Mode" badge in the Header.

**Estimated Effort:** Small
**Release Blocker:** No
