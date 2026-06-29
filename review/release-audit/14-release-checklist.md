# Release Audit: Final Release Checklist

This checklist must be completed prior to announcing the project on Hacker News, Reddit, or other social channels.

## Before Tagging the Release
- [ ] Add `SECURITY.md` with instructions on how to privately disclose vulnerabilities.
- [ ] Add `CODE_OF_CONDUCT.md` to establish community norms.
- [ ] Verify `LICENSE` covers the entire repository.
- [ ] Confirm no secrets (e.g., API keys, real database URLs) are hardcoded in `.env.example` or source files.

## Before Publishing the Repository
- [ ] Create a `CHANGELOG.md` or utilize GitHub Releases for v1.0.0.
- [ ] Spin up a completely fresh DigitalOcean/Hetzner VPS and copy-paste the exact Docker installation instructions from the README to verify they work.

## First 24 Hours After Launch
- [ ] Monitor GitHub Issues closely for installation edge-cases (Windows Docker users often encounter volume mounting issues).
- [ ] Pin an issue welcoming contributors and outlining the roadmap for v1.1.

## First Week After Launch
- [ ] Implement Dependabot to automate dependency updates.
- [ ] Add reverse-proxy (Caddy, Traefik, Nginx) configuration examples to the documentation based on community requests.
