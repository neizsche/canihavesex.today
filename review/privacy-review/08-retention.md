# Privacy Review: Data Retention

## Title: Absolute Deletion Capabilities

**Severity:** Informational
**Confidence:** Confirmed
**Category:** Retention
**Affected Files:** `apps/backend/src/routes/user.ts`

**Evidence:**
The application offers two endpoints:
* `DELETE /api/v1/user/data` (Deletes logs, status, cycles, and settings without closing the account).
* `DELETE /api/v1/user/account` (Deletes identities, user records, and all data, plus revokes the cookie).

**Privacy Risk:**
Companies frequently implement "soft deletes" (e.g., `deleted_at = NOW()`), keeping the actual database records forever, which is a major privacy anti-pattern.

**Potential User Impact:**
Users are unable to successfully scrub their data.

**Suggested Direction:**
Positive finding. The use of explicit SQL `DELETE` cascading across all repositories proves the application genuinely respects a user's right to be forgotten. 
*Enhancement:* Consider adding an automated retention policy setting, e.g., "Auto-delete logs older than 5 years."

**Release Blocker:**
No
