# Design Review: Content & Microcopy

## Title: Objective, Non-Alarmist Language

**Severity:** Informational
**Confidence:** Confirmed
**Category:** Content & Microcopy
**Affected Screens:** `TodayScreen.tsx`
**Evidence:** 
Status states are limited to "Highly Fertile", "Not Sure", and "Not Fertile". The fallback subtitle for "Not Sure" is "Assume fertile to be safe."

**User Impact:**
The microcopy is medically appropriate and avoids false certainty. It never tells the user "You are safe." It uses the objective phrase "Not Fertile". This reduces anxiety while maintaining absolute clarity about the product's limitations as a non-contraceptive.

**Suggested Direction:**
Positive finding. Strictly defend this microcopy against feature creep that attempts to make the app sound "smarter" than the underlying biology allows.

**Estimated Effort:** N/A
**Release Blocker:** No
