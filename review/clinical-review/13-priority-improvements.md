# Clinical Review: Priority Improvements

This document ranks the clinical and educational improvements based on their impact on user safety and scientific transparency.

## Must Fix Before Release
*None.* The algorithm is appropriately conservative and the app explicitly disclaims being a medical device or contraceptive.

## Should Fix Soon (v1.x)
1. **Methodology Whitepaper:** Publish a `METHODOLOGY.md` file in the repository citing the exact symptothermal guidelines (e.g., Sensiplan) that the `engine.ts` implements. This is vital for trust among educators and clinicians.
2. **Hormonal Contraception Warning:** Add a disclaimer during onboarding or in the settings that the application is designed for *natural* cycles and will not function correctly if the user is actively on hormonal birth control.

## Can Wait Until After v1.0 (v2.0+)
1. **PCOS Explicit Support:** While the engine handles irregular cycles gracefully by widening the fertile window, a dedicated "Irregular / PCOS Mode" that provides specific educational nudges (e.g., "Multiple LH surges detected, common in PCOS") would be highly valuable.
2. **Postpartum & Breastfeeding Guidance:** The return of fertility postpartum is notoriously difficult to track. Adding specific UI disclaimers for users who recently gave birth would improve clinical safety.
