# Clinical Review: Regulatory Awareness

## Title: Avoiding Software as a Medical Device (SaMD) Triggers

**Severity:** Informational
**Confidence:** High
**Category:** Regulatory Awareness
**Affected Files:** `README.md`, `TodayScreen.tsx`
**Evidence:** 
The software does not claim to diagnose infertility, PCOS, or endometriosis. It explicitly denies being a contraceptive.

**Scientific Assessment:**
Under FDA and European MDR guidelines, software becomes a regulated medical device if it is intended to diagnose, prevent, or treat a medical condition. Because this is explicitly an educational tracker (like a digital calendar), it falls outside heavy regulation.

**Potential User Impact:**
The project can remain open-source without requiring millions of dollars in clinical trials.

**Suggested Direction:**
Positive finding. If future features are added (e.g., "PCOS Detector"), they must be reviewed legally, as diagnostic claims instantly trigger SaMD classification.

**Relevant Guideline or Evidence:** 
FDA Policy for Device Software Functions and Mobile Medical Applications.
**Release Blocker:** No
