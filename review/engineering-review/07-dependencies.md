# Engineering Review: Dependency Management

## Title: Minimalist Dependency Graph

**Severity:** Informational
**Confidence:** Confirmed
**Category:** Dependencies
**Affected Files:** `package.json`

**Evidence:**
The backend utilizes built-in Node modules (`node:crypto`) instead of heavier third-party equivalents like `bcrypt`. It relies on lightweight `pg` for database access instead of a massive ORM like Prisma or TypeORM.

**Engineering Impact:**
The lean dependency tree significantly reduces install times, docker image sizes, and the attack surface for supply-chain vulnerabilities. Upgrading dependencies will be vastly easier without the lock-in of an ORM.

**Suggested Direction:**
Positive finding. Strictly defend the decision to omit an ORM. The raw SQL wrapper (`db.ts`) is currently more than sufficient and highly performant.

**Estimated Effort:** Small
**Release Blocker:** No
