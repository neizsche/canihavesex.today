# Clinical Review: Educational Content

## Title: Contextual In-App Coaching

**Severity:** Low
**Confidence:** High
**Category:** Educational Content
**Affected Files:** `LogCoachSheet.tsx` (inferred from previous reviews)
**Evidence:** 
First-time users are presented with a "Log Coach" that explains how to take BBT (Basal Body Temperature) and check cervical fluid. 

**Scientific Assessment:**
User error (e.g., taking temperature after getting out of bed, or misidentifying semen as cervical fluid) is the primary cause of failure for symptothermal methods. Providing embedded education mitigates this risk.

**Potential User Impact:**
Reduces the likelihood of "garbage in, garbage out" data leading to incorrect fertility interpretations.

**Suggested Direction:**
Ensure the Log Coach explicitly warns users not to log BBT if they have a fever, and to discard mucus readings if they recently had unprotected intercourse (due to semen masking).

**Relevant Guideline or Evidence:** 
WHO guidelines on FAM user education.
**Release Blocker:** No
