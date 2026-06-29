# Engineering Review: Technical Debt

## Title: Lack of Monorepo Build Orchestration

**Severity:** Low
**Confidence:** Confirmed
**Category:** Technical Debt
**Affected Files:** `package.json`

**Evidence:**
The root `package.json` uses basic NPM workspaces with manual chaining:
`"build": "npm run build -w apps/backend && npm run build -w apps/frontend"`
There is no `turbo.json` or `nx.json`.

**Engineering Impact:**
As the project grows, CI times will linearly increase because every change to the frontend will force a full rebuild of the backend and vice versa. There is no task caching.

**Suggested Direction:**
Adopt Turborepo (`turbo`) to manage the workspace. It requires very little configuration but provides immense value in CI caching and parallel task execution.

**Estimated Effort:** Small
**Release Blocker:** No
