# Security Review: Input Validation

## Title: Mitigation of CSV Injection in Export Route

**Severity:** Informational
**Confidence:** Confirmed
**Category:** Input Validation
**Affected Files:** `apps/backend/src/routes/export.ts`
**Location:** `/api/v1/user/export`

**Evidence:**
```typescript
const escapeFormula = (val: string) => {
  if (/^[=+\-@]/.test(val)) return `'${val}`;
  return val;
};
```
The export route iterates over user-generated content (`disturbances`, `symptoms`, `notes`) and prepends a single quote to strings starting with `=, +, -, or @`. 

**Attack Scenario:**
A malicious actor (or even a user themselves) inputs a spreadsheet formula like `=cmd|' /C calc'!A0` into a text field. Upon exporting and opening the CSV in Microsoft Excel or Google Sheets, the macro executes arbitrary commands on their machine.

**Potential Impact:**
Remote Code Execution on the client side via CSV Injection (Formula Injection).

**Recommended Direction:**
This is a strong positive finding. The defensive escaping of formula prefixes prevents the CSV payload from executing macros on the user's host machine. Maintain this protection.

**Relevant Standard:**
OWASP ASVS V5.1.5 Input Validation

**Release Blocker:**
No
