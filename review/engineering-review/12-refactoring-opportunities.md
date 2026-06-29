# Engineering Review: Refactoring Opportunities

## Title: Pure Function Extraction for the Engine

**Severity:** Low
**Confidence:** Confirmed
**Category:** Refactoring Opportunities
**Affected Files:** `apps/backend/src/engine.ts`

**Evidence:**
While the `engine.ts` encapsulates the logic well enough, the heuristic rules (e.g., detecting peak days from mucus changes or temperature shifts) could be pulled into smaller, individually testable pure functions. Right now, it is a single orchestrating function that loops and maintains a large internal state.

**Engineering Impact:**
If you want to test *just* the "temperature shift rule", you currently must construct an entire array of fake logs and run the full engine. Isolating the rules makes unit testing drastically simpler.

**Suggested Direction:**
Extract discrete rules into isolated functions like `detectTemperatureShift(recentTemps)` and `isPeakMucusDay(mucusType)`.

**Estimated Effort:** Medium
**Release Blocker:** No
