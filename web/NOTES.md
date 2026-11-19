# Kolo Web Frontend — Engineering & Verification Notes

This document describes the implementation, architectural decisions, API contract observations, and end-to-end verification results for the Kolo web frontend.

---

## 1. How to Run

### Prerequisites
- Node.js >= 20
- npm >= 10

### Installation
From the repository root:
```bash
cd web
npm install
```

### Environment Configuration
The application reads configuration from environment variables defined in `.env.example` or `.env.local`:

```ini
# Base API URL (used for live backend domain calls)
VITE_API_URL=http://localhost:3000/v1

# Comma-separated list of domains mocked by MSW in the browser
# Set to 'all' to mock everything, or select subsets: 'auth,wallet,groups,dev'
# Set to empty to connect entirely to a live backend
VITE_MOCK_DOMAINS=all

# Toggle mock latency simulator (e.g. 1500 for slow 3G simulation)
VITE_MOCK_DELAY_MS=0
```

### Development Server
```bash
npm run dev
```
Starts Vite on `http://localhost:5173`. Open in any modern evergreen browser (Chrome, Edge, Firefox, Safari).

### Production Build & Preview
```bash
npm run build
npm run preview
```
Builds the production bundle into `web/dist/` using `tsc -b && vite build`.

### Testing, Linting & Typechecking
```bash
# TypeScript strict check (0 errors)
npm run typecheck

# ESLint flat config check (0 errors, 0 warnings)
npm run lint

# Vitest test suite (40 unit and invariant tests)
npm run test
```

---

## 2. Mock vs Live (`VITE_MOCK_DOMAINS`)

Kolo supports per-domain mock toggling to allow progressive backend integration without all-or-nothing switching:

1. **How `VITE_MOCK_DOMAINS` Works**:
   - `src/mocks/init.ts` initializes Mock Service Worker (MSW v2) in the browser when running in development mode and `VITE_MOCK_DOMAINS` is non-empty.
   - Domains supported: `auth`, `groups`, `wallet`, `payments`, `notifications`, `dev`.
   - Setting `VITE_MOCK_DOMAINS=all` intercepts all API requests at the Service Worker level.
   - Setting `VITE_MOCK_DOMAINS=groups,wallet` leaves `auth` routing directly to a live backend (e.g. `http://localhost:3000/v1/auth`), while groups and wallet queries/mutations stay in the browser mock ledger.
   - When transitioning fully to the backend, set `VITE_MOCK_DOMAINS=` in `web/.env.local`.

2. **Zero-Sum In-Memory Ledger Engine**:
   - The mock layer (`src/mocks/engine.ts`) is not a static fixture server: it is a fully functioning double-entry accounting engine with strict invariants.
   - Every transaction asserts `sum(debits) - sum(credits) == 0`.
   - Idempotency records are tracked per `Idempotency-Key` header with original response codes, headers, and bodies replayed verbatim on duplicate calls.
   - Seed data features **Chiamaka Eze** (`demo@kolo.test` / `kolo2026`) and three active/forming groups ("Office Ajo", "Family Savings", "Weekend Thrills") populated with realistic historical transactions and round progress.

3. **Silent Token Refresh Simulation**:
   - The access token is stored strictly in memory (`src/lib/auth-token.ts`), never in `localStorage` or `sessionStorage`.
   - In MSW mode, refresh tokens are tracked in an internal mock table. When the access token expires (or when the developer clicks **"Expire access token now"** in the Dev Panel), the API client intercepts the resulting `401 TOKEN_EXPIRED`, requests `POST /auth/refresh`, updates the in-memory token, and transparently replays queued requests without dropping user state.

---

## 3. Decisions & Implementation Details

