# Clinical Review: Scientific References

## Title: Lack of Public Scientific Citations

**Severity:** Medium
**Confidence:** Confirmed
**Category:** Scientific Sources
**Affected Files:** Repository Root
**Evidence:** 
While the source code (`engine.ts`) mentions the "clinical 3-over-6 rule", there is no `METHODOLOGY.md` or public-facing documentation citing the medical literature that the engine relies upon.

**Scientific Assessment:**
For a health application, especially an open-source one, "trust but verify" is paramount. Medical professionals and FAM educators cannot confidently recommend the application without a clear, cited explanation of the algorithm's rules.

**Potential User Impact:**
Educated users may doubt the accuracy of the engine if they cannot read the underlying biological rationale.

**Suggested Direction:**
Draft a `METHODOLOGY.md` file that explains how the engine weights BBT, LH, and Mucus, citing relevant peer-reviewed literature (e.g., studies on the efficacy of the symptothermal method).

**Relevant Guideline or Evidence:** 
Principles of Evidence-Based Medicine (EBM) and transparent health communication.
**Release Blocker:** No
