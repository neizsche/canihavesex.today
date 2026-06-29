# Phase 1 Inspection: Documentation

## Title: Ambiguous AGPL Terms for Private Hosting

**Severity:** Medium
**Confidence:** Certain

**Files:** `README.md`
**Location:** License Section

**Problem:** 
The README simply states: "GNU AGPL-3.0. If you run a modified version as a network service, you must make your source available under the same license." While legally correct, this phrasing leaves the standard homelabber/self-hoster in a state of anxiety regarding what "network service" means in a personal context.

**Evidence:** 
The r/selfhosted community frequently debates AGPL implications. Many users will wonder: "If I modify a file, run this on a Raspberry Pi, and expose it via Cloudflare Tunnels so my partner can log their cycle from work, do I have to open-source my private homelab configurations or my custom CSS?"

**Why it matters:** 
Without an explicit, plain-English exemption or clarification for "personal, non-commercial, private household use", the strictness of AGPL will scare away privacy-conscious couples who simply want to run the app for themselves.

**Suggested direction:** 
Add a single clarification sentence: "Note: Hosting the app privately for yourself or your household does not require you to publish your source code. The AGPL requirement only triggers if you offer the app as a service to the public."

**Should this block the public release?** 
Yes
