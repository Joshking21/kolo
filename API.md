# Kolo API contract: v1

This is the **single source of truth** for how the frontend and backend talk. The frontend's mock layer and the real Express API must both behave exactly as described here. To change something, change this file first.

The **Phase** column says which [ROADMAP](ROADMAP.md) phase builds each endpoint for real. Until then, the frontend uses its mock.

---

## 1. Conventions

### Base URL and transport
- Every endpoint is under **`/api/v1`**.
- In development the API runs on `http://localhost:4000`. The frontend runs on `http://localhost:5173` and **proxies `/api` to the API**, so the browser sees one origin. Cookies just work and there's no CORS in dev.
- Request and response bodies are JSON (`Content-Type: application/json`). The maximum request body is 100 kB.
- Field names are **camelCase**.

### Data formats
| Kind | Format | Example |
|---|---|---|
| IDs | UUID string. Wallet history items use the ledger entry id as a numeric string. | `"8f14e45f-ceea-4b6f-9c3d-2a1b0c9d8e7f"`, `"10423"` |
| Timestamps | ISO 8601, UTC, milliseconds | `"2026-11-19T09:30:00.000Z"` |
| Money | **Integer kobo**, field name ends in `Kobo`. ₦1 = 100 kobo. Never a float, never a string. | `"balanceKobo": 8500000` = ₦85,000 |
| Phone | Always returned as `+234XXXXXXXXXX` | `"+2348031234567"` |
| Nullable fields | Present with `null`, never omitted | `"startedAt": null` |

### Headers
| Header | Direction | Meaning |
|---|---|---|
| `Authorization: Bearer <accessToken>` | request | Required on every endpoint except those marked **public** |
| `Idempotency-Key: <key>` | request | Required on endpoints marked **[idempotent]**. 8–64 characters of `[A-Za-z0-9_-]`. The client should use a UUID v4. |
| `X-Request-Id` | both | The server returns one on every response (it reuses the client's if it's a valid 8–64 char `[A-Za-z0-9_-]` string, otherwise it generates a UUID). Error bodies include it too. |
| `Idempotent-Replayed: true` | response | This response is a stored replay of an earlier request with the same key |
| `Retry-After: <seconds>` | response | Sent with every `429` |

### Pagination (cursor-based)
List endpoints take `?limit=` (default 20, min 1, max 100) and `?cursor=` (an opaque string from the previous page).

```json
{ "data": [ ... ], "nextCursor": "eyJpZCI6MTA0MjN9" }
```
`nextCursor` is `null` on the last page. Clients must not parse or build cursors themselves.

### Errors
Every error response has this shape:
```json
{
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "Your wallet balance is too low for this payment.",
    "details": null,
    "requestId": "b7c1d2e3-..."
  }
}
```
For `VALIDATION_ERROR`, `details` is a list of field problems. `path` uses dot notation for nested fields.
```json
"details": [ { "path": "email", "message": "Enter a valid email address" } ]
```

