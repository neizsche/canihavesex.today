# Testing & Reliability Review: Production Failure Scenarios

## Title: Mental Simulation of Common Failures

This document explores how the application handles likely production outages.

### 1. Database Unavailable
* **Outcome:** Fastify will throw an unhandled promise rejection at the repository layer. The global error handler catches it, replaces the message with "Internal Server Error", and returns a 500. The frontend's React Query layer receives the 500, enters an `isError` state, and displays a generic error message to the user after 3 retries.
* **Risk:** The user experience is interrupted, but no data is corrupted or partially written.

### 2. PWA Offline During Submission
* **Outcome:** The user hits "Save" while riding the subway. The `fetch` call throws a network error.
* **Risk:** Because there is no persistent mutation queue in the current architecture, the log is lost. The user must manually re-enter it when they regain connectivity.

### 3. Container Out Of Memory (OOM)
* **Outcome:** The Node process crashes. The Docker supervisor (`dumb-init`) exits. The orchestration platform (e.g., Docker Swarm, K8s, or Cloud Run) detects the crashed container and restarts it.
* **Risk:** Any requests currently in-flight are dropped (resulting in a 502 Bad Gateway for users). Because the backend is entirely stateless, the replacement container serves traffic immediately with zero state recovery time required.

### 4. Malformed Client Request (API Abuse)
* **Outcome:** An attacker submits a POST request with `period_length: 500`. Zod schema validation intercepts the request in the Fastify `preHandler` hook.
* **Risk:** A 400 Bad Request is returned instantly. The business logic is never executed, preventing database constraints from being tested or violated.
