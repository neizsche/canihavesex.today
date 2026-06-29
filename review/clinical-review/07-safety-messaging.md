# Clinical Review: Safety Messaging

## Title: Missing Warnings for Hormonal Contraception

**Severity:** Medium
**Confidence:** Confirmed
**Category:** Safety Messaging
**Affected Files:** Onboarding Flow / Settings
**Evidence:** 
There does not appear to be an onboarding check asking if the user is currently on hormonal contraception (e.g., the Pill, IUD, implant).

**Scientific Assessment:**
Hormonal contraceptives suppress ovulation and alter cervical mucus. If a user on the Pill attempts to track their BBT and mucus, the engine will be analyzing artificial, medication-induced patterns, potentially confusing the user or outputting "anomalies".

**Potential User Impact:**
Users on hormonal birth control may believe they are learning about their natural cycle, when in fact they are merely recording pharmaceutical suppression.

**Suggested Direction:**
Add an onboarding or settings disclaimer: "This application is designed for natural cycles. If you are using hormonal contraception, your temperature and fluid patterns will not reflect natural ovulation."

**Relevant Guideline or Evidence:** 
ACOG Practice Bulletin on Hormonal Contraception.
**Release Blocker:** No
