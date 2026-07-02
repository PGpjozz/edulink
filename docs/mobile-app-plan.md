# BrightCampus Mobile App — Product & Technical Plan

**Version 2026-07.2 — Decision: one native app for Android AND iOS (Expo React Native)**

This plan covers taking BrightCampus mobile on **both Google Play and the Apple App Store from
launch**, grounded in the current codebase: Next.js 16 App Router + React 19 + MUI 7, NextAuth v4
credentials (cookie sessions), Prisma 7 + PostgreSQL (Neon), PayFast payments, Resend email, and an
existing PWA layer (`public/manifest.json`, `public/sw.js`, `public/offline.html`,
`app/components/InstallPWA.tsx`).

---

## 1. Why mobile, and for whom

BrightCampus's daily-active users are overwhelmingly mobile-first in the South African school
context:

| Audience | Mobile needs | Priority |
|----------|-------------|----------|
| **Parents** | Absence alerts, announcements, homework, marks, messages, fee payment | **P0 — the app exists for them** |
| **Learners** | Timetable, homework, quizzes, marks, study advisor | **P0** |
| **Teachers** | Attendance capture in class, homework posting, quick messages | **P1** |
| Principals / HODs / admins | Dashboards, approvals | P2 — responsive web is adequate |
| Provider (you) | Tenant management, billing | Not mobile — stays web |

The single highest-value mobile capability the platform lacks today is **push notifications**
(current notifications are in-app only via `app/api/notifications`). Absence alerts, fee reminders
and announcements landing on a parent's lock screen is the core of the mobile value proposition.

## 2. Approach decision

**Requirement: both Android and iOS at launch.** That rules out the Android-only shortcuts and
makes one cross-platform native codebase the clear choice:

| Option | Android | iOS | Verdict |
|--------|---------|-----|---------|
| PWA + Trusted Web Activity | Play Store ✓ | ✗ no App Store path; Web Push only if user manually installs to home screen | Rejected as store strategy (Android-only) |
| Capacitor webview wrapper | ✓ | ✓ but Apple frequently rejects thin webview wrappers; still web UI performance | Rejected — store risk without native UX |
| **Expo React Native** | ✓ | ✓ | **Chosen** — one TypeScript codebase, native UI/push on both platforms, EAS builds both stores from CI |

**Chosen architecture: a dedicated Expo (React Native) app** for parents, learners and teachers,
consuming the existing backend through a new versioned mobile API. The web app remains the
full-featured surface for principals, admins and the provider portal.

- **Reuse:** 100% of backend business logic, data model, and tenant isolation; 0% of web UI.
- **New work:** token-based auth (NextAuth v4 cookie sessions don't suit native clients), a stable
  `/api/mobile/v1` surface, push notification infrastructure, the app itself, and two store
  pipelines.
- **PWA note:** the existing PWA remains a free bonus for desktop/web users, and the push
  fan-out built in Workstream 1 can later feed Web Push too — but it is no longer the store
  strategy.

---

## 3. Scope (MVP by role)

**Parent (launch):** sign-in, child switcher, announcements feed, attendance + absence alerts,
homework, marks/report progress, messages with staff, fee statement + "Pay now" (PayFast).

**Learner (launch):** sign-in with SA ID, timetable, homework, quizzes, marks, announcements,
study advisor.

**Teacher (fast follow):** today's classes, attendance capture (offline-capable — the feature
teachers will love), homework posting, messages, marks capture.

**Out of scope for native:** provider portal, school-owner/principal admin, billing configuration,
report design — these remain on the responsive web app.

---

## 4. Workstream 1 — Backend foundations (the critical path)

Everything here lives in the existing Next.js repo and ships before/alongside the app UI.

### 4.1 Token auth for native clients

- `POST /api/mobile/v1/auth/login` — reuse the exact NextAuth `authorize()` credential logic
  (email or SA ID + password); return a short-lived JWT access token (~15 min) plus a rotating
  refresh token stored **hashed** in a new `RefreshToken` table (revocable per device, with device
  metadata for a "signed-in devices" screen).
