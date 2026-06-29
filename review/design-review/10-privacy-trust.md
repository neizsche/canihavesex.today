# Design Review: Privacy & Trust Signals

## Title: Discreet Mode Enhances Real-World Privacy

**Severity:** Informational
**Confidence:** Confirmed
**Category:** Privacy & Trust
**Affected Screens:** `Header.tsx`, `TodayScreen.tsx`
**Evidence:** 
The application includes a `useDiscreetMode` hook that explicitly hides the primary branding ("canihavesex.today") from the screen.

**User Impact:**
The explicit URL and branding, while memorable, may make users uncomfortable if someone glances over their shoulder in public. "Discreet Mode" proves the developers deeply understand their users' real-world privacy needs, generating massive trust.

**Suggested Direction:**
Positive finding. Ensure Discreet Mode is highly discoverable in the Settings menu.

**Estimated Effort:** N/A
**Release Blocker:** No
