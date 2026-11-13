---
name: react-frontend-engineering
description: Conventions for writing and refactoring React code in the Scheduling System (React 18 + Vite 5 + React Router 6 + Context + Tailwind 3, plain JSX). Use whenever creating, editing, or restructuring components, pages, hooks, routes, or the AppContext.
---

# React Frontend Engineering — Scheduling System

## Fixed stack (do not change without explicit user approval)
- React 18.3, react-dom 18.3, JSX (no TypeScript), ES modules.
- Vite 5 with `@vitejs/plugin-react`. Scripts: `npm run dev`, `npm run build`, `npm run preview`.
- React Router 6 (`BrowserRouter` in `src/main.jsx`, `<Routes>` in `src/App.jsx`).
- State: a single `AppProvider` in `src/context/AppContext.jsx`, read via `useApp()`.
- Persistence: the Night Ops Scheduler API in `server/` (Express 5 + Prisma + PostgreSQL). The React app talks to it only through `src/api/client.js`; `AppContext` loads `/api/state` and exposes the original record shapes. LocalStorage holds UI preferences only (`ss_theme`, `ss_lang`, `ss_ui`, `ss_filters`, `ss_notif_seen`).
- Styling: Tailwind 3 utilities + CSS custom properties. Icons: `lucide-react`.
- Do not add a UI kit, state library, CSS-in-JS, or animation library without asking. Prefer zero new runtime deps.

## The data layer is the contract
- Business rules live in `src/utils/scheduling.js` (`findConflicts`, `conflictPairs`, `overlaps`, `isOverdue`, `isUpcoming`, `percentDone`) and are **enforced by the API** (`server/src/routes/*.js`): permissions, validation, join codes, completion stamping. The UI mirrors them for instant feedback only.
- `AppContext` actions are async and resolve after the server accepted the change. Show success toasts only after `await action()` returns truthy; actions show their own error toasts.
- Conflict checks use `[...tasks, ...busy]` (`busy` = anonymous date blocks of a developer's work in other managers' projects).
- A redesign may **add** pure helpers (e.g. date formatting, grouping) but must not alter what existing helpers return.
- UI hiding is cosmetic; the server's checks are the real rule (`isManager`, membership, `assigneeId === user.id`). Never remove a server check to make a UI flow work.
- Record shapes:
  - user `{id,name,email,role:'manager'|'developer',salt,passwordHash,createdAt}`
  - project `{id,name,description,startDate,deadline,managerId,memberIds[],joinCode,createdAt}`
  - task `{id,title,description,projectId,assigneeId,startDate,deadline,priority:'Low'|'Medium'|'High',status:'Opened'|'In Progress'|'Completed',createdAt}`
  - Dates are `YYYY-MM-DD` strings compared lexically. Keep that; format only at render time.

## Component structure (target)
```
src/
  styles/        tokens.css (CSS variables, themes), base.css
  components/ui/ primitives: Button, IconButton, Input, Select, Textarea, Field,
                 Dialog, ConfirmDialog, Badge, Avatar, Card, EmptyState, Toast, Tabs,
                 SegmentedControl, Tooltip, Skeleton, ProgressRing/Bar, Kbd
  components/    domain: TaskForm, ProjectForm, TaskRow, TaskCard, ProjectCard,
                 CalendarMonth, CalendarAgenda, Timeline, ConflictBanner, StatTile
  layouts/       AppLayout (sidebar, topbar, command/search), AuthLayout
  pages/         one file per route (keep existing exports/routes)
  hooks/         useDisclosure, useMediaQuery, useTheme, useFocusTrap, useHotkey
```
- One component per concern; files under ~200 lines. Split when a file mixes layout, data derivation, and interaction.
- Derive data with `useMemo` only when the list work is non-trivial (calendar grids, conflict pairs). Don't memoize everything.
- Keep `useApp()` calls in pages/domain components; primitives must be context-free and prop-driven.
- Forward `className` and `...rest` on primitives; support `ref` with `forwardRef` where focus management needs it (inputs, buttons, dialog panels).
- Controlled forms with local state + explicit validation objects (current pattern). Preserve every existing validation message's meaning.

## Routing rules
- Keep every existing path: `/` (landing), `/login`, `/register`, `/forgot-password`, `/reset-password`, `/welcome` (onboarding), `/join/:code`, `/manager`, `/manager/projects`, `/manager/projects/:id`, `/manager/tasks`, `/manager/calendar`, `/manager/schedule`, `/developer`, `/developer/projects`, `/developer/join`, `/developer/tasks`, `/developer/tasks/:id`, `/developer/calendar`, `*`.
- New routes are additive and need approval. Keep `Guard` semantics (logged out → `/login`; wrong role → own dashboard).

## Additive context API (implemented)
- `toasts` queue + `dismissToast`; `updateProfile({name})`; `importData(data)`; optional task field `completedAt` stamped only on transition into Completed (removed on reopen) — never back-filled.
- All UI text goes through `useI18n().t()` (`src/i18n/en.js`, `ar.js`); messages returned by context actions are mapped with `tm()`. `src/i18n/i18n.test.js` fails on missing keys.
- Any reschedule/status change outside the TaskForm must use `useGuardedSave()` so the original conflict rule + "Save anyway" applies.

## Checklist before finishing a change
1. `npm run build` passes with no warnings you introduced.
2. No new console errors/warnings in dev (StrictMode double-render safe).
3. Every route still renders for its role; data still persists after reload.
4. No change to API record shapes without updating `server/src/lib/serialize.js`, a Prisma migration, and both test suites (`npm run test:all`).
