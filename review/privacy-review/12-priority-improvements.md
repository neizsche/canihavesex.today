# Phase 3 Privacy Review: Priority Improvements

This document outlines privacy enhancements that, while not necessary for V1, would further solidify the application's standing as a world-class privacy-preserving tool.

## 1. End-to-End Encryption (E2EE)
**Issue:** Health records currently sit in plaintext inside the PostgreSQL database. If the database is compromised, the data is readable.
**Fix:** Implement an E2EE architecture where logs are encrypted on the client using a key derived from the user's password before transit. The server would only ever see and store AES-GCM encrypted blobs. This prevents server operators from ever viewing the data.

## 2. Automated Retention Policies
**Issue:** Data is retained indefinitely unless the user manually deletes their account or clears their data.
**Fix:** Introduce a setting allowing users to define a rolling expiration window (e.g., "Auto-delete data older than 36 months").

## 3. Disconnect OAuth Email Storage
**Issue:** When users login via Google OAuth, the `user` table stores the email returned by Google.
**Fix:** Provide an option or default behavior to only store the irreversible hash of the email or just the OAuth `sub` identifier. This prevents a database leak from tying fertility data back to a real-world email address.
