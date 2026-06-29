# Release Audit: API Readiness

## Title: Clean API Boundaries but Missing Documentation

**Severity:** Low
**Confidence:** Confirmed
**Category:** API
**Affected Files:** `apps/backend/src/routes/`
**Evidence:** 
The API is strictly validated via Zod and uses standard JSON payloads. However, there is no Swagger/OpenAPI documentation generated or provided.

**Impact:**
Third-party developers or power-users attempting to build integrations (e.g., Siri Shortcuts, HomeAssistant) will have to read the source code to understand the API contracts. 

**Recommended Direction:**
Add `@fastify/swagger` and `@fastify/swagger-ui` to automatically generate API documentation from the existing Zod schemas. This is a massive "quick win" for developer experience.

**Estimated Fix Time:** Small
**Release Blocker:** No
