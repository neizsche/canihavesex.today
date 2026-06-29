# Phase 1 Inspection: Code Consistency

## Title: Inconsistent Boolean Variable Naming

**Severity:** Nitpick
**Confidence:** Likely

**Files:** `apps/backend/src/engine.ts`
**Location:** Interface Definitions (Lines 56, 73, 571)

**Problem:** 
There are minor inconsistencies in how boolean properties and variables are named throughout the core engine. Some use the standard `is` prefix, while others do not.

**Evidence:** 
In `EngineDay`:
* `isLhPositive?: boolean;`
* `isBleeding?: boolean;`

In `EngineResult`:
* `isConfirmed: boolean;`

But in other places (e.g., `detectLhSurge` return type):
* `multiSurge: boolean`
* `exact: boolean` (in `calcOvulationDay`)

**Why it matters:** 
While purely cosmetic and not functionally detrimental, experienced reviewers and contributors appreciate strict, uniform naming conventions (e.g., always prefixing booleans with `is`, `has`, or `should`).

**Suggested direction:** 
Standardize boolean naming to universally use a prefix. For instance, rename `multiSurge` to `isMultiSurge` and `exact` to `isExact`.

**Should this block the public release?** 
No
