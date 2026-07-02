# BrightCampus Mobile App — Product & Technical Plan

**Version 2026-07 (draft for decision)**

This plan covers how to take BrightCampus mobile, grounded in the current codebase:
Next.js 16 App Router + React 19 + MUI 7, NextAuth v4 credentials (cookie sessions), Prisma 7 +
PostgreSQL (Neon), PayFast payments, Resend email, and an existing PWA layer
(`public/manifest.json`, `public/sw.js`, `public/offline.html`, `app/components/InstallPWA.tsx`).

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

## 2. Options considered

### Option A — Harden the existing PWA + publish to Play Store via TWA

Ship the current responsive web app as an installable app. Improve `sw.js`, then wrap with a
Trusted Web Activity (Bubblewrap) for a real Google Play listing. Add **Web Push** notifications.

- **Reuse:** ~100% of existing UI and API. No new auth work (cookies work as-is).
- **Effort:** small — service worker + web push + TWA packaging + store assets.
- **Limits:** iOS has no TWA equivalent (App Store requires a real binary); Web Push on iOS works
  only for home-screen-installed PWAs (iOS 16.4+) and adoption of "Add to Home Screen" is poor;
  no native feel (gestures, haptics); MUI web UI on low-end Android devices can feel heavy.

### Option B — Capacitor wrapper

Wrap the deployed web app in a Capacitor shell to get App Store + Play Store presence and native
push (FCM/APNs) while reusing the web UI.

- **Reuse:** ~95% of UI. Cookie auth keeps working inside the shell's webview.
- **Effort:** moderate — native shells, push plugin + device-token API, store submissions.
- **Limits:** still web UI performance; Apple has historically rejected thin webview wrappers
  (mitigate with native push, splash, deep links, offline screen); two native projects to maintain
  without gaining a native UI.

### Option C — React Native (Expo) native app

A dedicated mobile app for parents/learners/teachers consuming the existing API, with the web app
remaining the full-featured surface for admin roles.

