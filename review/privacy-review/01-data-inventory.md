# Privacy Review: Data Inventory

## Title: Highly Minimized Personal Data Footprint

**Severity:** Informational
**Confidence:** Confirmed
**Category:** Data Collection
**Affected Files:** `apps/backend/src/routes/user.ts`, `apps/backend/src/db.ts`

**Evidence:**
A review of the repository reveals the exact scope of data collected:
* **Account:** `email` (Required), `password_hash` (Required if not using OAuth).
* **Health:** `bleeding`, `temperature`, `mucusType`, `lhTest`, `disturbances`, `symptoms`, `notes` (All Optional).
* **System:** `created_at` timestamp.

There is no collection of: Names, Dates of Birth, Phone Numbers, IP Addresses (at the DB layer), Device IDs, or Location.

**Privacy Risk:**
Storing unencrypted Special Category Data (health data) on the server presents an inherent risk if the database is breached. 

**Potential User Impact:**
Exposure of intimate reproductive health tracking in a data breach.

**Suggested Direction:**
Positive finding. The data inventory is exactly as small as functionally necessary to provide the service. Maintain this strict minimization. 

**Release Blocker:**
No
