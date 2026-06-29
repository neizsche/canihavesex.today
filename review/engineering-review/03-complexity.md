# Engineering Review: Code Complexity

## Title: High Complexity in Fertility Engine Heuristics

**Severity:** Medium
**Confidence:** Needs Human Review
**Category:** Code Complexity
**Affected Files:** `apps/backend/src/engine.ts`, `apps/backend/src/services/EngineService.ts`

**Evidence:**
The `EngineService` orchestrates fetching a variable history length (e.g., last 3 cycles or 120 days) and feeds it to `runFusionEngine`. While the extraction into `engine.ts` is good, the internal branching logic dictating "safe" vs "fertile" windows inherently contains high cyclomatic complexity.

**Engineering Impact:**
If an edge case is discovered in the cycle prediction algorithm, debugging the state machine in `engine.ts` may prove difficult for new contributors due to the density of the rules.

**Suggested Direction:**
Ensure `engine.ts` is entirely composed of pure functions that take an array of structured inputs and return an array of outputs. Consider breaking the algorithm down into discrete "Phase Identifiers" (e.g., `calculateFollicularPhase()`, `calculateLutealPhase()`) rather than a monolithic loop.

**Estimated Effort:** Medium
**Release Blocker:** No
