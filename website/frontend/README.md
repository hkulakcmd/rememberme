# RememberMe — Frontend

Next.js 15 (App Router, JavaScript) + Tailwind CSS. The UI talks to the Django
API through same-origin rewrites at `/api/v1/*`; there is no CORS and the refresh
cookie stays first-party.

Architecture and API contract:
[`../docs/architecture.md`](../docs/architecture.md),
[`../docs/api.md`](../docs/api.md).

## Requirements

- Node.js >= 18.18 (the project is pinned to Next.js 15; Next.js 16 needs Node 20.9+)
- Running backend at `http://localhost:8000` (see `../backend/README.md`)
- Chromium for Playwright/Lighthouse: `npx playwright install chromium`

## Local setup

```bash
cd website/frontend
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

### Environment variables

| Variable | Scope | Purpose |
|---|---|---|
| `BACKEND_URL` | server | Django origin used by Next.js rewrites |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | browser | shows the Google button (Google Identity Services) |
| `NEXT_PUBLIC_FACEBOOK_APP_ID` | browser | shows the Facebook button (Facebook JS SDK) |

OAuth buttons are hidden when the matching variable is empty. The backend also
needs its provider secrets (see `../backend/.env.example`).

## Scripts

```bash
npm run dev              # development server
npm run lint             # ESLint (next/core-web-vitals)
npm run build            # production build
npm start                # production server
npm test                 # Vitest unit tests for dates and form logic
npm run test:watch       # Vitest in watch mode
npm run test:e2e         # Playwright mobile, phase 4 and PWA manifest flows
npm run test:e2e:headed  # same, with a visible browser
npm run test:pwa         # PWA service worker/installability (production build)
npm run audit:lighthouse # mobile Lighthouse gate (Performance + Accessibility >= 90)
```

## Structure

```
app/
├── (auth)/                 # login, register, password reset (public)
├── (app)/                  # authenticated shell: dashboard, birthdays, settings
├── layout.js               # fonts, providers, metadata
└── globals.css             # Tailwind layers + global tokens
app/
├── manifest.js             # PWA manifest route (/manifest.webmanifest)
├── sw.js                   # Serwist service worker + push handlers
components/
├── auth/                   # auth forms + social sign-in
├── birthdays/              # list, toolbar, date field, add/edit/delete dialogs
├── dashboard/              # dashboard data view, hero, stats, lists
├── layout/                 # AuthCard, AppShell, AuthGate, PageHeader
├── providers/              # AuthProvider, ToastProvider
├── pwa/                    # install card, push settings
├── settings/               # profile, notifications, security, delete account
└── ui/                     # Button, Input, Select, Dialog, Card, Alert...
lib/
├── api.js                  # the only place that calls fetch (data + meta envelope)
├── auth.js                 # display helpers, safe ?next= handling, timezone
├── birthdayForm.js         # form model, validation, duplicate detection
├── birthdays.js            # birthday API module
├── dashboard.js            # dashboard API module
├── dates.js                # month/day/year math, leap day, Polish labels
├── errors.js               # Polish error mapping
├── notifications.js        # notification preference API module
├── profile.js              # profile, logout-all, delete-account API module
├── push.js                 # Web Push subscription helpers
├── timezones.js            # IANA timezone list
└── validation.js           # client-side auth validation
e2e/                        # Playwright mobile, phase 4 and PWA flows
public/icons/               # 192/512/maskable/apple-touch icons
scripts/lighthouse.mjs      # mobile Lighthouse audit
```

## Auth model

- The access token lives in memory only (never `localStorage`).
- The refresh token is an `HttpOnly` cookie with `Path=/api/v1/auth`, so route
  protection is client-side: `AuthProvider` bootstraps with
  `POST /api/v1/auth/refresh` and `GET /api/v1/me`, then `AuthGate` redirects
  anonymous users to `/login?next=...`.
- `lib/api.js` refreshes once per failed request (single-flight), then replays
  the original call. A failed refresh clears the session.
- Registration returns only the user object; the client immediately exchanges
  the refresh cookie for an access token.
- State-changing calls use the `Authorization` header, so CSRF tokens are not
  required (DRF does not use session authentication).

## Mobile and responsiveness

The app is mobile-first: the sidebar appears at `lg`, mobile keeps a fixed
bottom navigation and safe-area padding. Inputs are 16 px on small screens
(prevents iOS focus zoom), interactive controls are at least 44×44 px, and
dialogs are bottom sheets with sticky actions. The date field is day + month +
optional year, so people with an unknown birth year still work.

Verified with real Chromium viewports (not Firefox window resizing):

- 320×568, 360×800, 390×844, 430×932, 768×1024, 1440×900,
- landscape 844×390,
- 200% text size at 768 px,
- no horizontal overflow, no touch target below 44 px, inputs >= 16 px.

The Playwright suite creates throwaway accounts through the API, deletes them
afterwards, and runs with one worker on purpose: the backend limits auth
requests to 10/min/IP and refresh to 30/min/IP, so parallel full-page reloads
would hit `429`.

Coverage: 24 Vitest unit tests (dates, leap day, timezone, form validation,
duplicates, payload mapping) and 10 Playwright tests (CRUD, search, sort,
pagination, duplicate warning, dashboard, profile/timezone/notifications,
logout-all, account deletion, 320–1440 px reflow, 200% text, landscape). The PWA
service-worker/installability test runs separately against `npm start` with
`npm run test:pwa`.


## PWA and push notifications

- `app/manifest.js` serves a standalone Polish manifest with 192/512/maskable
  icons and shortcuts to “Dodaj urodziny” and the birthday list.
- `app/sw.js` is bundled by Serwist. It precaches the app shell, keeps `/api/*`
  network-only, shows Polish notifications for known backend payloads, focuses
  the existing window on click and re-subscribes on `pushsubscriptionchange`.
- Settings includes an install card (Chrome/Edge prompt or iOS “Add to Home
  Screen” instructions) and a push card: enable/disable on the device, send a
  test notification, permission/install diagnostics.
- Logout and logout-all remove the backend subscription for this browser before
  ending the session.
- Serwist is disabled in development (`next dev`) so HMR is not cached. Test PWA
  behavior against a production build:

```bash
npm run build
npm start
npm run test:pwa
```

Push delivery additionally requires VAPID keys in the backend `.env`
(`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`); the frontend shows a clear message
when they are missing. In this development environment those keys are still
empty, so the final delivery check (physical Android and installed iOS 16.4+
PWA) remains pending. The UI handles missing keys, denied permission and iOS
install requirements explicitly.

## Lighthouse

Run against a production build, not the dev server:

```bash
npm run build
npm start
npm run audit:lighthouse -- http://localhost:3000/login
```

For an authenticated page, pass the refresh cookie:

```bash
LIGHTHOUSE_COOKIE="refresh=<token>" \
  npm run audit:lighthouse -- http://localhost:3000/dashboard
```

Current results (mobile, 360×640, throttled): login Performance 95,
dashboard 91, birthdays 92, settings 91–92; Accessibility 100 on all audited
pages, Best Practices 100 for the authenticated app. The script exits non-zero
if Performance or Accessibility drops below 90.

## Current stage

Phases 3, 3.1, 4 and 5 are complete: auth, responsive shell, birthday CRUD with
search/sort/pagination, dashboard, profile/timezone, notification preferences,
logout-all, account deletion, PWA install shell and Web Push subscriptions.
Remaining before production: real VAPID keys, physical Android/iOS push test,
and the phase 6 review/security pass.
