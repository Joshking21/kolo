# Kolo: the plan

Kolo is a group-savings app based on **ajo / esusu**. A group of people agree to pay a fixed amount every week or month. Each round, one member collects the whole pot, and the group carries on until everyone has collected once. Members also have a wallet they can fund and withdraw from.

The point of this project is to **learn backend properly**. The app is just the excuse. Every feature was picked because it forces you to use a backend concept for real.

> **Test mode only.** No real money moves in this project, ever. Payments run against provider *test* modes or a fake provider.

---

## Progress

Tick these off as you finish each phase. Don't start a phase until the one before it meets its **Done when** checks.

- [x] **Phase 0**: Project setup (Express skeleton, Postgres in Docker, migration runner) *(done by Claude)*
- [ ] **Phase 1**: SQL foundations: design the schema and write it by hand
- [ ] **Phase 2**: Express + authentication
- [ ] **Phase 3**: Groups API (joins, constraints, first transactions)
- [ ] **Phase 4**: Money: double-entry ledger, wallets, contributions, payouts
- [ ] **Phase 5**: Idempotency keys
- [ ] **Phase 6**: Payments, webhooks and withdrawals
- [ ] **Phase 7**: Redis: rate limiting, caching, background jobs, locks
- [ ] **Phase 8**: MongoDB: activity feed and notifications (with the outbox pattern)
- [ ] **Phase 9**: Production basics: logging, security headers, config
- [ ] **Phase 10**: Docker everything
- [ ] **Phase 11**: Scaling: load tests, indexes, connection pooling, system design write-up
- [ ] **Phase 12**: Kubernetes
- [ ] **Phase 13** *(optional)*: Deploy it for real and add it to the portfolio

---

## How we work

1. **The frontend is built by Gemini** using [GEMINI_PROMPT.md](GEMINI_PROMPT.md). It runs on **mock data** at first. As you finish each backend phase, you switch that part of the frontend from mock to your real API (see "Switch to live" in each phase). That way you can always *see* what your backend is doing.
2. **You write the backend code yourself.** Typing it is how it sticks. Use Claude to explain concepts, review your code, and help when you're stuck, but not to write whole features for you. (Phase 0 is the exception.)
3. **[API.md](API.md) is the contract.** The frontend and the backend both follow it. If you need to change an endpoint, change API.md *first*, then the code on both sides.
4. **After every phase:**
   - tick the boxes here
   - commit with a message like `phase 3: groups api`
   - add 3–5 lines to `LEARNING_LOG.md`: what you learned, what broke, what confused you.

   That log is gold for interviews.

## Folder layout

```
kolo/
├── ROADMAP.md          ← this file
├── API.md              ← endpoint contract (source of truth)
├── GEMINI_PROMPT.md    ← brief for Gemini to build the frontend
├── LEARNING_LOG.md     ← you write this as you go
├── docker-compose.yml  ← Postgres now; Redis + Mongo added in later phases
├── docker/postgres/    ← creates the kolo_test database on first start
├── api/                ← YOUR backend (Express + TypeScript)
│   ├── migrations/     ← plain .sql files, run in order
│   └── src/
│       ├── server.ts   ← starts the HTTP server, graceful shutdown
│       ├── app.ts      ← builds the Express app (used by tests too)
│       ├── config.ts   ← reads and checks environment variables
│       ├── db/         ← connection pool + migration runner
│       ├── lib/        ← AppError and error codes
│       ├── middleware/ ← request id, 404, error handler
│       └── routes/     ← one file per area (health, auth, groups, …)
└── web/                ← frontend (Gemini builds this)
```

## Rules that apply everywhere

- **Money is an integer number of kobo.** ₦1 = 100 kobo. Never use floats for money, not in SQL, not in JS. Postgres column type: `bigint`. JSON field names end in `Kobo`.
- **Balances are never edited directly.** Every movement of money is a ledger transaction with two or more entries that add up to zero. A balance is the sum of an account's entries. (Phase 4 explains this.)
- **Write SQL yourself.** Use the `pg` library and plain SQL. No ORM until you've finished Phase 4. After that you can try one (Drizzle or Kysely) and you'll understand what it's doing for you.
- **Let the database protect you.** If a rule can be a constraint (`NOT NULL`, `UNIQUE`, `CHECK`, foreign keys), make it a constraint, not just an `if` in JavaScript.
- **Every phase has tests.** Integration tests run against the real `kolo_test` database, not mocks.

