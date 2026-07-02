# BrightCampus

**Brighter Schools. Smarter Management.**

BrightCampus empowers schools with intelligent, secure, and easy-to-use technology that simplifies administration, enhances teaching, and improves learner success.

## Production readiness checklist

Before onboarding a real school:

- [ ] Set `NODE_ENV=production`
- [ ] Set `NEXTAUTH_SECRET` (32+ random characters)
- [ ] Configure Neon PostgreSQL (`DATABASE_URL` + `DIRECT_URL`)
- [ ] Configure Resend (`RESEND_API_KEY`, `EMAIL_FROM`) for invites and password reset
- [ ] Configure PayFast (`PAYFAST_*` vars, `PAYFAST_SANDBOX=false`)
- [ ] Do **not** set `ENABLE_DEV_ROUTES` in production
- [ ] Run `npx prisma migrate deploy` (or `db push` for first deploy)
- [ ] Remove or rotate any demo seed credentials

## Local development

```bash
cp env.example .env.local
# Fill in DATABASE_URL, DIRECT_URL, NEXTAUTH_SECRET

npm install
npx prisma db push
npm run dev
```

### Demo data (development only)

```bash
# Start dev server, then:
curl "http://localhost:3000/api/seed?secret=brightcampus-seed-2026"
```

Learner login: ID `0801015001085` / `password123` (dev seed only).

### Provider bootstrap (development only)

```bash
curl "http://localhost:3000/api/setup?secret=brightcampus-setup-2026"
# provider@brightcampus.com / provider123
```

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXTAUTH_SECRET` | Production | Session signing secret (min 32 chars) |
| `NEXTAUTH_URL` | Yes | App URL, e.g. `https://app.brightcampus.co.za` |
| `DATABASE_URL` | Yes | Pooled PostgreSQL connection (Neon) |
| `DIRECT_URL` | Yes | Direct PostgreSQL URL for Prisma CLI |
| `RESEND_API_KEY` | Production | Email delivery |
| `EMAIL_FROM` | Production | Sender address |
| `PAYFAST_MERCHANT_ID` | Production | PayFast merchant ID |
| `PAYFAST_MERCHANT_KEY` | Production | PayFast merchant key |
| `PAYFAST_PASSPHRASE` | Production | PayFast passphrase |
| `PAYFAST_SANDBOX` | No | `true` for sandbox (default) |
| `ENABLE_DEV_ROUTES` | No | Never set in production; enables setup/seed routes |
| `ALLOW_PAYMENT_SIMULATION` | No | Set `false` to disable even in dev |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
| `npm test` | Smoke tests (SA ID, password policy, env) |

## School onboarding flow

Before onboarding, sign the agreement pack in [`docs/agreements/`](docs/agreements/README.md)
(service agreement, POPIA data processing agreement, SLA, order form, parent consent notices).

1. **Provider** creates school via Provider Dashboard (`/dashboard/provider`)
2. **Principal** signs in and configures classes, subjects, users
3. **School owner** invites staff via `/dashboard/school-owner/invites`
4. **Principal** adds learners (SA ID validated) and links parents
5. **PayFast** handles subscription and parent fee payments

## Privacy (POPIA)

Privacy policy: `/privacy`. Staff must accept on invite. Schools are responsible parties for learner data.

## Architecture

- **Next.js 16** App Router, **React 19**, **MUI 7**
- **NextAuth** credentials (email or SA ID number)
- **Prisma 7** + PostgreSQL (Neon serverless or local pg)
- **PayFast** for payments
- **Resend** for transactional email

## Roles

`PROVIDER` → `SCHOOL_OWNER` → `PRINCIPAL` / `SCHOOL_ADMIN` / `HOD` / `TEACHER` → `LEARNER` / `PARENT`

Each school is isolated by `schoolId` on all API routes.
