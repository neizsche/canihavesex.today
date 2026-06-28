# AI Refactor Guidelines

When tasked with refactoring code in this repository:

1. **Do not change behavior.** The app should behave exactly the same. Run tests (`npm run test`) to verify.
2. **Prioritize Token Efficiency**. Split large files (500+ lines) by responsibility, but do not split just for the sake of it. Keep cohesive logic together.
3. **Use Domain Language**. Rename variables that are too generic (e.g., `data`, `helper`, `process`) to explicit domain terms (`cycleLogs`, `calculateRisk`, `formatDate`).
4. **Respect the Architecture**. Keep the separation of UI state (React `useState`) and Server state (React Query). See `ARCHITECTURE.md`.
5. **No Dependencies**. Do not add new NPM packages for a refactor unless explicitly approved. Native JS/browser APIs are preferred.