- `POST /api/mobile/v1/auth/refresh` and `POST /api/mobile/v1/auth/logout` (revokes that device's
  refresh token).
- A `requireMobileUser(request)` helper mirroring the existing session helper, resolving the
  bearer token to the same `{ userId, role, schoolId }` shape so **all existing per-route
  authorization and tenant isolation logic is reused unchanged**.
- Rate limiting on auth endpoints.
- Multi-school/multi-role users: the token carries the active role context; add a context-switch
  endpoint honouring the existing switcher semantics.

### 4.2 Versioned mobile API surface

- `/api/mobile/v1/...`: thin wrappers over existing route logic with explicit response contracts
  (zod schemas), pagination, and a documented error envelope.
- Treat it as a public API: versioned, no breaking changes within v1 — a shipped binary freezes
  contracts. The app must never call internal web routes.
- Extract shared logic from existing route handlers into `lib/` functions that both web and mobile
  routes call.

### 4.3 Push notifications

- New Prisma model `DeviceToken` (`id`, `userId`, `platform: ANDROID | IOS | WEB`, `token`,
  `createdAt`, `lastSeenAt`; unique per token).
- `POST /api/mobile/v1/notifications/register-device` / `DELETE ...` — store/remove the device's
  push token for the signed-in user.
- Use **Expo Push Service**, which abstracts FCM (Android) and APNs (iOS) behind one API — no
  separate Firebase/Apple push integrations to maintain.
- A `sendPush(userIds, payload)` helper called from the same places that create in-app
  notifications today (announcements, absence alerts, fee reminders, new messages), so in-app and
  push stay in sync. Include deep-link data (`route`) in the payload.
- Notification preference toggles per category (announcements / attendance / fees / messages),
  respected by the fan-out.

## 5. Workstream 2 — The app

### 5.1 Architecture

- **Stack:** Expo (managed workflow) + TypeScript, Expo Router, TanStack Query for server state,
  SecureStore for tokens, Expo Notifications, **EAS Build + EAS Submit** producing both the
  Play Store AAB and the App Store IPA from the same CI pipeline.
- **Repo layout:** monorepo — `apps/mobile` (Expo) alongside the existing Next.js app, with
  `packages/shared` for API types derived from the zod schemas in the mobile API, so client and
  server share contracts.
- **Design system:** mirror BrightCampus branding (`lib/branding.ts`) — amber `#f59e0b` theme,
  same logo assets; native components (no MUI).
- **Offline:** TanStack Query cache persistence for read surfaces; a write queue only for teacher
  attendance capture (fast-follow release).
- **Biometrics:** Face ID / fingerprint unlock after first sign-in (SecureStore + LocalAuth) —
  cheap to add, big perceived quality win.

### 5.2 Payments (PayFast) on both stores

- Open PayFast checkout in an in-app browser (`expo-web-browser`); confirm via the existing ITN
  webhook plus a status poll.
- School fees are physical-world services, so both Apple and Google policies permit external
  payment processing (same category as tuition) — **not** In-App Purchase. Verify against current
  store policy at submission time and note it in App Review notes.

### 5.3 Build order

1. Backend: token auth + `requireMobileUser` + 3 pilot endpoints (profile, announcements,
   notifications) with integration tests, including cross-tenant denial tests with bearer tokens.
2. App shell: auth flow, secure token storage, role-based tab navigation, branding.
3. Parent read surfaces: announcements, attendance, homework, marks.
4. Push end-to-end on **both platforms** (Expo Push → physical Android + iOS devices).
5. Messages + fee statement + PayFast checkout.
6. Learner surfaces (largely shared components with parent read views).
7. Beta: **TestFlight (iOS) + Play internal testing (Android)** with your first school's parents.
8. Store submissions (see §6), then public launch.
9. Teacher release: attendance capture with offline queue, homework, marks.

