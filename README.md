# Kolo (Ajo, Made Simple)

> A modern Nigerian Ajo / Esusu group savings platform built with double-entry ledger accounting, rotating round payouts, and strict idempotency protection.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38bdf8.svg)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-6.1-646cff.svg)](https://vitejs.dev/)

---

## Overview

**Kolo** runs your *ajo* or *esusu* group for you. In traditional Nigerian rotating savings, members pool money together on a recurring schedule (weekly or monthly), and each round one member collects the entire pot. 

Kolo automates the notebook:
- **Zero-Sum Ledger**: Every deposit, contribution, round payout, and withdrawal is tracked in an audited double-entry accounting table where $\sum \text{debits} - \sum \text{credits} = 0$.
- **Integer Kobo Precision**: Floating-point math is strictly forbidden. All monetary amounts are held and computed as exact integers in kobo (`₦10,000` = `1000000` kobo).
- **Idempotency Protection**: Financial mutation requests require an `Idempotency-Key` header, guaranteeing that network double-sends never charge or pay out twice.
- **In-Memory Security**: Access tokens are kept strictly in memory (never written to `localStorage` or `sessionStorage`), with silent refresh via secure cookies or internal mock session tables.
- **Responsive & Accessible**: Certified 360px+ mobile layout with fixed bottom navigation, dark mode support, and full keyboard tab accessibility.

---

## Repository Structure

```
kolo/
├── web/                    # Frontend React 19 SPA (Vite + Tailwind v4 + React Router v7)
│   ├── src/
│   │   ├── components/     # UI primitives (Radix dialogs, inputs, cards, dev panel)
│   │   ├── features/       # Domain features (groups, wallet, auth)
│   │   ├── lib/            # Money formatting, idempotency, dates, phone helpers
│   │   ├── mocks/          # MSW v2 browser mock ledger engine & handlers
│   │   └── pages/          # Application routes (Dashboard, Groups, Wallet, Settings)
│   ├── qa/                 # Automated 1440×900 and 390×844 verification screenshots
│   └── NOTES.md            # Detailed implementation & verification documentation
├── api/                    # Backend API (Node.js, PostgreSQL schema & endpoints)
├── docker/                 # Postgres container configuration
└── docker-compose.yml      # Local database orchestration
```

---

## Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) >= 20.x
- [npm](https://www.npmjs.com/) >= 10.x
- (Optional) [Docker](https://www.docker.com/) for running local PostgreSQL backend

---

### 2. Running the Web Frontend

The frontend is completely self-contained with a full in-browser double-entry mock engine powered by Mock Service Worker (MSW v2). You can run it immediately without starting the backend:

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

#### Demo Credentials
- **Email:** `demo@kolo.test`
- **Password:** `kolo2026`
- **Account:** Chiamaka Eze (preloaded with active "Office Ajo" round 3 and wallet balance)

#### Mock vs Live Toggle
Configure `web/.env.local` to toggle between in-browser MSW mocks and live backend APIs:
```ini
# Mock everything locally in the browser
VITE_MOCK_DOMAINS=all

# Or connect directly to a live backend server
VITE_MOCK_DOMAINS=
VITE_API_URL=http://localhost:3000/v1
```

---

### 3. Verification & Quality Gates

The frontend enforces strict quality gates with zero errors and zero warnings:

```bash
cd web

# 1. Typecheck (Strict mode + noUncheckedIndexedAccess)
npm run typecheck

# 2. Linting (ESLint flat config)
npm run lint

# 3. Test Suite (Vitest - 40 unit and invariant tests)
npm run test

# 4. Production Build
npm run build
```

---

## Key Features & User Journeys

1. **Dashboard & Wallet**:
   - Live wallet balance card with privacy toggle (`localStorage` persisted).
   - "Needs your attention" urgent action banner for unpaid rounds.
   - Quick deposit via test simulated sandbox or instant funding.
   - Bank transfer withdrawals with bank code routing and automated failure reversals.

2. **Ajo Group Lifecycle**:
   - Create groups with cycle frequency (weekly/monthly) and payout ordering (join order, random).
   - Shareable invite codes for seamless member onboarding.
   - Real-time round progress bars (`4 of 6 paid`), payout schedules, and member management.

3. **Double-Entry Financial Audit**:
   - Inspect any transaction to view the underlying journal entries.
   - Displays Debits and Credits with accounts (e.g. `user_wallet`, `group_escrow`, `external_bank`, `system_clearing`).

4. **Developer Panel**:
   - In-app request logger with timing, headers, and "Copy as curl" generator.
   - Test tools: "Double-send money requests" (verifies idempotency concurrency), "Slow network (+1.5s)", "Expire access token now", and "Reset mock data".

---

## Verification Screenshots

Comprehensive screenshots covering both desktop (1440×900) and mobile (390×844) viewports are available in [`web/qa/`](web/qa/):

- `desktop-01-landing.png` — Landing page with live UI illustration
- `desktop-07-wallet-funded.png` — Funded wallet with deposit transaction
- `desktop-11-group-detail-active.png` — Active group round 1 timeline & progress
- `desktop-15-ledger-transaction.png` — Double-entry balanced ledger audit table
- `desktop-19-dark-mode.png` — High-contrast dark theme
- `mobile-03-dashboard.png` — Mobile dashboard with bottom navigation bar

Detailed verification records and CLI logs can be found in [`web/NOTES.md`](web/NOTES.md).

---

## License

MIT License. Designed and built as a modern financial application learning project.
