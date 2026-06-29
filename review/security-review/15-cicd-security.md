# Security Review: CI/CD & Build Security

## Title: Secretless GCP Authentication via Workload Identity

**Severity:** Informational
**Confidence:** Confirmed
**Category:** CI/CD & Build Security
**Affected Files:** `.github/workflows/deploy.yml`
**Location:** Github Actions Workflow

**Evidence:**
```yaml
- name: Authenticate to Google Cloud
  uses: google-github-actions/auth@v2
  with:
    workload_identity_provider: ${{ secrets.WIF_PROVIDER }}
    service_account: ${{ secrets.WIF_SERVICE_ACCOUNT }}
```

**Attack Scenario:**
A developer's GitHub account is compromised, or an attacker exploits a GitHub Actions vulnerability to exfiltrate secrets. If long-lived GCP service account keys were stored as GitHub Secrets, the attacker could pivot into the production GCP environment.

**Potential Impact:**
Full infrastructure compromise.

**Recommended Direction:**
Positive finding. The use of Workload Identity Federation (WIF) eliminates the need for long-lived JSON keys, vastly reducing the blast radius of a GitHub compromise. This is an elite DevOps security practice.

**Relevant Standard:**
OWASP ASVS V1.12 Deployment Architecture

**Release Blocker:**
No
