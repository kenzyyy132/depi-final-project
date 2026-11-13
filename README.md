# Night Ops Scheduler

A multi-user project scheduling web app for project managers and the developers they work with. Managers plan projects, invite developers and assign tasks. Developers join with a code or invitation link and move their work forward. The app checks every save for overlapping work.

- **Web app:** React 18, Vite, React Router 6, Tailwind CSS, English and Arabic with full right-to-left layout, dark and light themes.
- **API:** Node.js with Express 5, Prisma ORM and PostgreSQL.
- **Auth:** scrypt password hashes and server-side sessions in httpOnly cookies, plus password reset by email.

## Quick start (local development)

Requirements: Node.js 20.12 or newer. You don't need to install PostgreSQL locally: when `DATABASE_URL` is unset, the dev script starts a real PostgreSQL from the `embedded-postgres` package and keeps its data in `server/.local-db/`.

```bash
npm install                 # web app dependencies
npm --prefix server install # API dependencies (also generates the Prisma client)
npm run dev                 # API on :4000 (+ local DB, migrations applied) and web app on :5173
```

Open **http://localhost:5173**. In development, password-reset and invitation emails are printed in the terminal (`[api]` lines) instead of being sent.

To use your own PostgreSQL, copy `server/.env.example` to `server/.env` and set `DATABASE_URL`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Full stack: API (auto-restart) + local DB + Vite dev server |
| `npm run dev:client` / `npm run dev:server` | Run one side only |
| `npm run build` | Production build of the web app into `dist/` |
| `npm start` | Start the API (serves `dist/` when `SERVE_CLIENT=true`) |
| `npm test` | Web app tests (Vitest + Testing Library), run against the real API and a throwaway PostgreSQL |
| `npm run test:server` | API tests (Vitest + Supertest, real PostgreSQL) |
| `npm run test:all` | Both |
| `npm --prefix server run db:migrate` | Apply database migrations (`prisma migrate deploy`) |

## Features

- **Public site:** landing page, registration with role choice, login, forgot and reset password, and invitation pages (`/join/CODE`).
- **Onboarding:**
  - Managers create their first project and share its invite link or code.
  - Developers join their first project; when they arrive through an invitation, the code is already filled in.
- **Projects:** create, edit and delete; each project gets a unique six-character join code, a copyable invitation link and optional email invitations.
- **Tasks:**
  - Managers create, edit, delete and filter tasks.
  - Only the assigned developer can change a task's status. The server enforces this rule as well as the UI.
  - The time a task is completed is recorded.
- **Conflict detection:** saving or dragging a task that overlaps the same developer's open work asks for confirmation first, with a "Save anyway" option.
  - The check covers the developer's work in every project, including other managers' projects. Those projects appear only as anonymous date blocks.
- **Views:** dashboards, Kanban board, month, week, timeline and agenda calendars, per-developer schedule, team view, reports, notifications, command palette (Ctrl+K).
- **Settings:** profile, password change (other sessions are signed out), appearance, language, and export/import of backups. Import never overwrites anything and never creates accounts.
- **Sessions:** sliding 30-day sessions. When a session expires or is revoked, the user lands on the login screen with a clear message.
- **Collaboration:** data refreshes every 30 seconds and whenever the window regains focus, so collaborators see each other's changes.

## Project structure

```
src/                      React app
  api/client.js           fetch wrapper (cookies, CSRF header, error mapping, session-loss events)
  context/AppContext.jsx  app state from the API + all actions
  pages/                  Landing, Auth (login/register/forgot/reset), Onboarding, Invite, Dashboard, …
  components/, layouts/, i18n/ (en + ar), theme/, utils/ (scheduling rules, analytics, dates)
server/                   API
  prisma/                 schema.prisma + SQL migrations
  src/app.js              Express app: security headers, CORS, CSRF, rate limits, static hosting
  src/routes/             auth.js, data.js (state, projects, joining, invites, tasks, export/import)
  src/lib/                config validation, sessions, password hashing, mail, serializers
  scripts/                dev runner, embedded local PostgreSQL
  test/                   API tests + harness shared with the React tests
Dockerfile, render.yaml   deployment templates (see DEPLOYMENT.md)
```

## Deployment

See **[DEPLOYMENT.md](DEPLOYMENT.md)**. It covers environment variables, the database, email, security settings, and step-by-step hosting with Docker, Render or Railway, or with the frontend and backend on separate hosts.
