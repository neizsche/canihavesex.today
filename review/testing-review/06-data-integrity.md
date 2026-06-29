# Testing & Reliability Review: Data Integrity

## Title: Transactional Guarantees during User Deletion

**Severity:** Low
**Confidence:** Needs Runtime Verification
**Category:** Data Integrity
**Affected Files:** `apps/backend/src/routes/user.ts`, `apps/backend/src/db.ts`

**Evidence:**
In `routes/user.ts`, `deleteAllData` executes several sequential promises:
```typescript
await logRepo.deleteLogsByUserId(userId);
await statusRepo.deleteStatusByUserId(userId);
await cycleRepo.deleteCyclesByUserId(userId);
```

**Reliability Risk:**
These deletes are awaited sequentially but are not wrapped in a single database transaction using `db.transaction()`. If the Node process crashes between `deleteLogsByUserId` and `deleteCyclesByUserId`, the user's account will be in a permanently corrupted, partially-deleted state.

**Suggested Direction:**
Wrap the entire `deleteAllData` operation in a `db.transaction(async (tx) => { ... })` block. This guarantees atomicity; either everything is deleted, or nothing is deleted.

**Recommended Test Type:** Integration
**Estimated Effort:** Small
**Release Blocker:** No
