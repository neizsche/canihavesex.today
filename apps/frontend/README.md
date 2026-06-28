# Frontend

This is the Astro + React frontend for canihavesex.today.

## Purpose & Responsibilities

- **User Interface**: Renders the daily status, logging forms, charts, and settings.
- **State Management**: Uses `@tanstack/react-query` for API data fetching/caching and standard React state (`useState`/`useReducer`) for local UI state.
- **Routing**: Handled by Astro (`src/pages/`).
- **Styling**: Tailwind CSS with custom branding in `tailwind.config.mjs`.

## Core Modules

- `src/pages/`: Astro pages defining the application's routes.
- `src/components/`: React components. Contains the core logic for rendering data.
  - `src/components/today/`: The main dashboard.
  - `src/components/log/`: The complex logging form and its state machine (`logState.ts`).
- `src/hooks/`: Reusable React Query hooks for API communication.
- `src/lib/`: Frontend utilities.

## Context

For architectural decisions, refer to `../../ARCHITECTURE.md`.
To run locally, use the root `npm run dev` script or `npm run dev` here.