1. **Integer Kobo Representation & Money Parsing**:
   - Floating-point calculations are strictly forbidden. All monetary amounts are held and computed as exact integer kobo (`bigint` or integer `number` where bounds are safe).
   - `parseNairaToKobo(input)` parses user-entered decimal strings (e.g. `"10000.50"`) using string splitting and clean 2-digit padding, avoiding `* 100` float arithmetic bugs.
   - `formatKobo(kobo)` formats currency with the official Nigerian Naira sign (`₦`) and proper thousand separators. Negative amounts are rendered using the Unicode minus sign (`−` `\u2212`) rather than an ASCII hyphen-minus (`-`), ensuring typographic precision.

2. **Component Architecture & Separation**:
   - All components are strictly under 250 lines of code. Large views (e.g., `GroupDetail.tsx`) are split into dedicated subcomponents (`CurrentRoundPanel`, `RoundsTab`, `MembersTab`, `ActivityTab`, `InviteCard`).
   - Dialogs are powered by Radix UI primitive dialogs (`@radix-ui/react-dialog`) with full keyboard trap, backdrop blur, `Escape` key dismissal, and autofocus restoration.
   - Toasts are managed by `sonner` with custom styled dark/light mode card themes.
   - All classes strictly follow canonical Tailwind CSS utilities (e.g. `bg-bg`, `text-ink`, `border-border`, `bg-surface`, `rounded-2xl`) matching the `@theme` definitions, ensuring zero `suggestCanonicalClasses` lint diagnostics across language servers and IDE extensions.

3. **Authentication & Routing Flow**:
   - React Router v7 (`createBrowserRouter`) manages application routing.
   - Protected routes (`/app/*`) are guarded by `<ProtectedRoute>` which checks authentication state and redirects unauthenticated users to `/login?from=...`.
   - `AuthProvider` wraps the router hierarchy at the root in `main.tsx`. Redirection upon login/logout uses standard browser navigation to guarantee clean cache resets and prevent hook-context lifecycle warnings.

4. **Dev Tools & Request Logger**:
   - A floating Dev Panel toggle is accessible in the bottom corner during development.
   - Includes real-time Request Logs capturing URL, status, timing, idempotency headers, request/response bodies, and a **"Copy as curl"** generator with redacted tokens.
   - Includes Dev Settings for rapid testing: "Double-send money requests" (fires concurrent requests with the same idempotency key), "Slow network (+1.5s)", "Expire access token now", "Run due-rounds job now", and "Reset mock data".

5. **Headless QA Automation via Puppeteer-Core & Edge**:
   - Verification journeys were automated using `puppeteer-core` driving the local Microsoft Edge installation in headless mode.
   - 27 high-resolution screenshots were captured at 1440×900 (desktop) and 390×844 (mobile), verifying empty states, fund deposits, checkout redirects, group creation, member simulation, round payouts, double-entry ledger audits, withdrawal reversals, dark mode, and demo accounts.

---

## 4. Contract Gaps & API Notes

During development against `API.md`, several practical gaps were identified and handled:

1. **Refresh Token Storage in Service Worker vs HTTP-Only Cookie**:
   - In production, `POST /auth/login` sets an `HttpOnly`, `SameSite=Strict` cookie containing the refresh token.
   - In MSW (browser Service Worker), the Service Worker cannot set document cookies directly. The mock client simulates this by storing the session token in an internal mock registry and passing it during `/auth/refresh`. When switching to live mode, browser cookie handling takes over automatically without code changes.

2. **Group Member Order vs Join Order**:
   - `API.md` specifies `payoutOrder: 'join_order' | 'random' | 'custom'`. In `join_order`, the sequence is strictly determined by `joinedAt`.
   - In the mock engine, adding simulated members automatically computes positions `1..N` sequentially. When the group transitions to `active`, the engine creates rounds `1..N` matching each member's assigned position.

3. **Double-Send Concurrent Idempotency Behavior**:
   - When firing two identical requests with the same `Idempotency-Key` at the exact same millisecond:
     - The first request processes and commits to the ledger.
     - The second request either receives `200/201` with header `Idempotent-Replayed: true` (if the first has committed) or `409 CONFLICT` with code `CONCURRENT_REQUEST` (if still in flight). The Kolo frontend gracefully handles both cases and reports the duplicate protection in the Dev Request Log.

