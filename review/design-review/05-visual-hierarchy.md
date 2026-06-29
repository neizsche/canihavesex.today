# Design Review: Visual Hierarchy

## Title: Progressive Disclosure of Form Fields

**Severity:** Informational
**Confidence:** Confirmed
**Category:** Visual Hierarchy
**Affected Screens:** `LogScreen.tsx`
**Evidence:** 
The `LogScreen` uses `showMore` to hide secondary wellness inputs (mood, sleep, energy) by default, while exposing the primary fertility signals (bleeding, temperature, mucus).

**User Impact:**
Daily logging apps often suffer from "form fatigue," causing users to abandon the habit. By keeping the critical path short and hiding optional fields behind a "Show More" toggle, the interface reduces cognitive load.

**Suggested Direction:**
Positive finding. The summary text (`filledFieldsSummary`) ensures users know if they have hidden data without having to expand the section.

**Estimated Effort:** N/A
**Release Blocker:** No