### Error codes (complete list)
| HTTP | `code` | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body, query or params failed validation |
| 400 | `INVALID_JSON` | The body isn't valid JSON |
| 400 | `IDEMPOTENCY_KEY_MISSING` | An [idempotent] endpoint was called without a valid `Idempotency-Key` |
| 401 | `UNAUTHENTICATED` | Missing, malformed or expired access token |
| 401 | `INVALID_CREDENTIALS` | Wrong email or password (always the same message; never say which one was wrong) |
| 401 | `REFRESH_TOKEN_INVALID` | Refresh cookie missing, expired, revoked or reused |
| 403 | `FORBIDDEN` | Signed in and a member, but not allowed (e.g. a non-admin tries to start a group) |
| 404 | `NOT_FOUND` | The resource doesn't exist **or the user can't see it** (non-members get 404 for a group, not 403) |
| 409 | `EMAIL_TAKEN` | Register or update with an email already in use |
| 409 | `PHONE_TAKEN` | Register or update with a phone already in use |
| 409 | `ALREADY_MEMBER` | Joining a group you're already in |
| 409 | `GROUP_FULL` | Joining a group at `maxMembers` |
| 409 | `GROUP_NOT_FORMING` | Join, leave, start, cancel or add fake members on a group that isn't `forming` |
| 409 | `GROUP_NOT_ACTIVE` | Contributing to a group that isn't `active` |
| 409 | `NOT_ENOUGH_MEMBERS` | Starting a group with fewer than 2 members |
| 409 | `ADMIN_CANNOT_LEAVE` | The admin tries to leave (they must cancel instead) |
| 409 | `ROUND_NOT_COLLECTING` | Contributing to a round that's `upcoming` or `paid_out` |
| 409 | `ALREADY_CONTRIBUTED` | Paying into the same round twice (with a *different* idempotency key) |
| 409 | `IDEMPOTENCY_IN_PROGRESS` | The same key is still being processed |
| 422 | `IDEMPOTENCY_KEY_REUSED` | Same key, different request body or path |
| 422 | `INSUFFICIENT_FUNDS` | The wallet balance is lower than the amount |
| 422 | `INVALID_INVITE_CODE` | No group has this invite code |
| 429 | `RATE_LIMITED` | Too many requests; see `Retry-After` |
| 500 | `INTERNAL_ERROR` | Anything unexpected. The message is always generic. |

### Rate limits (built in Phase 7)
| Endpoint | Limit | Keyed by |
|---|---|---|
| `POST /auth/login` | 5 per 15 minutes | IP + email |
| `POST /auth/register` | 10 per hour | IP |
| All **[idempotent]** endpoints | 30 per minute | user |
| Everything else (signed in) | 300 per minute | user |

---

## 2. Shared types

These TypeScript types are the exact JSON shapes. The frontend should copy them into `src/lib/api/types.ts`.

