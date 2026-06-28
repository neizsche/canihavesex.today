# AI Bugfix Guidelines

When fixing a bug in this repository:

1. **Identify the Layer**: Determine if the bug is in the UI (React), the Server State (React Query), the API boundary (Fastify/Zod), the DB (Repository), or the Core Logic (`engine.ts`).
2. **Write a Test First**: If the bug is in the backend, especially `engine.ts`, write a failing unit test in `engine.test.ts` before fixing the code.
3. **Fix and Verify**: Implement the fix and ensure the test passes.
4. **Explain the Root Cause**: In your PR or commit message, briefly explain *why* the bug happened, not just what lines you changed.
5. **Do Not Touch Unrelated Code**: Keep your fix strictly focused on the bug. Do not refactor unrelated code in the same commit.
