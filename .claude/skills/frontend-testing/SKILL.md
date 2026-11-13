---
name: frontend-testing
description: Testing strategy and setup for the Scheduling System frontend (Vitest + React Testing Library + jsdom). Use when adding tests, protecting business rules before a refactor, or verifying that the redesign preserved functionality.
---

# Frontend Testing — Scheduling System

The repository currently has **no tests and no test runner**. Adding them requires user approval for the dev dependencies.

## Proposed tooling (dev-only)
- `vitest`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom`. Optional: `vitest-axe`.
- Config: add `test: { environment: 'jsdom', setupFiles: './src/test/setup.js', globals: true }` to `vite.config.js`.
- Scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.
- `setup.js`: import jest-dom and `localStorage.clear()` in `beforeEach`. Polyfill `crypto.subtle` if jsdom lacks it (Node 20+ provides `globalThis.crypto`).

## Order of work: lock behavior *before* redesign
1. **Unit tests for `src/utils/scheduling.js`** (pure; highest value):
   - `overlaps`: inclusive edges (same day counts as overlap), disjoint ranges.
   - `findConflicts`: same assignee only, ignores Completed (both sides), excludes self by id.
   - `conflictPairs`: no duplicates, ignores Completed.
   - `isOverdue` / `isUpcoming(t, days)`: boundaries at today and today+days; Completed excluded.
   - `percentDone`: empty → 0, rounding.
   - `makeJoinCode`: 6 chars, allowed alphabet (no I, L, O, 0, 1), avoids existing codes.
   - Freeze time with `vi.useFakeTimers().setSystemTime(...)`.
2. **Unit tests for `storage.js`**: corrupted JSON → fallback; non-array where array expected → fallback.
3. **Context/integration tests** (render `<MemoryRouter><AppProvider><App/></AppProvider></MemoryRouter>`):
   - Register validation messages; duplicate email rejected; login wrong password.
   - Route guards: logged out → `/login`; developer visiting `/manager/*` → `/developer`.
   - Manager: create/edit/delete project (cascade deletes tasks); join code shown and copy calls clipboard.
   - Developer: join with empty / invalid / duplicate / valid code.
   - Task form: required fields, deadline before start, assignee must be a member, conflict panel → Cancel and Save anyway.
   - Tasks filters (project, developer, status, priority, overdue, next 7 days).
   - Developer can change status only of own tasks; manager status is read-only in table.
   - Calendar: month navigation, Today, chip opens details, "+n more".
4. Write tests **against roles and labels** (`getByRole('button', {name: /create task/i})`), not class names. That way they keep passing through the redesign.

## Rules
- Seed data by writing `ss_*` keys into `localStorage` before render. Don't stub the context.
- Each redesign phase must keep the suite green. If copy changes intentionally, update the test and mention it in the summary.
- Don't snapshot whole pages because they're brittle and useless across a redesign.
