# Design Review: Consistency

## Title: Reliance on Tailwind Primitives

**Severity:** Low
**Confidence:** High
**Category:** Consistency
**Affected Screens:** `components/common/ui/`
**Evidence:** 
The UI heavily utilizes Tailwind utility classes, extracting common patterns into standard Shadcn-like components (e.g., `Button`). 

**User Impact:**
The interface benefits from systemic consistency in border radiuses (`rounded-xl`), spacing, and color palettes. However, if a developer overrides a utility class inline rather than updating the component variant, inconsistency can creep in.

**Suggested Direction:**
Ensure all interactive elements (Cards, Dialogs, Inputs) strictly use the abstracted components in `common/ui` rather than raw Tailwind div structures.

**Estimated Effort:** Small
**Release Blocker:** No
