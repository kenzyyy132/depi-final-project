# Deploying Night Ops Scheduler

The app consists of three parts:

1. **PostgreSQL database:** any managed Postgres 14+ (Neon, Supabase, Render, Railway, AWS RDS, …).
2. **API server** (`server/`): Node.js 20.12+.
3. **Web app** (`dist/`): static files built by Vite.

**Recommended:** run the API and web app as a single service on a single origin. The API serves `dist/` (`SERVE_CLIENT=true`), so cookies are first-party, no CORS is needed, and there's one URL to configure. The `Dockerfile` does exactly this.

---

## 1. Environment variables (API)

All variables are documented in [`server/.env.example`](server/.env.example). In production, set them in your host's dashboard and never commit them.

| Variable | Required | Notes |
|---|---|---|
| `NODE_ENV` | yes | `production` |
| `DATABASE_URL` | yes | `postgresql://USER:PASS@HOST:5432/DB?schema=public&sslmode=require` |
| `APP_URL` | yes | Public URL of the web app, e.g. `https://app.example.com`. Used in reset/invite links and as the allowed CORS origin. |
| `PORT` | host-provided | Most platforms set it automatically. The Docker image defaults to 8080. |
| `SERVE_CLIENT` | single-origin | `true` to serve `dist/` from the API (already set in the Docker image) |
| `TRUST_PROXY` | behind a proxy | `1` on Render/Railway/Fly/Heroku (already set in the Docker image) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | for email | Password reset and email invitations. Without `SMTP_HOST`, the UI says these features aren't available. Nothing is faked. |
| `CORS_ORIGINS` | split hosting only | Extra allowed frontend origins, comma-separated |
| `COOKIE_SAMESITE` | split hosting only | `none` when the frontend and API are on different sites (requires HTTPS) |
| `COOKIE_SECURE`, `SESSION_DAYS`, `RESET_TOKEN_MINUTES`, `RATE_LIMIT_*` | optional | Defaults: secure cookies in production, 30-day sessions, 60-minute reset links |

**Web app build variable:** `VITE_API_URL` is only for split hosting. It is embedded in the JavaScript at build time, so it must never contain secrets. Leave it empty for single-origin hosting.

The server **refuses to start** in production when `DATABASE_URL` or `APP_URL` is missing, or when the cookie settings are inconsistent.

## 2. Database

- Create an empty PostgreSQL database and put its URL in `DATABASE_URL`.
- Migrations live in `server/prisma/migrations/`. Apply them with:

  ```bash
  npm --prefix server run db:migrate      # = prisma migrate deploy
  ```

  The Docker image and `npm --prefix server run start:prod` run this automatically at every start; it is safe to run repeatedly.
- **Backups:** turn on your provider's automated backups. Users can also export their own data from **Settings → Data**.

## 3. Email (SMTP)

Any SMTP provider works: Resend, SendGrid, Mailgun, Postmark, Amazon SES, Gmail with an app password, and so on.

```
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_SECURE=false        # true for port 465
SMTP_USER=resend
SMTP_PASS=<api key>
MAIL_FROM="Night Ops Scheduler <no-reply@your-domain.com>"
```

Use a sender domain verified with your provider (SPF and DKIM), or messages will land in spam.

## 4. Hosting options

### A. Docker (any container host)

```bash
docker build -t night-ops-scheduler .
docker run -p 8080:8080 \
  -e DATABASE_URL="postgresql://…" \
  -e APP_URL="https://app.example.com" \
  -e SMTP_HOST=… -e SMTP_USER=… -e SMTP_PASS=… -e MAIL_FROM=… \
  night-ops-scheduler
```

Put the container behind HTTPS (your platform's load balancer, or Caddy/nginx). The image has a health check on `/api/health`.

### B. Render (Blueprint)

1. Push the repository to GitHub.
2. In Render, choose **New → Blueprint** and select the repo. [`render.yaml`](render.yaml) creates a PostgreSQL database and a Docker web service, with `DATABASE_URL` wired in.
3. Set `APP_URL` to the service URL (e.g. `https://night-ops-scheduler.onrender.com`) or your custom domain, plus the SMTP variables.
4. Deploy. Migrations run on start. Check `https://…/api/health` → `{"ok":true,"db":"up"}`.

### C. Railway / Fly.io / other Node hosts without Docker

- **Build command:** `npm ci && npm run build && npm --prefix server ci --omit=dev`
- **Start command:** `npm --prefix server run start:prod`
- **Environment:**
  - `NODE_ENV=production`
  - `SERVE_CLIENT=true`
  - `TRUST_PROXY=1`
  - `APP_URL`, `DATABASE_URL` and the SMTP variables

### D. Split hosting (static frontend on Vercel/Netlify/Cloudflare Pages + separate API)

Only use this if you need it. Single-origin is simpler and more robust.

1. **API host** (as in C, but with `SERVE_CLIENT=false`):
   - `APP_URL=https://app.example.com` (the frontend URL)
   - `COOKIE_SAMESITE=none`, `COOKIE_SECURE=true` (both sites must use HTTPS)
2. **Frontend host:**
   - Build with `npm ci && npm run build`, with `VITE_API_URL=https://api.example.com`.
   - Publish `dist/`.
   - Add an SPA rewrite: all paths → `/index.html`.
3. **Tip:** host the API on a subdomain of the frontend's site (`api.example.com` for `app.example.com`). Browsers that block third-party cookies then still treat the session cookie as same-site.

Add security headers (CSP, HSTS) on the static host too. In single-origin mode the API already sends them.

## 5. Security checklist

- **HTTPS everywhere.** Session cookies are `Secure` in production; `HttpOnly` and `SameSite=Lax` by default.
- **Passwords** are hashed with scrypt; sessions and reset tokens are stored only as SHA-256 hashes.
- **Brute-force and CSRF:**
  - Login, registration and reset are rate-limited per IP. Set `TRUST_PROXY` correctly so the real client IP is used.
  - State-changing requests require the `X-Requested-With: NightOps` header and an allowed `Origin` (CSRF protection).
- **Errors:** unexpected errors are logged on the server, and clients only get a generic message.
- **Secrets:** none are in the repository. `.env` files are git-ignored, and only `.env.example` templates are committed.
- **Known advisory:** `npm audit` reports a high-severity advisory in `deepmerge-ts`. It comes in through the Prisma 6 CLI's config loader, which runs only during `prisma migrate` and `generate`. That loader never handles network input, and fixing it requires the breaking Prisma 7 migration. Re-check it with `npm --prefix server audit --omit=dev` when upgrading.

## 6. After deploying, verify

1. `GET /api/health` returns `{"ok":true,"db":"up"}`.
2. Open the site, register a manager, and finish onboarding (create a project).
3. In a private window, open the invitation link, register a developer and join.
4. Assign a task as the manager. The developer should see it within about 30 seconds or on refresh, and can change its status.
5. Request a password reset and confirm the email arrives (only when SMTP is configured).
6. Reload the page: you stay signed in. Log out: protected pages send you to login.