4. **Withdrawal Bank Code & Account Resolution**:
   - The API supports Nigerian commercial bank codes (e.g. `058` for GTBank, `011` for First Bank, `057` for Zenith).
   - In mock mode, bank account resolution simulates name inquiry (`Chiamaka Eze` or `Emeka Okonkwo`), and accounts ending in `0000` deterministically trigger the transfer failure and ledger reversal workflow.

---

## 5. Known Issues & Browser Considerations

1. **External GitHub Source Placeholder**:
   - As noted in `GEMINI_PROMPT.md` §15, the landing page footer displays:
     `Kolo is a learning project. It runs in test mode only.`
     along with the placeholder link `Source code` pointing to `#`.

2. **Vite Dynamic Import Chunk Size Notice**:
   - The production build packages the vendor bundle (React, Radix, Lucide, TanStack Query) into a single optimized chunk (`~1 MB` raw / `318 kB` gzipped). This is standard for SPA dashboards, but in high-traffic production environments, manual code-splitting via `rollupOptions.output.manualChunks` can be introduced to further slice route chunks.

---

## 6. Verification Results

### A. TypeScript Typecheck (`npm run typecheck`)
Command: `tsc -b --noEmit`
```
> kolo-web@0.1.0 typecheck
> tsc -b --noEmit
```
**Result**: Exit code `0` (Zero errors).

---

### B. ESLint (`npm run lint`)
Command: `eslint .`
```
> kolo-web@0.1.0 lint
> eslint .
```
**Result**: Exit code `0` (Zero errors, zero warnings).

---

### C. Vitest Test Suite (`npm run test`)
Command: `vitest run`
```
> kolo-web@0.1.0 test
> vitest run

 RUN  v3.2.7 C:/Users/Joshking/Desktop/kolo/web

 ✓ src/lib/money.test.ts (6 tests) 125ms
 ✓ src/lib/dates.test.ts (13 tests) 73ms
 ✓ src/mocks/engine.test.ts (8 tests) 937ms
 ✓ src/lib/phone.test.ts (4 tests) 109ms
 ✓ src/lib/idempotency.test.ts (5 tests) 1210ms
 ✓ src/lib/invite-code.test.ts (4 tests) 9ms

 Test Files  6 passed (6)
      Tests  40 passed (40)
   Start at  03:41:32
   Duration  12.41s
```
**Result**: 100% green (6 test suites, 40 tests passed, 0 failed).

---

### D. Production Build (`npm run build`)
Command: `tsc -b && vite build`
```
> kolo-web@0.1.0 build
> tsc -b && vite build

vite v6.4.6 building for production...
transforming...
✓ 2035 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                                            0.74 kB │ gzip:   0.46 kB
dist/assets/index-BiutVu-f.css                                            67.86 kB │ gzip:  23.80 kB
dist/assets/index-DhGhs00A.js                                          1,048.38 kB │ gzip: 318.18 kB
✓ built in 14.21s
```
**Result**: Clean production bundle generated in `web/dist/`.

---

### E. Programmatic 360px Viewport Horizontal Overflow Check
Evaluated `document.documentElement.scrollWidth <= window.innerWidth` across all application routes at a fixed viewport of 360px width:
```
[360px Check] /                   : scrollWidth=360, innerWidth=360 => PASS
[360px Check] /login              : scrollWidth=360, innerWidth=360 => PASS
[360px Check] /register           : scrollWidth=360, innerWidth=360 => PASS
[360px Check] /app                : scrollWidth=360, innerWidth=360 => PASS
[360px Check] /app/wallet         : scrollWidth=360, innerWidth=360 => PASS
[360px Check] /app/groups         : scrollWidth=360, innerWidth=360 => PASS
[360px Check] /app/groups/new     : scrollWidth=360, innerWidth=360 => PASS
[360px Check] /app/notifications  : scrollWidth=360, innerWidth=360 => PASS
[360px Check] /app/settings       : scrollWidth=360, innerWidth=360 => PASS
```
**Result**: 100% PASS. No horizontal overflow or layout breakage on compact mobile screens.

