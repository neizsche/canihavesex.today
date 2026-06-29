# Clinical Review: Risk Communication

## Title: Defensive Posture on Uncertainty

**Severity:** Informational
**Confidence:** Confirmed
**Category:** Risk Communication
**Affected Files:** `apps/backend/src/engine.ts`, `TodayScreen.tsx`
**Evidence:** 
"Rule of Thumb: When a signal is missing or unclear, assume the user is fertile."
The UI explicitly states: "Not Sure: Assume fertile to be safe." 

**Scientific Assessment:**
Because fertility windows cannot be perfectly predicted retrospectively, and because biological anomalies (like delayed ovulation due to stress) are common, expanding the fertile window in the presence of uncertainty is the only clinically safe approach.

**Potential User Impact:**
Users are protected from false negatives (being told they are "Not Fertile" when they might actually be ovulating unpredictably).

**Suggested Direction:**
Positive finding. 

**Relevant Guideline or Evidence:** 
Principles of Clinical Risk Management.
**Release Blocker:** No
