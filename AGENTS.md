# EduLink

Multi-tenant school-management SaaS. A single Next.js 16 (App Router, React 19,
Turbopack) application serves both the frontend (MUI) and the backend (API route
handlers under `app/api/**`). Data lives in one PostgreSQL database accessed via
Prisma 7 using the **Neon serverless driver** (`lib/prisma.ts` -> `PrismaNeon`).
Auth is NextAuth v4 (Credentials provider, JWT) in `lib/auth.ts`.

Standard commands live in `package.json` (`dev`, `build`, `start`, `lint`) and
`prisma.config.ts` (`prisma db push`, `prisma db seed`).

## Cursor Cloud specific instructions

The app's Prisma client uses the **Neon serverless driver**, which reaches
Postgres over a secure WebSocket tunnel (the same way it talks to Neon Cloud in
production) — it does NOT open a plain TCP connection. For local development we
run a normal PostgreSQL server plus a small WSS->TCP bridge that stands in for
Neon's tunnel. The pieces below are already installed/seeded in this VM; you
normally just need to (re)start the services.

### Services / how to run

These are NOT started automatically on boot — start them when you begin work.

1. PostgreSQL (local, port 5432):
   - Start: `sudo pg_ctlcluster 16 main start`
   - DB `edulink`, role `edulink` / password `edulink` (superuser).
   - `DATABASE_URL` lives in `.env` (gitignored): `postgres://edulink:edulink@localhost:5432/edulink`.
2. Neon WSS proxy (must listen on **port 443**, needs root):
   - Start: `sudo NEON_WS_PROXY_TLS=1 NEON_WS_PROXY_PORT=443 $(which node) scripts/dev/neon-ws-proxy.js`
   - Bridges `wss://localhost:443` -> `localhost:5432` and auto-generates a
     self-signed cert under `~/.edulink-dev/` on first run.
3. Dev server (port 3000):
   - Start: `NODE_TLS_REJECT_UNAUTHORIZED=0 npm run dev`
   - `NODE_TLS_REJECT_UNAUTHORIZED=0` is required so Node accepts the proxy's
     self-signed cert; without it every DB query fails with
     "Received network error or non-101 status code".

Lint: `npm run lint` (clean baseline = 0 errors, ~140 pre-existing warnings).
Build: `npm run build` (runs `prisma generate` then `next build`).

### Why port 443 + TLS (do not "simplify" this)

Turbopack inlines `@neondatabase/serverless` into the server bundle, so the
driver's connection config CANNOT be changed from the app process (e.g. via
`NODE_OPTIONS` preload / `neonConfig`). We therefore rely on the driver
*defaults*: `useSecureWebSocket=true` and `wsProxy=(host)=>host+'/v2'`. With
`DATABASE_URL` host = `localhost`, the driver dials `wss://localhost/v2`
(port 443) — which is exactly where the proxy listens. This is why the proxy
needs TLS and port 443.

### Postgres auth gotcha

The Neon driver defaults to `pipelineConnect="password"` (pre-sends a cleartext
password). `pg_hba.conf` for `127.0.0.1/32` and `::1/128` is therefore set to the
`password` (cleartext) auth method instead of `scram-sha-256`. If you ever
re-init the cluster, reapply that or app DB queries will fail to authenticate.

### Database schema / seed data

Schema is managed with `prisma db push` (there is no `prisma/migrations`
directory). Note: `scripts/schema.sql` and `scripts/create-provider.*` reference
old PascalCase table names and are stale — prefer Prisma. Seed data already
exists in the VM; to (re)create it:
- `npx prisma db push` — create/sync tables.
- `npx prisma db seed` — provider account + small demo school
  (`prisma/seed.ts`, uses the `pg` adapter directly over SSL).
- `GET /api/seed?secret=edulink-seed-2026` — richer "Westview High School"
  dataset, exercised through the running app (Neon driver).

Useful logins:
- Provider (SaaS owner): `provider@edulink.com` / `provider123` (sign in at `/auth/provider-signin`).
- School roles (after `/api/seed`): `principal@westview.edu.za` / `password123`, etc.
