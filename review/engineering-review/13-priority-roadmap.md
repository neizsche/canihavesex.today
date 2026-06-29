# Engineering Review: Priority Roadmap

This document outlines the recommended sequencing for addressing the engineering issues identified in this Phase 4 audit.

## Must Fix Before Release
*None.* The architecture is solid and maintains clean boundaries. The app is completely viable for an initial launch.

## Should Fix Soon (v1.x)
1. **Frontend API Client:** Replace manual `fetch` calls with a strongly-typed client that shares schema definitions with the backend. This eliminates an entire class of silent boundary errors.
2. **End-to-End Tests:** Introduce a Playwright test suite to simulate core user flows (PWA install, logging data, engine prediction). 
3. **Structured Error Handling:** Introduce a `DomainError` class on the backend to propagate precise, typed failure codes to the frontend, rather than catching and obfuscating them under generic 500s.

## Can Wait Until After v1.0 (v2.0+)
1. **Monorepo Orchestration:** Introduce Turborepo (`turbo`) to manage caching and parallel builds.
2. **Engine Refactoring:** Break down the monolithic `runFusionEngine` state machine into highly composable, discrete pure functions to ease isolated unit testing.
