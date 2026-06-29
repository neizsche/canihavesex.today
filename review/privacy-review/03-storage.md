# Privacy Review: Storage Review

## Title: Persistent Storage Limited to Explicit Inputs

**Severity:** Informational
**Confidence:** Confirmed
**Category:** Storage
**Affected Files:** `apps/backend/src/repositories/`

**Evidence:**
* **Database:** Stores structured application data.
* **Server Filesystem:** No user-generated files or temporary state are written to the server filesystem.
* **Backups:** Handled externally by the Docker volume.

**Privacy Risk:**
There is no ephemeral data that is accidentally persisted forever. The only data that persists is what the user explicitly saves.

**Potential User Impact:**
Users maintain total agency over their storage footprint.

**Suggested Direction:**
Maintain the current state.

**Release Blocker:**
No
