# Clinical Review: Fertility Engine

## Title: Evidence-Based Symptothermal Fusion

**Severity:** Informational
**Confidence:** Confirmed
**Category:** Fertility Engine
**Affected Files:** `apps/backend/src/engine.ts`
**Evidence:** 
The engine requires BBT corroboration for confirmed ovulation:
`const ltl = Math.max(...prior.map((p) => p.temp));`
`const t = 0.2; // °C above LTL (clinical 3-over-6 rule)`
It also implements the "conflicting bio-signals" anomaly check and requires double-confirmation from either mucus or LH tests to achieve `isConfirmed = true`.

**Scientific Assessment:**
The engine is not using a naive calendar rhythm method. It correctly implements the core tenets of the symptothermal method (similar to Sensiplan). The requirement of a 0.2°C shift sustained over 3 days following 6 lower days is the established medical standard for detecting the progesterone thermal shift.

**Potential User Impact:**
Users mapping their physiological signs will receive scientifically grounded interpretations rather than algorithmic guesses.

**Suggested Direction:**
Positive finding. 

**Relevant Guideline or Evidence:** 
World Health Organization (WHO) and Sensiplan guidelines for the symptothermal method.
**Release Blocker:** No
