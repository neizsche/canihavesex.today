# Sales & Conversion Review: Pricing Strategy

## Title: Offering a Lifetime Plan

**Severity:** Informational
**Confidence:** Confirmed
**Category:** Pricing Strategy
**Evidence:** 
`apps/frontend/src/hooks/queries/useBillingStatus.ts` includes `BillingPlan = 'yearly' | 'lifetime' | null;`.

**Current Experience:**
The application offers a 'lifetime' subscription tier alongside 'yearly'.

**Business Impact:**
Developer and privacy-focused communities heavily resist SaaS subscriptions. Offering a Lifetime deal (e.g., $149 once) drastically increases conversion rates among users who would otherwise churn or simply try to self-host to avoid a monthly fee.

**Suggested Direction:**
Ensure the Lifetime plan is priced to account for 3-5 years of LTV (Life Time Value) equivalent of the yearly plan.

**Estimated Revenue Impact:** High
**Estimated Effort:** N/A
**Launch Blocker:** No
