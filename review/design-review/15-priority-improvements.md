# Design Review: Priority Improvements

This document ranks the UX improvements based on their impact on trust and usability.

## Must Fix Before Release
*None.* The UI is polished, responsive, and trustworthy enough for a v1.0 public launch.

## Should Fix Soon (v1.x)
1. **Offline Indicator:** Add a global `window.navigator.onLine` listener to display a subtle "Offline" badge in the header, preventing confusion when the user cannot reach the backend.
2. **Offline Mutation Queue:** Enhance React Query to store offline form submissions in IndexedDB and sync them automatically when the network returns. This is the single biggest "native app feel" improvement possible.
3. **Accessibility Audit:** Manually test the low-opacity background colors against text in Dark Mode using axe-core to guarantee WCAG 2.2 AA compliance.

## Can Wait Until After v1.0 (v2.0+)
1. **Data Visualization:** The current charts are functional, but upgrading them with interactive tooltips (e.g., using Recharts or Visx) would elevate the "Pro" feel of the application.
2. **Micro-interactions:** Add subtle layout animations when expanding/collapsing the "Show More" section on the Log screen to smooth out the layout shift.