```ts
type User = {
  id: string;
  fullName: string;
  email: string;
  phone: string;            // "+234..."
  createdAt: string;
};

type Wallet = {
  accountId: string;
  balanceKobo: number;
  currency: "NGN";
};

type LedgerTransactionType =
  | "dev_funding" | "deposit" | "contribution"
  | "payout" | "withdrawal" | "withdrawal_reversal";

type WalletTransaction = {
  id: string;               // ledger entry id (numeric string)
  transactionId: string;    // ledger transaction id (uuid) → link to GET /ledger/transactions/:id
  type: LedgerTransactionType;
  amountKobo: number;       // signed: + money in, − money out of THIS wallet
  balanceAfterKobo: number; // wallet balance right after this entry
  description: string;      // server-written, e.g. "Contribution to Office Ajo, round 3"
  createdAt: string;
};

type GroupStatus = "forming" | "active" | "completed" | "cancelled";
type RoundStatus = "upcoming" | "collecting" | "paid_out";

type PersonRef = { userId: string; fullName: string };

type CurrentRoundSummary = {
  roundNumber: number;
  status: "collecting";
  dueAt: string;
  recipient: PersonRef;
  contributedCount: number;
  totalMembers: number;
  iHaveContributed: boolean;
};

type GroupSummary = {
  id: string;
  name: string;
  description: string | null;
  contributionKobo: number;
  frequency: "weekly" | "monthly";
  maxMembers: number;
  payoutOrder: "join_order" | "random";
  status: GroupStatus;
  inviteCode: string;       // 8 chars, e.g. "K7QM2XPA"; display as "K7QM-2XPA"
  myRole: "admin" | "member";
  memberCount: number;
  potBalanceKobo: number;
  createdAt: string;
  startedAt: string | null;
  currentRound: CurrentRoundSummary | null;  // null unless status = "active"
};

type GroupMember = {
  userId: string;
  fullName: string;
  role: "admin" | "member";
  payoutPosition: number | null;  // 1-based; null while forming
  joinedAt: string;
};

type GroupDetail = GroupSummary & {
  members: GroupMember[];    // ordered by payoutPosition, then joinedAt
  totalRounds: number;       // 0 while forming; = member count once started
};

type Round = {
  roundNumber: number;
  status: RoundStatus;
  dueAt: string;
  paidOutAt: string | null;
  payoutTransactionId: string | null;
  recipient: PersonRef;
  potKobo: number;           // contributionKobo × totalRounds
  contributions: Array<{
    userId: string;
    fullName: string;
    status: "paid" | "pending";
    paidAt: string | null;
    transactionId: string | null;
  }>;                        // one per member, same order as GroupDetail.members
};

type LedgerEntryView = {
  accountId: string;
  accountType: "user_wallet" | "group_pot" | "system";
  label: string;             // "Your wallet" | "Ngozi Eze's wallet" | "Office Ajo pot" | "System: funding source"
  amountKobo: number;        // signed
};

type LedgerTransaction = {
  id: string;
  type: LedgerTransactionType;
  description: string;
  createdAt: string;
  entries: LedgerEntryView[]; // always sum to 0
};

type Deposit = {
  id: string;
  amountKobo: number;
  provider: "fake" | "paystack";
  reference: string;         // e.g. "KOLO-DEP-7F3K9Q2M"
  status: "pending" | "succeeded" | "failed";
  checkoutUrl: string;
  createdAt: string;
  updatedAt: string;
};

type Bank = { code: string; name: string };

type Withdrawal = {
  id: string;
  amountKobo: number;
  bankCode: string;
  bankName: string;
  accountNumberMasked: string;   // "******7890"
  accountName: string;
  status: "pending" | "processing" | "succeeded" | "failed";
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
};

type ActivityType =
  | "member_joined" | "member_left" | "group_started"
  | "contribution_made" | "round_paid_out" | "group_completed" | "reminder_sent";

type Activity = {
  id: string;
  type: ActivityType;
  actor: PersonRef | null;
  message: string;           // server-written, e.g. "Tunde Bakare paid into round 2"
  createdAt: string;
};

type NotificationType =
  | "contribution_due" | "contribution_overdue" | "contribution_received"
  | "payout_received" | "group_started" | "member_joined" | "group_completed"
  | "deposit_succeeded" | "deposit_failed" | "withdrawal_succeeded" | "withdrawal_failed";

type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;       // in-app path, e.g. "/app/groups/<id>"
  readAt: string | null;
  createdAt: string;
};

type Paginated<T> = { data: T[]; nextCursor: string | null };
```

---

## 3. Validation rules

The frontend's Zod schemas must match these exactly. The backend is the final authority.

