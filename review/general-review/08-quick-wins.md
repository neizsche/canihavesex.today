# Phase 1 Inspection: Quick Wins

Here are the highest-impact improvements grouped by the estimated effort required.

## Under 5 minutes

* **(COMPLETED) Fix docker-compose.yml:** Add the `build: .` context under the `app` service so that the command in the README (`docker compose up -d --build`) actually builds the image from source.
* **(COMPLETED) Clarify AGPL for Homelabs:** Add a one-sentence disclaimer in the README explaining that running the app privately for a single household does not trigger the AGPL requirement to publish source code or modifications.

## Under 15 minutes

* **(COMPLETED) Add Dependabot:** Create `.github/dependabot.yml` to automatically manage npm dependency updates across the workspace.

## Under 30 minutes

* **(COMPLETED) Standardize Boolean Naming:** Do a quick refactor in `engine.ts` to rename booleans like `multiSurge` and `exact` to `isMultiSurge` and `isExact` for ultimate strictness and consistency.

## Under 1 hour

* **(COMPLETED) Add a PR Workflow Action:** Create a GitHub Action `.github/workflows/pr.yml` that runs `npm run lint`, `npm run format --check`, and the test suite whenever a new Pull Request is opened. Currently, testing seems localized or only checked prior to deploying.
