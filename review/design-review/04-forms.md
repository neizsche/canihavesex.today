# Design Review: Forms

## Title: Clear Constraints on Past Edits

**Severity:** Informational
**Confidence:** Confirmed
**Category:** Forms
**Affected Screens:** `LogScreen.tsx`
**Evidence:** 
```typescript
const isEditable = date >= minDate && !demoPastLocked;
```
When viewing a date too far in the past, the form inputs are visually disabled (`pointer-events-none opacity-60`), and a clear warning banner explains *why* the entry is read-only.

**User Impact:**
Form disabling without context is a major source of user frustration. By providing an inline banner explaining that "This day is too far in the past to edit," the application prevents confusion and respects the user's mental model.

**Suggested Direction:**
Positive finding. 

**Estimated Effort:** N/A
**Release Blocker:** No