---

## Phase 0: Project setup *(done)*

**What's already here:** Express 5 + TypeScript skeleton, config checked with Zod, Postgres connection pool, a migration runner you can read (`api/src/db/migrate.ts`), the request-id and error-handler middleware, and a `GET /api/v1/health` endpoint.

### Your setup steps

- [ ] Install **Docker Desktop** for Windows (it uses WSL 2; let it install WSL if it asks). Restart, open Docker Desktop, and wait until it says "Engine running".
- [ ] In a terminal in `kolo/`: `docker compose up -d`, then `docker compose ps`. Postgres should show `healthy`.
- [ ] In `kolo/api/`: `npm install`, then `npm run migrate`. You should see `applied 0001_extensions.sql`.
- [ ] `npm run dev`, then open http://localhost:4000/api/v1/health. You should see `{"status":"ok","db":"up",…}`.
- [ ] Stop Postgres (`docker compose stop postgres`) and reload the health URL. You get a 503 with `"db":"down"`. Start it again. *(This is what a load balancer's health check sees.)*
- [ ] Open a SQL shell: `docker compose exec postgres psql -U kolo -d kolo`. Try `\dt` (list tables), `\d schema_migrations` (describe a table), `\q` (quit).
- [ ] Optional but nice: install a GUI such as **DBeaver** or **TablePlus** and connect to `localhost:5432` (user `kolo`, password `kolo`, database `kolo`).
- [ ] Read every file in `api/src/`. Each one is short and commented. Ask about anything that's unclear.
- [ ] `git add -A && git commit -m "phase 0: project setup"`

**Done when:** health returns `ok`, and you can explain what `migrate.ts` does, including why it takes an advisory lock.

---

## Phase 1: SQL foundations

**Goal:** design the core database schema and write it in SQL by hand. Then get comfortable *querying* it. This is the phase that teaches Postgres, so take your time.

**You'll learn:** data types (`uuid`, `text`, `bigint`, `timestamptz`, `citext`), primary keys, foreign keys and `ON DELETE`, `UNIQUE`, `CHECK`, partial unique indexes, indexes in general, `JOIN` (inner, left), `GROUP BY` / `HAVING`, sub-queries vs `EXISTS`, CTEs (`WITH`), window functions, `EXPLAIN ANALYZE`.

### The schema to build

Write each group of tables as a new migration file (`npm run migrate:new create_users` makes the next numbered file). One migration per bullet below. Columns are listed as `name type — rules`.

**`0002_create_users.sql`**
- `users`
  - `id uuid` — primary key, default `gen_random_uuid()`
  - `full_name text` — not null, 2–80 characters (`CHECK (char_length(full_name) BETWEEN 2 AND 80)`)
  - `email citext` — not null, unique (citext makes `Ada@x.com` and `ada@x.com` equal)
  - `phone text` — not null, unique, must match `^\+234[789][01][0-9]{8}$` (always stored in `+234` form)
  - `password_hash text` — not null
  - `created_at timestamptz`, `updated_at timestamptz` — not null, default `now()`

**`0003_create_groups.sql`**
- `groups`
  - `id uuid` — primary key
  - `name text` — not null, 3–60 characters
  - `description text` — nullable, ≤ 280 characters
  - `contribution_kobo bigint` — not null, between 100000 and 100000000 (₦1,000 – ₦1,000,000), and a multiple of 100 (whole naira)
  - `frequency text` — not null, `'weekly'` or `'monthly'`
  - `max_members smallint` — not null, 2–12
  - `payout_order text` — not null, `'join_order'` or `'random'`
  - `status text` — not null, default `'forming'`; one of `'forming','active','completed','cancelled'`
  - `invite_code text` — not null, unique, exactly 8 characters
  - `created_by uuid` — not null, references `users`
  - `started_at timestamptz` — nullable
  - `created_at`, `updated_at`
- `group_members`
  - `group_id uuid` — references `groups` `ON DELETE CASCADE`
  - `user_id uuid` — references `users`
  - `role text` — `'admin'` or `'member'`
  - `payout_position smallint` — nullable (set when the group starts)
  - `joined_at timestamptz` — default `now()`
  - Primary key `(group_id, user_id)`
  - `UNIQUE (group_id, payout_position)` *(NULLs don't clash in a UNIQUE constraint. Find out why.)*
  - Index on `user_id`. *(Why? The primary key already covers `group_id` lookups but not "all groups for this user".)*

**`0004_create_ledger.sql`**
- `accounts`
  - `id uuid` — primary key
  - `type text` — `'user_wallet'`, `'group_pot'` or `'system'`
  - `user_id uuid` — nullable, references `users`
  - `group_id uuid` — nullable, references `groups`
  - `system_name text` — nullable
  - `allow_negative boolean` — not null, default false
  - `currency char(3)` — not null, default `'NGN'`
  - `created_at`
  - A `CHECK` that the right owner column is filled for each type:
    - `user_wallet` → `user_id` only
    - `group_pot` → `group_id` only
    - `system` → `system_name` only
  - Partial unique indexes:
    - one wallet per user: `UNIQUE (user_id) WHERE type = 'user_wallet'`
    - one pot per group
    - unique `system_name`
  - Insert the system accounts in this migration:
    - `funding_source` (`allow_negative = true`): where test and deposited money "comes from"
    - `withdrawals_clearing`: holds money while a withdrawal is being processed
    - `payouts_sink` (`allow_negative = true`): where withdrawn money "goes"
- `ledger_transactions`
  - `id uuid` — primary key
  - `type text` — `'dev_funding','deposit','contribution','payout','withdrawal','withdrawal_reversal'`
  - `description text` — not null
  - `reference text` — nullable, unique
  - `created_at`
- `ledger_entries`
  - `id bigint` — `GENERATED ALWAYS AS IDENTITY` primary key *(ordered, so it's good for pagination)*
  - `transaction_id uuid` — not null, references `ledger_transactions`
  - `account_id uuid` — not null, references `accounts`
  - `amount_kobo bigint` — not null, `<> 0`. **Positive = money into the account, negative = money out.**
  - `created_at`
  - Index on `(account_id, id)`

**`0005_create_rounds.sql`**
- `rounds`
  - `id uuid` — primary key
  - `group_id uuid` — references `groups`
  - `round_number smallint` — not null
  - `recipient_user_id uuid` — references `users`
  - `due_at timestamptz` — not null
  - `status text` — `'upcoming','collecting','paid_out'`
  - `paid_out_at timestamptz` — nullable
  - `payout_transaction_id uuid` — nullable, references `ledger_transactions`
  - `UNIQUE (group_id, round_number)`
  - Index on `(status, due_at)` *(the background job in Phase 7 searches by exactly this)*
- `contributions`
  - `id uuid` — primary key
  - `round_id uuid` — references `rounds`
  - `user_id uuid` — references `users`
  - `amount_kobo bigint` — not null, `> 0`
  - `transaction_id uuid` — not null, references `ledger_transactions`
  - `created_at`
  - **`UNIQUE (round_id, user_id)`**: the database itself guarantees nobody pays twice into the same round. This is your last line of defence, even if your code has a bug.

> Later phases add `refresh_tokens` (Phase 2), `idempotency_keys` (Phase 5), `deposits`, `withdrawals` and `webhook_events` (Phase 6) and `outbox_events` (Phase 8). Their columns are described in those phases.

### Tasks

- [ ] Write migrations 0002–0005 and run them. Check them with `\d+ table_name` in psql.
- [ ] Try to break your constraints on purpose with `INSERT`s that should fail: a duplicate email, a contribution of ₦500, two wallets for one user, a contribution twice in one round. Each one **must** be rejected by Postgres. If one gets through, fix the constraint.
- [ ] Write `api/seeds/dev_seed.sql`. It should hold 6 users, 2 groups (one forming, one active on round 2), wallets, a few ledger transactions and contributions. **Every ledger transaction must sum to zero.**
- [ ] Write these queries in `api/exercises/phase1.sql`. Run each one and keep the answers:
  1. All users, newest first.
  2. Each group with its member count (`JOIN` + `GROUP BY`).
  3. Groups that still have open spots (`HAVING`).
  4. All groups a given user belongs to, with their role.
  5. A user's wallet balance (`SUM` of entries).
  6. Every account whose entries don't sum to what you expect. Write a query that proves every ledger transaction sums to zero (`GROUP BY transaction_id HAVING SUM(amount_kobo) <> 0` should return **no rows**).
  7. A user's wallet history with a **running balance** after each entry (`SUM(...) OVER (ORDER BY id)`: a window function).
  8. Members of a group who have **not** paid into the current round. Write it twice: once with `LEFT JOIN … WHERE c.id IS NULL`, once with `NOT EXISTS`.
  9. The total saved per group across all rounds.
  10. The top 3 users by total contributions (`ORDER BY … LIMIT`).
  11. Rounds that are overdue: still `collecting` with `due_at < now()`.
  12. Using a CTE (`WITH`): for each active group, the current round and how many members have paid.
  13. Run `EXPLAIN ANALYZE` on query 7. Drop the `(account_id, id)` index, run it again, and compare. Then put the index back. *(With seed data the difference is tiny. In Phase 11 you'll load 1M rows and see it properly.)*
  14. Write an `UPDATE` that would move a round from `collecting` to `paid_out`, and wrap it in `BEGIN; … ROLLBACK;` so you see it without keeping it.
  15. Bonus: a **constraint trigger** (`DEFERRABLE INITIALLY DEFERRED`) on `ledger_entries` that raises an error at `COMMIT` if any transaction's entries don't sum to zero.

**Done when:** all migrations run cleanly on an empty database (`docker compose down -v && docker compose up -d && npm run migrate`), the seed loads, the constraint tests fail the way they should, and query 6 returns no rows.

**Read:** the Postgres tutorial (postgresql.org/docs/current/tutorial.html), sections 2 and 3. Also *Use The Index, Luke* (use-the-index-luke.com), chapters 1–2.

---

## Phase 2: Express + authentication

**Goal:** real sign-up and login, done the way production apps do it.

**You'll learn:** how Express routing and middleware work, request validation, layering your code (route → service → database), password hashing, JWTs, refresh-token rotation, cookies, and integration tests.

### New table: `0006_create_refresh_tokens.sql`
- `refresh_tokens`
  - `id uuid` — primary key
  - `user_id uuid` — references `users` `ON DELETE CASCADE`
  - `token_hash text` — not null, unique. **Store a SHA-256 hash, never the token itself.**
  - `family_id uuid` — not null. All tokens from one login share a family.
  - `expires_at timestamptz` — not null
  - `revoked_at timestamptz` — nullable
  - `replaced_by uuid` — nullable
  - `user_agent text`, `ip inet`
  - `created_at`

### Tasks

- [ ] Add a small `validate(schema)` helper that parses `req.body` with Zod and throws `VALIDATION_ERROR` (the error handler already turns `ZodError` into the right response).
- [ ] Structure: `routes/auth.ts` (HTTP only) → `services/auth.service.ts` (rules) → `db/users.repo.ts` (SQL only). Keep SQL out of routes.
- [ ] Hash passwords with **argon2** (`@node-rs/argon2`).
- [ ] `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/logout-all`, `GET /me`, `PATCH /me`, `POST /me/password`. All shapes are in [API.md](API.md#auth).
  - Registering creates the user **and their wallet account in the same transaction.** You'll write your first `BEGIN … COMMIT` here.
  - Map Postgres error `23505` (unique_violation) on email or phone to `EMAIL_TAKEN` / `PHONE_TAKEN`. Don't run a `SELECT` first to check; that has a race condition. Find out why.
- [ ] Access token: a JWT signed with HS256, 15-minute expiry, `sub` = user id. Use the `jose` library.
- [ ] Refresh token: 32 random bytes, sent as an `HttpOnly` cookie (details in API.md). **Rotate** it on every refresh. If an already-used refresh token comes back, assume it was stolen: revoke the whole family.
- [ ] `requireAuth` middleware: reads the bearer token, verifies it, and puts the user id on `req.user`.
- [ ] Tests (Vitest + Supertest against `kolo_test`):
  - register → login → me
  - a duplicate email gets 409
  - a wrong password gets 401
  - an expired or garbage token gets 401
  - refresh rotates the token
  - reusing an old refresh token kills the family

**Switch to live:** remove `auth` from `VITE_MOCK_DOMAINS` in `web/.env.local`. Sign up through the real UI and look at the row in `users`.

**Done when:** all auth tests pass and you can explain, out loud, why the access token is short-lived and why the refresh token lives in an HttpOnly cookie instead of localStorage.

---

## Phase 3: Groups API

**Goal:** create, join, leave and start ajo groups.

**You'll learn:** multi-table transactions, row locks (`SELECT … FOR UPDATE`), race conditions, mapping constraint errors to API errors, and access control (404 vs 403).

### Tasks

- [ ] `POST /groups`. In one transaction: insert the group, insert the creator as `admin`, create the group's `group_pot` account. Generate the invite code (8 characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`; retry if it collides with an existing one).
- [ ] `GET /groups`: the user's groups, with member count and current round (one query with JOINs, **not** one query per group, which is the "N+1 problem").
- [ ] `GET /groups/:id`: returns 404 if the user isn't a member (don't reveal that the group exists).
- [ ] `POST /groups/join`. **Race condition to solve:** a group has 1 spot left and two people join at the same instant. Both read "4 of 5", both insert, and now there are 6. Fix it with `SELECT … FROM groups WHERE id = $1 FOR UPDATE` before counting. Write a test that fires 10 joins at once at a group with 1 spot, and check that exactly 1 succeeds.
- [ ] `POST /groups/:id/leave` and `POST /groups/:id/cancel`.
- [ ] `POST /groups/:id/start` (admin only). Assign payout positions (join order, or a shuffle using `crypto.randomInt`), create one round per member with due dates (rules are in API.md), set round 1 to `collecting`, and set the group to `active`. All in one transaction.
- [ ] Dev endpoint `POST /dev/groups/:id/fake-members` so you can fill a group by yourself.
- [ ] Tests for every rule in API.md's "Groups" section.

**Switch to live:** remove `groups`.

**Done when:** the concurrent-join test passes 20 runs in a row.

---

## Phase 4: Money: ledger, wallets, contributions, payouts ⭐

**Goal:** the heart of the app. Money moves between accounts correctly, even under concurrency.

**You'll learn:** double-entry bookkeeping, ACID, isolation levels, `FOR UPDATE`, **deadlocks and lock ordering**, cursor pagination, window functions in a real API.

### How the ledger works

Every money movement is one `ledger_transactions` row plus two or more `ledger_entries` rows that **sum to zero**:

| Action | Entries |
|---|---|
| Dev funding ₦50,000 | `funding_source −5,000,000` / `user wallet +5,000,000` |
| Contribute ₦10,000 | `user wallet −1,000,000` / `group pot +1,000,000` |
| Payout to Ngozi (6 × ₦10,000) | `group pot −6,000,000` / `Ngozi's wallet +6,000,000` |
| Withdraw ₦20,000 (held) | `user wallet −2,000,000` / `withdrawals_clearing +2,000,000` |

A balance is `SELECT SUM(amount_kobo) FROM ledger_entries WHERE account_id = $1`. Nothing is ever updated or deleted. Mistakes are fixed with a *new* reversing transaction. That's why banks can audit everything.

### Tasks

- [ ] `withTransaction(fn)` helper. It checks out a client, runs `BEGIN`, calls `fn(client)`, then `COMMIT`s, or `ROLLBACK`s on error. It always releases the client.
- [ ] `postLedgerTransaction(client, { type, description, entries })`. It throws if the entries don't sum to zero, and inserts the transaction and its entries.
- [ ] **Balance check under concurrency.** Before taking money out of an account, lock it with `SELECT … FROM accounts WHERE id = $1 FOR UPDATE`, then compute the balance, then insert. Without the lock, two withdrawals can both see ₦10,000 and both take ₦10,000.
- [ ] **Lock ordering.** When one transaction locks two accounts, always lock them in the same order (by `id`). Otherwise transaction A locks X then waits for Y, transaction B locks Y then waits for X, and Postgres kills one with a `deadlock detected` error. Write a test that triggers a deadlock *without* ordering, then fix it.
- [ ] `GET /wallet`, `GET /wallet/transactions` (cursor pagination by entry `id`, with `balanceAfterKobo` from a window function), `GET /ledger/transactions/:id`.
- [ ] `POST /dev/fund-wallet`.
- [ ] `POST /groups/:id/rounds/:roundNumber/contribute`. When the last member pays, do the **payout in the same database transaction**: pot → recipient, round → `paid_out`, next round → `collecting`, or the group → `completed` after the last round.
- [ ] `POST /dev/groups/:id/fake-contributions`.
- [ ] **The big test:** 50 concurrent requests that each try to spend ₦1,000 from a wallet holding ₦10,000. Exactly 10 succeed, 40 get `INSUFFICIENT_FUNDS`, the balance ends at 0, and the zero-sum query from Phase 1 still returns no rows.
- [ ] Read about isolation levels. Run the same test under `REPEATABLE READ` and `SERIALIZABLE` instead of using `FOR UPDATE`, and see what errors you get (`40001`). Write down which approach you prefer and why.

**Switch to live:** remove `wallet` and `dev`.

**Done when:** the big test passes 20 runs in a row, and the zero-sum check returns no rows after the whole test suite runs.

---

## Phase 5: Idempotency keys

**Goal:** a payment request that gets sent twice (double tap, flaky network, client retry) only ever happens once.

**You'll learn:** what idempotency is, the `Idempotency-Key` header pattern (the way Stripe does it), how to store and replay a response, and how to handle a request that's still being processed.

### New table: `0007_create_idempotency_keys.sql`
- `idempotency_keys`
  - `user_id uuid`, `key text` — primary key `(user_id, key)`
  - `method text`, `path text`
  - `request_hash text` — SHA-256 of method + path + body
  - `status text` — `'in_progress'` or `'completed'`
  - `response_status smallint`, `response_body jsonb` — nullable
  - `created_at`, `completed_at`

### Tasks

- [ ] `idempotent()` middleware for every route marked **[idempotent]** in API.md:
  1. A missing or badly formed key gets `IDEMPOTENCY_KEY_MISSING`.
  2. `INSERT … ON CONFLICT DO NOTHING` a row with status `in_progress`. **Use this atomic insert, not a SELECT-then-INSERT.**
  3. If the row already existed:
     - a different `request_hash` gets `IDEMPOTENCY_KEY_REUSED`
     - `in_progress` gets `IDEMPOTENCY_IN_PROGRESS`
     - `completed` replays the stored status and body, with an `Idempotent-Replayed: true` header.
  4. If it's new, run the handler, capture the response, and mark the row `completed`. If the handler threw a 5xx, **delete** the row so the client can retry.
- [ ] Clean up keys older than 24 hours (a SQL `DELETE` for now; it becomes a scheduled job in Phase 7).
- [ ] Tests: same key + same body → same response and only one ledger transaction; same key + different body → 422; two at once → one runs and one gets 409.
- [ ] In the frontend's "Under the hood" panel, turn on **Double-send money requests** and contribute. Watch one request do the work and the other get replayed.

**Done when:** you can explain why the unique constraint on `contributions` *and* idempotency keys are both needed. (Hint: they protect against different things. One protects the data; the other gives the client a consistent answer.)

---

## Phase 6: Payments, webhooks and withdrawals

**Goal:** fund wallets through a payment provider and withdraw to a bank. Both are asynchronous: you don't get the answer straight away.

**You'll learn:** integrating third-party APIs behind an interface, webhooks, signature verification (HMAC), at-least-once delivery and deduplication, state machines, compensating transactions (reversals).

### New tables: `0008_create_payments.sql`
- `deposits`
  - `id uuid` — primary key
  - `user_id uuid`
  - `amount_kobo bigint`
  - `provider text`
  - `reference text` — unique
  - `status text` — `'pending','succeeded','failed'`
  - `checkout_url text`
  - `transaction_id uuid` — nullable
  - `created_at`, `updated_at`
- `withdrawals`
  - `id uuid` — primary key
  - `user_id uuid`
  - `amount_kobo bigint`
  - `bank_code text`
  - `account_number char(10)`
  - `account_name text`
  - `status text` — `'pending','processing','succeeded','failed'`
  - `hold_transaction_id uuid`, `settle_transaction_id uuid`, `reversal_transaction_id uuid`
  - `failure_reason text`
  - `created_at`, `updated_at`
- `webhook_events`
  - `id uuid` — primary key
  - `provider text`
  - `event_id text`
  - `payload jsonb`
  - `received_at`, `processed_at`
  - `UNIQUE (provider, event_id)`

### Tasks

- [ ] A `PaymentProvider` interface with two implementations:
  - `FakeProvider`, the default in development. Its checkout page is the frontend route `/dev/fake-checkout`.
  - `PaystackProvider`, which uses Paystack **test mode**: initialize transaction + webhook. To receive webhooks on your laptop you need a tunnel (`cloudflared tunnel --url http://localhost:4000`).
- [ ] `POST /wallet/deposits` creates a `pending` deposit and returns `checkoutUrl`.
- [ ] `POST /webhooks/:provider`:
  - verify the signature (Paystack: HMAC-SHA512 of the raw body with your secret key, compared using `crypto.timingSafeEqual`)
  - insert into `webhook_events`; if the event id already exists, return 200 and do nothing (**providers resend webhooks**)
  - credit the wallet in a transaction and mark the deposit `succeeded`.
- [ ] `POST /dev/fake-provider/complete`: the fake provider "sends" a webhook.
- [ ] `POST /wallet/withdrawals`:
  - in one transaction, move money wallet → `withdrawals_clearing` (the hold) and create the withdrawal as `pending`
  - a fake transfer processor then moves it to `processing`, then `succeeded` (clearing → `payouts_sink`) or `failed` (clearing → wallet, a reversal)
  - account numbers ending in `0000` always fail, so you can test the failure path.
- [ ] Draw the deposit and withdrawal state machines in `docs/state-machines.md`. Make illegal moves impossible: `UPDATE … SET status = 'succeeded' WHERE id = $1 AND status = 'processing'`, then check the row count.
- [ ] Tests:
  - the same webhook sent 5 times credits the wallet once
  - a bad signature gets 401
  - a failed withdrawal returns the money
  - the ledger still sums to zero.

**Switch to live:** remove `payments`.

---

## Phase 7: Redis

**Goal:** use Redis for the things it's genuinely good at.

**You'll learn:** key/value with TTLs, rate limiting algorithms, cache-aside and invalidation, job queues (BullMQ), separate worker processes, distributed locks, and why every job must be safe to run twice.

### Tasks

- [ ] Add `redis:7-alpine` to `docker-compose.yml` and `REDIS_URL` to config.
- [ ] **Rate limiting.** First a fixed window (`INCR` + `EXPIRE`), then upgrade to a sliding window with a sorted set. Apply the limits in API.md and return `429` with a `Retry-After` header. Test it.
- [ ] **Caching.** Cache `GET /groups/:id` for 30 seconds (cache-aside). Delete the key whenever anything about that group changes. Measure the response time before and after.
- [ ] **BullMQ worker** (`src/worker.ts`, run with `npm run worker` as its own process):
  - `due-rounds`: a repeatable job every minute (rules in API.md: reminders, auto-contributions, overdue notices)
  - `process-withdrawal` (move it out of the request)
  - `cleanup-idempotency-keys`: daily.
- [ ] **Lock.** Make sure two workers can't process the same round at the same time. Try both approaches: a Redis lock (`SET key value NX PX 30000`) and a Postgres advisory lock (`pg_try_advisory_xact_lock`). Write down which you'd use and why.
- [ ] `POST /dev/jobs/run-due-rounds` runs the job on demand.
- [ ] Run **two** workers and the job at the same time, and check that nothing is processed twice.

**Done when:** 2 API instances + 2 workers can run together without double payouts or broken rate limits (rate limits live in Redis, not in each process's memory).

---

## Phase 8: MongoDB: activity feed and notifications

**Goal:** use a document database for data that suits it: an append-heavy, schema-flexible feed that you read by user or group.

**You'll learn:** documents vs rows, when to pick which, Mongo indexes and TTL indexes, and the **transactional outbox pattern**. That pattern is how you keep two databases in sync without losing events.

### The problem the outbox solves

When a contribution is made, you need to (1) commit money in Postgres and (2) write activity and notifications to Mongo. If you write to Mongo *inside* the request and the Postgres commit then fails, you've announced money that never moved. If you write *after* the commit and the process crashes, the notification is lost.

**The fix:** in the *same* Postgres transaction as the money, insert a row into `outbox_events`. A worker reads unpublished rows, writes them to Mongo, then marks them published. Nothing is lost, and nothing is announced that didn't happen. (Writes can repeat, so make the Mongo writes idempotent using the outbox event id.)

### Tasks

- [ ] Add `mongo:7` to docker-compose and `MONGO_URL` to config. Use the official `mongodb` driver (no Mongoose, so you learn the real API).
- [ ] Migration `0009_create_outbox.sql`:
  - `outbox_events`
    - `id uuid` — primary key
    - `type text`
    - `payload jsonb`
    - `created_at`
    - `published_at` — nullable
  - an index on `created_at WHERE published_at IS NULL`.
- [ ] Write outbox events in every transaction that matters: member joined or left, group started, contribution, payout, group completed, deposit and withdrawal results.
- [ ] Outbox publisher job. Use `SELECT … FOR UPDATE SKIP LOCKED LIMIT 100` so several workers can share the load without double-publishing.
- [ ] Collections:
  - `activities`: `{ _id, groupId, actor, type, message, createdAt }`, with index `{ groupId: 1, createdAt: -1 }`
  - `notifications`: `{ _id, userId, type, title, body, link, readAt, createdAt }`, with index `{ userId: 1, createdAt: -1 }` and a TTL index that removes read notifications after 90 days.
- [ ] `GET /groups/:id/activity`, `GET /notifications`, `GET /notifications/unread-count`, `POST /notifications/:id/read`, `POST /notifications/read-all`.

**Switch to live:** remove `notifications`. Every domain is now live, so set `VITE_MOCK_DOMAINS=` (empty).

---

## Phase 9: Production basics

- [ ] Structured logs with **pino** (JSON in production, pretty in dev). Include `requestId`, `userId`, method, path, status and duration on every request.
- [ ] `helmet` for security headers. A strict CORS allow-list. A body size limit (already 100kb).
- [ ] Split the health check into `/health/live` (is the process up?) and `/health/ready` (can it reach Postgres, Redis and Mongo?).
- [ ] Graceful shutdown for API and worker: stop accepting work, finish in-flight work, close pools.
- [ ] Never log passwords, tokens or full account numbers. Add a redaction list to pino.

## Phase 10: Docker everything

- [ ] A multi-stage `api/Dockerfile`:
  - build stage with dev dependencies
  - runtime stage with production dependencies only
  - runs as a non-root `node` user
- [ ] The same image runs the API or the worker (different `command`).
- [ ] `web/Dockerfile`: build with Vite, serve with nginx, proxy `/api` to the API.
- [ ] `docker-compose.yml` runs the whole stack: `postgres`, `redis`, `mongo`, `api`, `worker`, `web`, `migrate` (a one-off service that runs migrations before `api` starts, via `depends_on: condition: service_completed_successfully`).
- [ ] `docker compose up --build` from a fresh clone gives a working app at http://localhost:8080.

## Phase 11: Scaling and system design

- [ ] Run 3 `api` replicas behind nginx (`docker compose up --scale api=3`). Confirm nothing depends on in-process memory.
- [ ] Load test with **k6**:
  - a script that logs in and reads groups
  - a script where 200 virtual users contribute at once.
  - Record p50/p95/p99 latency and errors.
- [ ] Seed 1,000,000 ledger entries (`generate_series`). Find the slowest endpoint, `EXPLAIN ANALYZE` it, fix it with an index or a query change, and measure again.
- [ ] **Connection maths:** 3 replicas × pool of 10 + workers vs Postgres `max_connections`. Add **PgBouncer** in transaction mode and explain what it changes.
- [ ] Try a cached balance: an `accounts.balance_kobo` column updated in the same transaction as the entries. Compare it with `SUM()` at 1M rows, and write down the trade-off.
- [ ] Write `docs/SYSTEM_DESIGN.md`:
  - an architecture diagram
  - the request flow for a contribution
  - where the bottlenecks are at 10× and 100× load
  - what you'd change (read replicas, partitioning `ledger_entries` by month, queue backpressure, multi-region)
  - and why you chose Postgres for money and Mongo for feeds.

## Phase 12: Kubernetes

- [ ] Install **kind** (Kubernetes in Docker) and `kubectl`. Create a cluster.
- [ ] Manifests in `k8s/`:
  - `Deployment`s for api (3 replicas) and worker (2)
  - a `Service` for the api, plus an `Ingress`
  - `ConfigMap` + `Secret` for env
  - a `Job` for migrations
- [ ] Liveness and readiness probes pointing at the Phase 9 endpoints.
- [ ] Run Postgres, Redis and Mongo as `StatefulSet`s (fine for learning; in real life you'd use managed databases, and you should be able to explain why).
- [ ] Do each of these and watch what happens:
  - a rolling update (change an env var)
  - delete a pod
  - scale the API with a `HorizontalPodAutoscaler` while k6 runs.

## Phase 13 (optional): ship it

- [ ] Deploy:
  - API + worker on Render, Railway or Fly
  - Postgres on Neon or Supabase
  - Redis on Upstash
  - Mongo on Atlas (free tier)
  - web on Netlify or Vercel.
- [ ] Add Kolo to the portfolio, with a short write-up of the hardest bug from your `LEARNING_LOG.md`.

---

## Reading list (short on purpose)

- **Postgres docs**: the tutorial, then the chapters on Concurrency Control (MVCC, explicit locking, transaction isolation).
- **Use The Index, Luke**: indexes explained properly.
- **Stripe's blog post "Designing robust and predictable APIs with idempotency"**.
- **_Designing Data-Intensive Applications_ (Kleppmann)**, chapters 5, 7 and 11. Read them after Phase 8; they'll make much more sense then.