| Field | Rule |
|---|---|
| `fullName` | Trimmed, 2–80 characters |
| `email` | Valid email, ≤ 254 characters; compared case-insensitively |
| `phone` | Accepts `0XXXXXXXXXX` (11 digits) or `+234XXXXXXXXXX`. Regex after removing spaces: `^(?:\+234\|0)[789][01]\d{8}$`. Stored and returned as `+234…`. |
| `password` | 8–128 characters, at least one letter and one digit |
| group `name` | Trimmed, 3–60 characters |
| group `description` | Optional; trimmed; ≤ 280 characters; empty string becomes `null` |
| `contributionKobo` | Integer, 100,000–100,000,000 (₦1,000–₦1,000,000), multiple of 100 |
| `frequency` | `"weekly"` or `"monthly"` |
| `maxMembers` | Integer 2–12 |
| `payoutOrder` | `"join_order"` or `"random"` |
| `inviteCode` | Case-insensitive; spaces and `-` are ignored; must be 8 characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` after cleaning |
| deposit `amountKobo` | Integer, 10,000–50,000,000 (₦100–₦500,000) |
| withdrawal `amountKobo` | Integer, 10,000–50,000,000 (₦100–₦500,000), and ≤ wallet balance |
| dev fund `amountKobo` | Integer, 100–100,000,000 (₦1–₦1,000,000) |
| `bankCode` | One of the codes from `GET /banks` |
| `accountNumber` | Exactly 10 digits |
| `accountName` | Trimmed, 3–100 characters |
| `limit` | Integer 1–100 |

---

## 4. Endpoints

### Health
| Method | Path | Auth | Phase |
|---|---|---|---|
| GET | `/health` | public | 0 ✅ |

`200 { "status": "ok", "db": "up", "uptimeSeconds": 123 }`. Returns `503 { "status": "degraded", "db": "down", "uptimeSeconds": 123 }` if Postgres can't be reached.

---

### Auth
| Method | Path | Auth | Phase |
|---|---|---|---|
| POST | `/auth/register` | public | 2 |
| POST | `/auth/login` | public | 2 |
| POST | `/auth/refresh` | public (cookie) | 2 |
| POST | `/auth/logout` | public (cookie) | 2 |
| POST | `/auth/logout-all` | bearer | 2 |
| GET | `/me` | bearer | 2 |
| PATCH | `/me` | bearer | 2 |
| POST | `/me/password` | bearer | 2 |

**Tokens**
- **Access token:** a JWT (HS256) valid for **15 minutes**, with payload `{ sub: userId, iat, exp }`. The client keeps it **in memory only** (never localStorage) and sends it as `Authorization: Bearer …`.
- **Refresh token:** an opaque random string in a cookie named **`kolo_rt`** with `HttpOnly; SameSite=Strict; Path=/api/v1/auth; Max-Age=2592000` (30 days), plus `Secure` in production. JavaScript can't read it. It's **rotated** on every `/auth/refresh`. Re-using an old refresh token revokes every session from that login and returns `REFRESH_TOKEN_INVALID`.

**`POST /auth/register`**
Request:
```json
{ "fullName": "Chiamaka Okafor", "email": "chiamaka@example.com", "phone": "08031234567", "password": "ajo2026safe" }
```
→ `201 { "user": User, "accessToken": "eyJ..." }`, and sets the `kolo_rt` cookie. Also creates the user's wallet with balance 0.
Errors: `VALIDATION_ERROR`, `EMAIL_TAKEN`, `PHONE_TAKEN`, `RATE_LIMITED`.

**`POST /auth/login`**
Request: `{ "email": "...", "password": "..." }` → `200 { "user": User, "accessToken": "..." }`, and sets the cookie.
Errors: `VALIDATION_ERROR`, `INVALID_CREDENTIALS`, `RATE_LIMITED`.

**`POST /auth/refresh`**
No body. → `200 { "user": User, "accessToken": "..." }`, and sets a new cookie. Errors: `REFRESH_TOKEN_INVALID`.
*The frontend calls this on app start to restore a session, and whenever a request returns `UNAUTHENTICATED`.*

**`POST /auth/logout`** → `204`. Revokes the current refresh token and clears the cookie. Always succeeds, even with no cookie.

**`POST /auth/logout-all`** → `204`. Revokes all the user's refresh tokens and clears the cookie.

**`GET /me`** → `200 User`.

**`PATCH /me`**
Request: `{ "fullName"?: string, "phone"?: string }` (at least one field) → `200 User`. Errors: `VALIDATION_ERROR`, `PHONE_TAKEN`.

**`POST /me/password`**
Request: `{ "currentPassword": "...", "newPassword": "..." }` → `204`. Revokes all *other* sessions.
Errors: `VALIDATION_ERROR`, `INVALID_CREDENTIALS` (wrong current password).

---

### Groups
| Method | Path | Auth | Phase |
|---|---|---|---|
| POST | `/groups` | bearer | 3 |
| GET | `/groups` | bearer | 3 |
| GET | `/groups/:groupId` | bearer, member | 3 |
| POST | `/groups/join` | bearer | 3 |
| POST | `/groups/:groupId/leave` | bearer, member (not admin) | 3 |
| POST | `/groups/:groupId/cancel` | bearer, admin | 3 |
| POST | `/groups/:groupId/start` | bearer, admin | 3 |
| GET | `/groups/:groupId/rounds` | bearer, member | 3 |
| POST | `/groups/:groupId/rounds/:roundNumber/contribute` | bearer, member, **[idempotent]** | 4 |
| GET | `/groups/:groupId/activity` | bearer, member | 8 |

**`POST /groups`**
Request:
```json
{
  "name": "Office Ajo",
  "description": "Finance team weekly savings",
  "contributionKobo": 1000000,
  "frequency": "weekly",
  "maxMembers": 6,
  "payoutOrder": "join_order"
}
```
→ `201 GroupDetail`. The creator becomes `admin`. The group starts as `forming` with a new `inviteCode` and its own pot account.

**`GET /groups`** → `200 { "data": GroupSummary[] }`, not paginated. Sorted:
1. `active` first, by `currentRound.dueAt` ascending
2. then `forming`, newest first
3. then `completed`, then `cancelled`, newest first.

**`GET /groups/:groupId`** → `200 GroupDetail`. Non-members get `NOT_FOUND`.

**`POST /groups/join`**
Request: `{ "inviteCode": "k7qm-2xpa" }` → `200 GroupDetail`.
Errors: `VALIDATION_ERROR`, `INVALID_INVITE_CODE`, `ALREADY_MEMBER`, `GROUP_FULL`, `GROUP_NOT_FORMING`.

**`POST /groups/:groupId/leave`** → `204`. Errors: `GROUP_NOT_FORMING`, `ADMIN_CANNOT_LEAVE`.

**`POST /groups/:groupId/cancel`** → `200 GroupDetail` (status `cancelled`). Errors: `FORBIDDEN`, `GROUP_NOT_FORMING`.

**`POST /groups/:groupId/start`** → `200 GroupDetail`. Errors: `FORBIDDEN`, `GROUP_NOT_FORMING`, `NOT_ENOUGH_MEMBERS`.

What starting does, in one transaction:
1. `payoutPosition` is assigned 1..N. With `join_order` it follows `joinedAt` ascending (the admin is first). With `random` it's a cryptographically random shuffle.
2. N rounds are created (N = the member count *now*). Round *k*'s recipient is the member at position *k*.
3. Due dates use `startedAt = now()`:
   - weekly: round *k* is due at `startedAt + 7·k days`
   - monthly: round *k* is due at `startedAt + k calendar months`.
4. Round 1 becomes `collecting`; the rest are `upcoming`. The group status becomes `active`.

**`GET /groups/:groupId/rounds`** → `200 { "data": Round[] }`, ordered by `roundNumber`. Returns `[]` while forming.

**`POST /groups/:groupId/rounds/:roundNumber/contribute`** **[idempotent]**
No body. The amount is always the group's `contributionKobo`; the client never sends it.
→ `201`
```json
{
  "contribution": { "id": "...", "roundNumber": 3, "amountKobo": 1000000, "transactionId": "...", "createdAt": "..." },
  "roundPaidOut": false,
  "wallet": { "accountId": "...", "balanceKobo": 7500000, "currency": "NGN" }
}
```
Errors: `IDEMPOTENCY_KEY_MISSING`, `GROUP_NOT_ACTIVE`, `ROUND_NOT_COLLECTING`, `ALREADY_CONTRIBUTED`, `INSUFFICIENT_FUNDS`, `NOT_FOUND`.

Rules:
- Every member pays every round, **including that round's recipient** (that's how ajo works).
- Members can pay any time while the round is `collecting`, before or after `dueAt`.
- **When the last member pays**, in the same transaction:
  - the whole pot moves to the recipient's wallet (a `payout` ledger transaction)
  - the round becomes `paid_out`
  - the next round becomes `collecting`, or, if that was the last round, the group becomes `completed`.
  - `roundPaidOut` is then `true`.
- A late round doesn't shift later due dates.

**`GET /groups/:groupId/activity`** → `200 Paginated<Activity>`, newest first.

---

### Wallet and ledger
| Method | Path | Auth | Phase |
|---|---|---|---|
| GET | `/wallet` | bearer | 4 |
| GET | `/wallet/transactions` | bearer | 4 |
| GET | `/ledger/transactions/:transactionId` | bearer | 4 |
| GET | `/banks` | bearer | 6 |
| POST | `/wallet/deposits` | bearer, **[idempotent]** | 6 |
| GET | `/wallet/deposits/:depositId` | bearer | 6 |
| POST | `/wallet/withdrawals` | bearer, **[idempotent]** | 6 |
| GET | `/wallet/withdrawals` | bearer | 6 |
| GET | `/wallet/withdrawals/:withdrawalId` | bearer | 6 |

**`GET /wallet`** → `200 Wallet`.

**`GET /wallet/transactions?limit=&cursor=`** → `200 Paginated<WalletTransaction>`, newest first.

**`GET /ledger/transactions/:transactionId`** → `200 LedgerTransaction`. The caller can see it only if one of its entries is their own wallet, or the pot of a group they belong to. Otherwise `NOT_FOUND`.

Label rules for `LedgerEntryView.label`:
- the caller's own wallet: `"Your wallet"`
- someone else's wallet: `"<fullName>'s wallet"`
- a group pot: `"<group name> pot"`
- system accounts:
  - `funding_source` → `"System: funding source"`
  - `withdrawals_clearing` → `"System: withdrawals in progress"`
  - `payouts_sink` → `"System: paid out to bank"`

**`GET /banks`** → `200 { "data": Bank[] }`. A fixed list, sorted by name:
```json
[
  { "code": "044",    "name": "Access Bank" },
  { "code": "011",    "name": "First Bank of Nigeria" },
  { "code": "058",    "name": "Guaranty Trust Bank" },
  { "code": "50211",  "name": "Kuda Microfinance Bank" },
  { "code": "50515",  "name": "Moniepoint Microfinance Bank" },
  { "code": "999992", "name": "OPay" },
  { "code": "033",    "name": "United Bank for Africa" },
  { "code": "057",    "name": "Zenith Bank" }
]
```

**`POST /wallet/deposits`** **[idempotent]**
Request: `{ "amountKobo": 2000000 }` → `201 Deposit` (status `pending`).
- With the **fake** provider, `checkoutUrl` is `http://localhost:5173/dev/fake-checkout?reference=<reference>`.
- With **Paystack**, it's Paystack's hosted checkout. Its callback returns the user to `http://localhost:5173/app/wallet?deposit=<depositId>`.

