# Privacy Review: Third-Party Services

## Title: Third-Party Services are Strictly Optional

**Severity:** Informational
**Confidence:** Confirmed
**Category:** Third-Party Services
**Affected Files:** `apps/backend/src/auth.ts`, `apps/backend/src/index.ts`

**Evidence:**
* **Google OAuth:** Only active if `GOOGLE_CLIENT_ID` is present.
* **Resend (Email):** Only active if `REQUIRE_EMAIL_VERIFICATION` is enabled (Cloud only).
* **Dodo (Payments):** Only active if `ENABLE_CLOUD_BILLING` is enabled.
* **Fonts/Assets:** Served locally (Tailwind fonts/local assets), preventing passive tracking from Google Fonts.

**Privacy Risk:**
Embedding third-party services often leaks IP addresses, User-Agents, and behavioral metadata to external vendors.

**Potential User Impact:**
Silent sharing of meta-data with big tech companies.

**Suggested Direction:**
Positive finding. A user who clones and spins up the application via Docker communicates with absolutely zero external third-party services by default. The isolation is complete.

**Release Blocker:**
No
