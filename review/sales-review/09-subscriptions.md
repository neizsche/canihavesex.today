# Sales & Conversion Review: Subscriptions

## Title: Frictionless Cancellation

**Severity:** Low
**Confidence:** Medium
**Category:** Subscription Experience
**Evidence:** 
The `useBillingStatus` hook includes a `cancelAtPeriodEnd` flag.

**Current Experience:**
This flag indicates the application is designed to gracefully handle users who cancel their subscription but still have time remaining on their paid period.

**Business Impact:**
Making cancellation easy ("one-click cancel") is the single best way to ensure users are willing to sign up in the first place. High-friction cancellations lead to chargebacks and reputational damage.

**Suggested Direction:**
Prominently state "Cancel Anytime" on the pricing page.

**Estimated Revenue Impact:** Medium
**Estimated Effort:** Low
**Launch Blocker:** No
