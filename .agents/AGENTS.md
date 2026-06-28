# AI Coding Instructions

This file contains rules and instructions for AI agents (Gemini, Claude, Cursor, Aider, etc.) and developers operating in this repository.

**Read [AI_CONTEXT.md](../AI_CONTEXT.md) for core product philosophy and rules.**

---

## 1. Architectural Boundaries (Phase 2)

To keep the blast radius of each task small and ensure agents only need to reason about one layer at a time:

### Frontend
- **UI Components**: Must be mostly **presentational**. Avoid embedding complex state machines, data fetching, or mutation logic directly in the markup.
- **Custom Hooks**: Hooks should own all **data fetching, caching, and mutation logic** (typically wrapping React Query).
- **Domain Logic**: Keep business and domain calculations in **pure helper functions** that are easily testable.

### Backend
- **API Routes**: Keep routes extremely **thin**. Their only job is input validation (via Zod), calling the appropriate service/repository, and returning the response.
- **Services & Repositories**: Services hold business logic and external integrations. Repositories encapsulate all database queries and persistence logic.

---

## 2. Context Pull Reduction (Phase 3)

To prevent accidental context bloat and ensure searches are surgical:
- **No Giant "Utils" Files**: Avoid creating single, massive utility files. Group utilities by domain (e.g., `utils/calendar.ts`, `utils/math.ts`).
- **No Central Import Files**: Avoid creating index files that import and re-export everything in a directory, as they force agents to pull in unrelated dependencies.
- **Single Flow Screens**: Do not mix unrelated user flows (e.g., settings, logging, onboarding) in a single screen or file.
- **Co-located Tests**: Keep test files (`*.test.ts`, `*.test.tsx`) in the same directory as the logic they verify.

---

## 3. Standardized Prompting (Phase 5)

When prompting or receiving instructions, follow this steady state:
- **Scope**: Always name the specific file or feature.
- **Job**: State the job clearly: `fix`, `review`, `refactor`, or `explain`.
- **Constraints**: Apply constraints like "minimal diff", "no behavior change", and "don’t scan unrelated files".
- **Default Instruction**:
  > **Work only on `<file/feature>`.**
  > **Goal: `<fix/refactor/review/explain>`.**
  > **Constraints: minimal diff, preserve behavior, don’t scan unrelated files. Read only directly dependent files if needed.**

---

## 4. Size Discipline (Phase 6)

To prevent token bloat from creeping back into the repository:
- **File Size**: Review and evaluate any file above **~350–500 lines** for splitting.
- **Function Size**: Review and evaluate any function above **~40–60 lines** to extract pure logic.
- **Screen Splitting**: Split screen components when they mix rendering, state, mutations, and modal flows.

---

## 5. Search & Indexing Optimization (Phase 7)

To reduce wasted reads during exploration:
- **Feature Folders**: Organize code into feature-based directories (e.g., `components/log/`, `routes/log.ts`).
- **Explicit Naming**: Use explicit, descriptive names (e.g., `CycleLength` over `len`, `calculateFertilityWindow` over `processDates`).
- **Build & Scaffolding**: Keep all generated, build, and local AI scaffolding files out of version control and properly ignored in `.gitignore`.
- **Predictable Paths**: Ensure similar logic across different features lives in predictable, standardized locations.

---

## 6. General Coding Standards

### Error Handling
- **Backend**: Use standardized Fastify HTTP errors. Validate all input at the boundary using `zod` and `fastify-type-provider-zod`.
- **Frontend**: Handle loading, error, and success states comprehensively (typically via React Query). Never swallow errors silently.

### Logging & Comments
- **Why over What**: Comments should explain *why* the code exists, not *what* it does.
- **JSDoc**: All public/exported functions must have JSDoc comments detailing Purpose, Parameters, and Returns.
- **Module Headers**: Add a concise file-header comment at the top of important files explaining the module's responsibility.

### Regressions & Testing
- Do not refactor working code unless absolutely necessary or explicitly requested.
- Do not change public API surfaces (endpoints, exported signatures) without analyzing all dependents.
- Run tests (`npm run test`) to verify changes. `engine.test.ts` is critical.
- When fixing bugs, always add a regression test.

