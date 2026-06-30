# Onboarding a real school — checklist

This is the operational checklist for taking EduLink live for a real school.
The platform's day‑to‑day features work; the items below are the
infrastructure/integration steps required for production use.

## 1. Environment / integrations

Set these (see `env.example`). The Provider dashboard shows a **Platform
readiness** panel reflecting what's configured.

| Variable | Purpose | Required for |
| --- | --- | --- |
| `DATABASE_URL` / `DIRECT_URL` | Postgres (Neon) — pooled + direct | Everything |
| `NEXTAUTH_SECRET` | Session/JWT signing | Auth (app fails fast in prod without it) |
| `NEXTAUTH_URL` | Canonical app URL | Auth callbacks, email links |
| `RESEND_API_KEY` + `EMAIL_FROM` | Transactional email (Resend) with a **verified sending domain** | Invites, password resets |
| `PAYFAST_MERCHANT_ID` / `PAYFAST_MERCHANT_KEY` / `PAYFAST_PASSPHRASE` | PayFast | School subscriptions & fee payments |
| `PAYFAST_SANDBOX` | `true` for testing, unset/`false` for live | Payments |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob for durable file uploads | Homework/resource/submission attachments in production |

> Without `BLOB_READ_WRITE_TOKEN`, uploads use a local-disk fallback that is fine
> for dev/self-hosted but **not durable on serverless** (Vercel) — set the token
> for production.

## 2. Create the school

As the **Provider** (`/auth/provider-signin`):
1. **Onboard School** tab → fill school details (incl. EMIS, district, province,
   country, type), the **principal** account, and optionally a **school owner**.
2. The principal signs in at `/auth/signin`.

## 3. Load people & structure

As the **Principal/Admin**:
1. **Users → Import CSV** — bulk import staff and learners (download the template
   first). Supports learners (admission no + grade), teachers/HODs, admins,
   parents, and non‑teaching `STAFF` (with job titles).
2. **Classes & Grades → Add Class** — create classes (e.g. 8A–12C).
3. Per class: **Learners** (enrol grade‑matched learners), **Subjects** (link
   subjects + assign a teacher), **Form teacher**.
4. **Departments** — create departments and assign HODs.

After this, teachers see their learners per class (form + subject), attendance,
gradebook, homework (with file attachments), etc.

## 4. Before go‑live (recommended)

- Verify the Resend sending domain and send a test invite.
- Switch PayFast to live and run one real low‑value transaction end‑to‑end.
- Confirm DB backups are enabled (Neon) and access is least‑privilege.
- Review data‑protection obligations (POPIA): consent, retention, who can access
  learner PII. Audit logs are recorded for sensitive actions.

## Known gaps / roadmap

- Bulk class‑enrolment is per‑class (no single “assign all by grade” yet).
- Notifications are in‑app; email/SMS delivery is limited to invites/resets.
- AI learner reports are generated from DB data (no external LLM).
- Broader automated test coverage (integration/E2E) is still being expanded.