---

### F. Keyboard-Only Navigation Pass
Executed automated tab cycling through all focusable interactive elements (inputs, buttons, select triggers, links) in `/register`, `/app/groups/new`, and `/app`:
- Visual focus indicators: Verified active `focus-visible:ring-2 focus-visible:ring-primary` outline rendering on all active targets.
- Form completion & dialog submission: Fully operable using `Tab`, `Shift+Tab`, `Space`, `Enter`, and `Escape`.
- **Result**: PASS.

---

### G. Screenshot Catalog (`web/qa/`)

All verification screenshots are saved in `web/qa/`:

#### Desktop (1440×900)
1. `desktop-01-landing.png`: Landing page hero, live UI illustration card, 3-step guide, and footer.
2. `desktop-02-register.png`: Registration form with phone number formatting helper and password toggle.
3. `desktop-03-dashboard-empty.png`: Dashboard empty state for fresh user ("You're not in any groups yet").
4. `desktop-04-wallet-empty.png`: Initial empty wallet view with ₦0 balance.
5. `desktop-05-add-money-dialog.png`: Radix Add Money dialog with quick amounts (₦5k, ₦10k, ₦20k, ₦50k).
6. `desktop-06-fake-checkout.png`: Nigerian payment gateway sandbox checkout with success/failure triggers.
7. `desktop-07-wallet-funded.png`: Funded wallet displaying ₦50,000 balance and deposit ledger entry.
8. `desktop-08-group-new.png`: Group creation form (title, contribution amount, cycle, max members, rule selection).
9. `desktop-09-group-detail-forming.png`: Group detail in "forming" state with copyable invite code and invite card.
10. `desktop-10-group-detail-ready.png`: Group with 4/4 joined members ready to activate.
11. `desktop-11-group-detail-active.png`: Active group round 1 timeline, contribution progress bar, and "Pay now" action.
12. `desktop-13-group-detail-contributed.png`: Confirmed contribution state with "You've paid" badge.
13. `desktop-14-group-detail-round-paidout.png`: Completed round showing ₦40,000 pot paid out to position 1.
14. `desktop-15-ledger-transaction.png`: Double-entry balanced ledger audit table (`sum(debit) == sum(credit)`).
15. `desktop-16-withdraw-dialog.png`: Withdrawal dialog with bank selection and masked account lookup.
16. `desktop-17-wallet-withdrawing.png`: Live polling withdrawal list showing processing state.
17. `desktop-18-notifications.png`: Notification center with unread count badge and "Mark all as read".
18. `desktop-19-dark-mode.png`: Full dark mode theme showing high-contrast emerald tones.
19. `desktop-20-chiamaka-demo-dashboard.png`: Chiamaka Eze demo account dashboard showing "Office Ajo" attention banner.

#### Mobile (390×844)
1. `mobile-01-landing.png`: Mobile responsive landing page with stacked action buttons.
2. `mobile-02-login.png`: Mobile login form with demo credential auto-fill card.
3. `mobile-03-dashboard.png`: Mobile dashboard with fixed bottom navigation bar (`AppShell`).
4. `mobile-04-wallet.png`: Mobile wallet balance card with privacy toggle and quick action buttons.
5. `mobile-05-group-detail.png`: Mobile group detail view with tabbed navigation (Rounds, Members, Activity).
6. `mobile-06-ledger-tx.png`: Mobile transaction detail with full double-entry ledger entries.
7. `mobile-07-notifications.png`: Mobile notifications list with relative timestamps.
8. `mobile-08-dark-mode.png`: Mobile dashboard in dark mode.
