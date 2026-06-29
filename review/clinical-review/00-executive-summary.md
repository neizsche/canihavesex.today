# Clinical Review: Executive Summary

## Clinical Accuracy Score
**Score: 92 / 100**

## Scientific Confidence Assessment
* **Fertility logic:** Excellent (Adheres closely to established Symptothermal principles like the 3-over-6 BBT rule).
* **Medical terminology:** Good (Uses precise phrasing like "basal body temperature" and "follicular phase", though "Not Sure" is colloquially used instead of "Potentially Fertile").
* **Educational content:** Fair (Embedded in UI via the Log Coach, but lacks a dedicated long-form scientific methodology page).
* **Risk communication:** Excellent (Fails safe: "When a signal is missing or unclear, assume the user is fertile").
* **Safety messaging:** Good (Prominent disclaimers that it is not a contraceptive).
* **Scientific citations:** Weak (The codebase implements known rules but the public documentation does not cite WHO or ACOG guidelines directly).

## High-Risk Findings
1. **Lack of Peer-Reviewed Citations:** While the engine uses the established "3-over-6" temperature rule, it does not explicitly cite the medical guidelines (e.g., Sensiplan or WHO) it derives these heuristics from in the user-facing documentation. 
2. **Missing Efficacy Rates:** The application correctly states it is not a contraceptive, but users may still attempt to use it as one. It lacks explicit warnings about typical-use vs. perfect-use failure rates for symptothermal methods.

## Public Claim Verification
* **"Calculates fertility status based on observations"** — *Fully Supported* (The engine dynamically adjusts windows based on LH, Mucus, and BBT).
* **"Privacy-first"** — *Fully Supported* (No telemetry, self-hostable).
* **"Not a contraceptive"** — *Fully Supported* (Stated prominently; engine widens the fertile window when data is irregular).

## Release Blockers
*None.* The application's core logic is appropriately cautious and conservative. It does not make diagnostic claims that would violate FDA/MDR definitions of a medical device in its current educational scope.

## Post-v1 Improvements
* **Methodology Whitepaper:** Publish a dedicated markdown file citing the exact symptothermal literature (e.g., *Sensiplan* rules) used in the engine.
* **PCOS / Irregular Cycle Guidance:** Add explicit UI warnings when cycle length spread exceeds 7 days (currently detected in code, but UI messaging could be stronger).

## Final Assessment
* **Does the application accurately reflect current fertility awareness knowledge?** Yes. The `engine.ts` implements standard multi-symptom fusion rules (BBT + Mucus corroboration).
* **Does it appropriately communicate uncertainty?** Yes. The default fallback state is "Not Sure: Assume fertile to be safe."
* **Could any wording unintentionally mislead users?** The color green for "Not Fertile" might subconsciously imply "Go / Safe for unprotected sex."
* **Does it avoid making medical claims?** Yes, the README explicitly disclaims medical advice.
* **Would a knowledgeable FAM educator consider the application responsible?** Yes, because the algorithm penalizes missing data by widening the fertile window, which is the clinically responsible approach.
