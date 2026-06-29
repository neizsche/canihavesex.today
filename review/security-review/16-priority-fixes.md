# Phase 2 Security Review: Priority Fixes

This document outlines the ranked priorities for security improvements based on the Phase 2 inspection.

## 1. Implement Session Revocation (High Priority)
**Issue:** The signed `uid` cookie does not map to a stateful session. Logging out only instructs the browser to clear the cookie. An intercepted cookie can be replayed until it expires in 30 days.
**Fix:** Introduce a `sessions` table (`id`, `user_id`, `created_at`, `expires_at`). Issue a `session_id` to the cookie. In `plugins/auth.ts`, validate that the session exists in the database. On logout, delete the specific session row.

## 2. Introduce Content Security Policy (Safe to Defer)
**Issue:** The application uses several great security headers but lacks a strict CSP.
**Fix:** Add a `Content-Security-Policy` header allowing scripts and assets only from `'self'` or explicitly trusted domains to mitigate any undiscovered XSS.

## 3. Harden Docker Container Capabilities (Safe to Defer)
**Issue:** While the container drops to a non-root user, it does not explicitly drop Linux capabilities.
**Fix:** Update documentation/docker-compose to suggest running with `--cap-drop=ALL` and `--security-opt no-new-privileges:true`.

## 4. Setup Automated Dependency Scanning (Safe to Defer)
**Issue:** Vulnerabilities in npm dependencies require manual discovery.
**Fix:** Add `.github/dependabot.yml` to automatically bump vulnerable package versions.