**`GET /wallet/deposits/:depositId`** → `200 Deposit`. The frontend polls this after checkout.

**`POST /wallet/withdrawals`** **[idempotent]**
Request:
```json
{ "amountKobo": 2000000, "bankCode": "058", "accountNumber": "0123456789", "accountName": "Chiamaka Okafor" }
```
→ `202 Withdrawal` (status `pending`). The money leaves the wallet **immediately** (it's held in `withdrawals_clearing`).
Errors: `VALIDATION_ERROR`, `INSUFFICIENT_FUNDS`, `IDEMPOTENCY_KEY_MISSING`.

The withdrawal then moves on its own: `pending` → `processing` → `succeeded` or `failed`, typically within 3–10 seconds.
- On `failed`, the money returns to the wallet (a `withdrawal_reversal` transaction) and `failureReason` is set.
- **Test rule:** account numbers ending in `0000` always fail, with `failureReason: "The bank rejected this account number."`.

**`GET /wallet/withdrawals?limit=&cursor=`** → `200 Paginated<Withdrawal>`, newest first.
**`GET /wallet/withdrawals/:withdrawalId`** → `200 Withdrawal`.

---

### Notifications
| Method | Path | Auth | Phase |
|---|---|---|---|
| GET | `/notifications?limit=&cursor=` | bearer | 8 |
| GET | `/notifications/unread-count` | bearer | 8 |
| POST | `/notifications/:notificationId/read` | bearer | 8 |
| POST | `/notifications/read-all` | bearer | 8 |

- `GET /notifications` → `200 Paginated<Notification>`, newest first.
- `GET /notifications/unread-count` → `200 { "count": 3 }`.
- `POST /notifications/:id/read` → `200 Notification`. Calling it again on an already-read notification changes nothing.
- `POST /notifications/read-all` → `204`.

---

### Webhooks (server-to-server; the frontend never calls these)
| Method | Path | Auth | Phase |
|---|---|---|---|
| POST | `/webhooks/paystack` | `x-paystack-signature` HMAC | 6 |
| POST | `/webhooks/fake` | `x-kolo-signature` HMAC | 6 |

Each one:
- verifies the signature against the **raw** body
- deduplicates by event id
- returns `200` quickly, even for duplicates, and `401` for a bad signature.

---

### Dev-only endpoints
These exist only when `NODE_ENV=development`; in any other environment they return `404`. They let one person test group flows alone.

| Method | Path | Auth | Phase |
|---|---|---|---|
| POST | `/dev/fund-wallet` | bearer, **[idempotent]** | 4 |
| POST | `/dev/groups/:groupId/fake-members` | bearer, admin | 3 |
| POST | `/dev/groups/:groupId/fake-contributions` | bearer, member | 4 |
| POST | `/dev/fake-provider/complete` | bearer | 6 |
| POST | `/dev/jobs/run-due-rounds` | bearer | 7 |

- **`POST /dev/fund-wallet`**: request `{ "amountKobo": 5000000 }` → `201 { "transactionId": "...", "wallet": Wallet }`. Creates a `dev_funding` transaction (funding source → wallet).
- **`POST /dev/groups/:groupId/fake-members`**: request `{ "count": 3 }` (1–11, and never past `maxMembers`).
  - Creates fake users with realistic Nigerian names and emails `fake+<random>@kolo.test`, each with a wallet, and joins them to the group.
  - → `200 GroupDetail`. Errors: `GROUP_NOT_FORMING`, `GROUP_FULL`, `FORBIDDEN`.
- **`POST /dev/groups/:groupId/fake-contributions`**: no body.
  - For the current `collecting` round, every **fake** member who hasn't paid gets their wallet dev-funded, then contributes. It goes through the exact same contribution code path, so a payout can happen.
  - → `200 { "contributed": 4, "roundPaidOut": false }`. Real users are never touched.
- **`POST /dev/fake-provider/complete`**: request `{ "reference": "KOLO-DEP-7F3K9Q2M", "outcome": "success" | "failed" }` → `200 { "depositId": "..." }`. Makes the fake provider send its webhook.
- **`POST /dev/jobs/run-due-rounds`**: no body. Runs the due-rounds job immediately (rules below) → `200 { "roundsChecked": 2, "remindersSent": 3, "autoContributions": 1, "overdueNotices": 1 }`.

---

## 5. Background job rules (Phase 7)

The **`due-rounds`** job runs every minute. For each round that is `collecting`:
1. **Reminder:** if `dueAt` is within the next 24 hours, each member who hasn't paid gets one `contribution_due` notification. Send it once per member per round.
2. **Auto-pay:** if `dueAt` has passed, each unpaid member whose wallet balance ≥ `contributionKobo` is contributed automatically, through the normal contribution path. (The unique constraint makes this safe if two jobs overlap.)
3. **Overdue:** if `dueAt` has passed and a member still can't pay, they get a `contribution_overdue` notification, at most once every 24 hours per member per round. The group's admin gets one too.
4. If everyone has now paid, the payout happens as described under "contribute".

## 6. Status machines

```
Group:       forming ──start──▶ active ──last round paid out──▶ completed
             forming ──cancel─▶ cancelled

Round:       upcoming ──previous round paid out──▶ collecting ──all paid──▶ paid_out
             (round 1 starts as collecting)

Deposit:     pending ──webhook success──▶ succeeded
             pending ──webhook failed───▶ failed

Withdrawal:  pending ──▶ processing ──▶ succeeded
                                    └─▶ failed (money returned)
```
No other transitions are allowed.