- **Reuse:** 100% of backend business logic and data model; 0% of UI.
- **Effort:** large — new app codebase, **token-based auth added to the backend** (NextAuth v4
  cookie sessions don't suit native clients), a stable mobile API surface, push, offline cache,
  two store pipelines.
- **Wins:** best UX and performance, first-class push, offline, biometrics; the product feel that
  differentiates you when selling to schools.

### Recommendation: phased — A now, C next

1. **Phase 1 (now, low risk):** Harden the PWA, add Web Push, ship to Google Play via TWA.
   Parents on Android (the large majority in SA schools) get an installable app with lock-screen
   notifications, with almost no new surface area to maintain. Everything built here (push
   infrastructure, device tokens, notification fan-out) is reused by the native app later.
2. **Phase 2 (the real mobile product):** Build the **Expo React Native** app for Parent + Learner
   first, then Teacher. This is when iOS coverage arrives.
3. Skip Option B: it costs App Store/Play Store maintenance without delivering native UX, and its
   main benefit (native push) is achieved in Phase 1 on Android and Phase 2 on iOS.

---

## 3. Phase 1 — PWA hardening + Android store presence

### 3.1 Push notifications (the core deliverable)

Backend (works for web push now, FCM later):

- New Prisma model `DeviceToken` (`id`, `userId`, `platform: WEB|ANDROID|IOS`, `token/endpoint`,
  `keys`, `createdAt`, `lastSeenAt`) with unique constraint per token.
- `POST /api/notifications/subscribe` and `DELETE .../subscribe` — store/remove the browser's
  push subscription for the signed-in user.
- A `sendPush(userIds, payload)` helper (using `web-push` with VAPID keys) called from the same
  places that create in-app notifications today (announcements, absence alerts, fee reminders,
  new messages), so in-app and push stay in sync.
- Env vars: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.

Frontend:

- `push` event handler + `notificationclick` deep-linking in `public/sw.js`.
- Opt-in UI (per-role settings page section): request permission, register subscription.
- Notification preference toggles (announcements / attendance / fees / messages).

### 3.2 Service worker and offline improvements

- Version the cache per deploy (build ID in `CACHE_NAME`) instead of the manual `-v2` suffix.
- Never cache authenticated API responses that could leak across accounts on shared devices
  (current `sw.js` falls back to cached `/api/` responses — restrict this to safe GETs like the
  timetable, or scope cache keys by user).
- Add background sync for queued actions (e.g. teacher attendance capture offline → sync).

### 3.3 Play Store via Trusted Web Activity

- Generate the TWA project with Bubblewrap against `https://app.brightcampus.co.za`.
- Host `/.well-known/assetlinks.json` for domain verification.
- Store assets: icon set, feature graphic, screenshots (phone + 7" tablet), listing copy.
- **Data safety form:** declare collection of personal info (names, IDs, academic records) —
  answers can be lifted from the POPIA privacy policy (`/privacy`) and the DPA in
  `docs/agreements/`.
- **Children's data:** learners are under 18. Do **not** target the "Designed for Families"
  program; list as an education utility for parents/teachers with learner accounts permitted, and
  ensure the privacy policy and consent flow (already required by the onboarding agreement pack)
  are linked in the listing.
- One-off cost: Google Play developer account ($25).

### 3.4 Phase 1 exit criteria

- Parent receives a push notification on a locked Android phone when the school posts an
  announcement or marks their child absent.
- App installable from Google Play, opens full-screen, passes Play review.
- Offline: previously visited dashboard renders read-only; graceful offline page elsewhere.

---

## 4. Phase 2 — Native app (Expo React Native)

### 4.1 Scope (MVP by role)

**Parent (MVP release):** sign-in, child switcher, announcements feed, attendance + absence
alerts, homework, marks/report progress, messages with staff, fee statement + "Pay now".

**Learner (MVP release):** sign-in with SA ID, timetable, homework, quizzes, marks, announcements,
study advisor.

**Teacher (fast follow):** today's classes, attendance capture (offline-capable — this is the
feature teachers will love), homework posting, messages, marks capture.

**Out of scope for native:** provider portal, school-owner/principal admin, billing configuration,
report design — these remain on the responsive web app, reachable via in-app browser links.

### 4.2 Backend work needed (the critical path)

The current API is internal and cookie-authenticated; a native client needs:

1. **Token auth endpoints** under `/api/mobile/v1/`:
   - `POST /auth/login` — reuse the exact NextAuth `authorize()` credential logic (email or SA ID
     + password), return short-lived JWT access token (15 min) + rotating refresh token stored
     hashed in a new `RefreshToken` table (revocable per device).
   - `POST /auth/refresh`, `POST /auth/logout` (revokes the device's refresh token).
   - A `requireMobileUser(request)` helper mirroring the existing session helper, resolving the
     bearer token to the same `{ userId, role, schoolId }` shape so **all existing per-route
     authorization and tenant isolation logic is reused unchanged**.
2. **Stable mobile API surface** (`/api/mobile/v1/...`): thin wrappers over existing route logic
   with explicit response contracts, pagination, and a documented error envelope. Treat it as a
   public API: versioned, no breaking changes within v1. Extract shared logic from route handlers
   into `lib/` functions where the web route and mobile route can both call them.
3. **Push for native:** extend Phase 1's `DeviceToken` model with FCM/APNs tokens (via Expo Push
   Service, which abstracts both) and route `sendPush` through Expo Push for native tokens.
4. **Rate limiting** on the auth endpoints; device metadata on refresh tokens for a "signed-in
   devices" screen.

### 4.3 App architecture

- **Stack:** Expo (managed workflow) + TypeScript, Expo Router, TanStack Query for server state,
  SecureStore for tokens, Expo Notifications, EAS Build + EAS Submit for CI store delivery.
- **Repo layout:** monorepo — `apps/mobile` (Expo) alongside the existing Next.js app, with
  `packages/shared` for API types (derive from zod schemas used by the mobile API so client and
  server share contracts). Alternative: separate repo with a published types package — monorepo
  preferred to keep contracts honest.
- **Design system:** mirror BrightCampus branding (`lib/branding.ts`) — amber `#f59e0b` theme,
  same logo assets; native components (no MUI).
- **Offline:** TanStack Query persistence for read caches; write queue only for teacher
  attendance in the fast-follow release.
- **Payments (PayFast):** open the PayFast checkout in an in-app browser
  (`expo-web-browser`) and confirm via the existing ITN webhook + a status poll. School fees are
  services consumed outside the app, so both Apple and Google policies permit external payment
  processing (not In-App Purchase) — same category as tuition. Verify against current store
  policy at submission time.
- **Multi-school users:** honour the existing multi-role/multi-school switcher semantics — the
  token carries the active role context; add a context-switch endpoint.

### 4.4 Store and compliance checklist (Phase 2)

- Apple Developer Program ($99/yr) + Play developer account (from Phase 1).
- App Privacy (Apple) and Data Safety (Google) declarations sourced from the POPIA policy.
- Account deletion path (Apple requirement): in-app request wired to the existing data
  export/deletion flow.
- Learner accounts: age gate not required (accounts are school-provisioned, parental consent is
  collected via the onboarding agreement pack — reference it in review notes).
- POPIA: update the DPA sub-operator schedule (`docs/agreements/`) to add Expo/Google/Apple push
  services before go-live.

### 4.5 Suggested build order (Phase 2)

1. Backend: token auth + `requireMobileUser` + 3 pilot endpoints (profile, announcements,
   notifications) with tests.
2. App shell: auth flow, secure token storage, role-based tab navigation, branding.
3. Parent read surfaces: announcements, attendance, homework, marks.
4. Push end-to-end (Expo Push → device) reusing Phase 1 fan-out.
5. Messages + fee statement + PayFast checkout.
6. Learner surfaces (largely shared components with parent read views).
7. Beta: TestFlight + Play internal testing with your first school's parents.
8. Teacher release: attendance capture with offline queue, homework, marks.

---

## 5. Cross-cutting decisions to confirm

| Decision | Recommendation |
|----------|----------------|
| Who is the app for at launch? | Parents + learners; teachers fast-follow |
| iOS timing | Phase 2 only (TWA is Android-only) |
| Auth model for native | JWT access + rotating refresh tokens, reusing existing credential logic |
| Push provider | Web Push (VAPID) in Phase 1; Expo Push (FCM/APNs) in Phase 2 |
| Repo strategy | Monorepo: `apps/mobile` + `packages/shared` |
| Payments | PayFast via in-app browser; no IAP |
| Provider/admin on mobile | No — responsive web remains their surface |

## 6. Risks

- **API coupling:** exposing internal routes to a shipped binary freezes contracts; mitigated by
  the versioned `/api/mobile/v1` layer — never point the app at internal routes.
- **Tenant isolation regressions:** the mobile auth helper must resolve to the same
  `{ userId, role, schoolId }` context used everywhere; add integration tests that assert
  cross-school access fails with bearer tokens exactly as with cookies.
- **Store review friction:** first submissions (especially Apple) often bounce; budget review
  cycles into the beta timeline and prepare reviewer test accounts (a demo school tenant).
- **Low-end devices / data costs:** keep payloads small, images compressed, and the app under
  ~30 MB — a real adoption factor in the target market.
- **Children's data scrutiny:** keep the consent and POPIA documentation (already in
  `docs/agreements/`) linked from both store listings.

## 7. Definition of done per phase

- **Phase 1:** Play Store listing live; push opt-in rate and delivery measurable; no cached
  cross-user API data; offline fallback verified on Android Chrome + installed TWA.
- **Phase 2 (parent/learner MVP):** app in both stores; a pilot school's parents receiving
  absence alerts and paying a fee through the app; crash-free sessions > 99.5%; API v1 contract
  documented and covered by tests.