## 6. Store setup and compliance (both platforms)

### Accounts and signing

- **Google Play Console** developer account — $25 once.
- **Apple Developer Program** — $99/year. Enrol early: enrolment and the first review can be slow.
- EAS manages signing (Android keystore, Apple certificates/profiles) — no manual cert wrangling.

### Listings

- Store assets per platform: icons, feature graphic (Play), screenshots for phone + tablet (Play)
  and required iPhone/iPad sizes (App Store); listing copy from `lib/branding.ts` messaging.
- **Google Data Safety** and **Apple App Privacy** declarations — answers sourced from the POPIA
  privacy policy (`/privacy`) and the DPA in `docs/agreements/`.
- Privacy policy URL required by both stores: `https://<domain>/privacy` (already live).

### Apple-specific requirements

- **Account deletion**: Apple requires in-app account deletion — wire to the existing data
  export/deletion flow with a school-mediated confirmation (accounts are school-provisioned;
  document this for the reviewer).
- **Reviewer test account:** maintain a demo school tenant with parent/learner/teacher accounts
  and seeded data for App Review; include credentials and flow notes in the review notes.
- Sign in only via school-issued credentials (no third-party social login), so "Sign in with
  Apple" is **not** required.

### Children's data (both stores)

- Learners are under 18. Do **not** target Google's "Designed for Families" or list in Apple's
  Kids Category; list as an Education utility used by schools, parents and their learners.
- Parental consent is collected by the school via the onboarding agreement pack
  (`docs/agreements/06-parent-learner-consent-notice.md`) — reference this in review notes.
- POPIA: update the DPA sub-operator schedule to add Expo Push / Google / Apple notification
  services before go-live.

## 7. Cross-cutting decisions (confirmed / recommended)

| Decision | Status |
|----------|--------|
| Platforms | **Android + iOS from launch (confirmed)** |
| Framework | Expo React Native — one codebase, both stores |
| Launch audience | Parents + learners; teachers fast-follow |
| Auth model | JWT access + rotating refresh tokens, reusing existing credential logic |
| Push | Expo Push Service (FCM + APNs behind one API) |
| Repo strategy | Monorepo: `apps/mobile` + `packages/shared` |
| Payments | PayFast via in-app browser; no IAP |
| Provider/admin on mobile | No — responsive web remains their surface |
| PWA | Kept as a web bonus; not the store strategy |

## 8. Risks

- **API coupling:** a shipped binary freezes contracts; mitigated by the versioned
  `/api/mobile/v1` layer and shared zod schemas — never point the app at internal routes.
- **Tenant isolation regressions:** the mobile auth helper must resolve to the same
  `{ userId, role, schoolId }` context used everywhere; integration tests must assert cross-school
  access fails with bearer tokens exactly as with cookies.
- **Apple review friction:** first submissions often bounce (webview-heavy screens, missing
  account deletion, unclear child-data handling). Budget at least two review cycles; prepare the
  demo tenant and review notes up front.
- **iOS device testing:** APNs push and PayFast checkout must be verified on physical iPhones —
  simulators don't receive push. Ensure access to at least one physical device per platform.
- **Low-end devices / data costs (Android side of the market):** keep payloads small, images
  compressed, app size modest — a real adoption factor in the target market.
- **Children's data scrutiny:** keep consent and POPIA documentation (already in
  `docs/agreements/`) linked from both store listings.

## 9. Definition of done

- App live on **both** Google Play and the Apple App Store.
- A pilot school's parents receive absence alerts as push notifications on Android and iOS
  lock screens, and can pay a fee through the app via PayFast.
- Learners can view timetable, homework, quizzes and marks on both platforms.
- `/api/mobile/v1` contract documented and covered by integration tests, including cross-tenant
  denial tests.
- Crash-free sessions > 99.5% during beta; store Data Safety / App Privacy declarations filed and
  consistent with the POPIA policy.
