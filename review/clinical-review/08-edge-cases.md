# Clinical Review: Edge Cases

## Title: Degrading Reliability on Anomalies

**Severity:** Informational
**Confidence:** Confirmed
**Category:** Edge Cases
**Affected Files:** `apps/backend/src/engine.ts`
**Evidence:** 
The engine actively reduces the reliability score (`rTemp`) of temperature readings if the user logs disturbances like `fever`, `alcohol`, `bad_sleep`, or `late_measurement`. Mucus is invalidated if `semen_exposure` is logged.

**Scientific Assessment:**
These are exactly the biological disruptors that invalidate symptothermal readings. A fever will artificially mimic a progesterone thermal shift, leading to a false positive ovulation confirmation. By dropping `rTemp` to `0.0` for fever, the engine protects the user from a potentially catastrophic false "Not Fertile" state.

**Potential User Impact:**
Users are protected against algorithmic overconfidence when their data is messy.

**Suggested Direction:**
Positive finding. 

**Relevant Guideline or Evidence:** 
Sensiplan rules for disturbed temperatures.
**Release Blocker:** No
