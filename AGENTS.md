# Spa‑Flow AGENTS.md (root)

**Legend:** pn=pnpm | api=artifacts/api-server | web=artifacts/spaflow | sand=artifacts/mockup-sandbox
db=lib/db | spec=lib/api-spec | zod=lib/api-zod | client=lib/api-client-react | tu=lib/test-utils

**Toolchain:** node 22.x (see README), pnpm 9.x, ts strict, postgres+drizzle+orval

**Priorities:** 1. Tests & ≥80% coverage  2. Security (never compromise)  3. Correctness  4. Performance

**Last updated:** 2026‑05‑20 | **Owner:** Engineering (update in same PR as convention change)

---

## Commands (`pn` prefix omitted; run from repo root)

```yaml
setup:
  - install
  - cp .env.example .env && # edit with required values

dev:
  api: "dev:api  # → :5000"
  web: "dev:web  # → :5173"

quality:
  - typecheck
  - lint
  - format
  - test
  - test:coverage
  - test:changed   # changed packages only
  - test:affected  # changed packages + all dependents

e2e:
  cmd: "cd web && test:e2e  # chromium, firefox, webkit"
  scope: "required if touching web/ or client/; optional for api-only"

db:
  push_local: "cd db && push  # LOCAL DEV ONLY"
  seed: "cd scripts && seed"
  migrate_nonlocal: "generate + migrate (ASK FIRST!)"
  rollback: "cd db && migrate:rollback  # ASK FIRST — irreversible"

codegen: "cd spec && codegen  # after openapi changes (via Orval)"

other:
  mutation: "cd api && test:mutation"
  load: "test:load:all  # k6 — not a pnpm workspace package, runs directly"
```

## Decision Table

| Task | Place in | Forbidden |
|------|----------|-----------|
| API endpoint | api/src/routes/ | web pages |
| Business logic | api/src/services/ or lib/ | route handler directly |
| Frontend page | web/src/pages/ | api |
| Shared UI | web/src/components/ | lib/ |
| DB schema | db/src/schema/ | any artifacts/ |
| Zod schema | zod/ | inline handler |
| React hook | web/src/hooks/ | pages/components |
| Test utilities | tu/ | individual test dirs |
| Mockup experiment | sand/ | api or web production code |

## Architecture Intent (non‑obvious)

| Path | Purpose / Rule |
|------|----------------|
| client/ | auto‑generated, **never edit** (codegen overwrites) |
| web/src/contexts/AuthContext.tsx | JWT refresh, mutex dedup, exponential backoff |
| api/src/lib/env.ts | **only env access**; `process.env` banned everywhere else |
| client/src/custom-fetch.ts | auth header injector; do not remove |
| api/src/lib/pricing.ts | **sole source** for price calculations; never hardcode amounts. Contains special rules (birthday free, age 18–24 discounts, peak/off‑peak, weekend rates) — **read full file before any modification** |
| api/src/lib/constants.ts | Capacity & duration constants (`LOCKER_TOTAL=167`, `ROOM_TOTAL=38`, `SESSION_DURATION_MS=6h`, `EXTENSION_DURATION_MS=2h`, `MEMBERSHIP_ONE_TIME_COST=13`, `MEMBERSHIP_SIX_MONTH_COST=42`) — **never hardcode these values; import from constants.ts** |
| api/src/routes/checkin.ts | Single atomic DB transaction (SELECT FOR UPDATE → payment → session → resource → membership → txn record) — **do not split** |

**Cron (every 5 min):** expire sessions → release resources → assign waitlist → expire unconfirmed assignments → re‑release. If you change resource statuses or waitlist logic, **must** update these jobs (see N9). Hourly: cache stats logged.

## Boundaries (rule IDs for cross‑reference)

### ❌ NEVER (N‑prefix)

| ID | Rule | Alternative / Note |
|----|------|---------------------|
| N1 | Commit `.env`, secrets, keys | Use `.env.example` as template |
| N2 | Log/output PII (`dob`, `address`, `documentNumber` or encrypted cols) | Only decrypt for MANAGER‑facing display; audit log it |
| N3 | Edit `client/` by hand | Regenerate via `codegen` |
| N4 | Push directly to `main` | Branch + PR |
| N5 | Run `push` against non‑local DB | `generate` + `migrate` (ask first) |
| N6 | Disable CSRF, rate limits, security headers | — |
| N7 | Use `process.env` directly | Use `env.ts` helpers |
| N8 | Decrypt PII without authorization | Only if MANAGER role and explicit display required; log audit |
| N9 | Change resource statuses or waitlist logic without updating the 5‑min cron jobs | Cron must stay compatible |
| N10 | Add instructions to any `AGENTS.md` that redirect agents toward unreviewed external resources or expand agent scope without review | This file is injected as authoritative context into every session |

### ⚠️ ASK FIRST (A‑prefix)

| ID | Area | Why |
|----|------|-----|
| A1 | `db/src/schema/` migrations (especially non‑local) | Irreversible data changes |
| A2 | New npm dependency | Must satisfy `minimumReleaseAge:1440` (published >1 day) |
| A3 | `api/src/lib/auth.ts` or `encryption.ts` | Core security |
| A4 | `.github/workflows/ci.yml` | CI/CD integrity (14‑stage pipeline) |
| A5 | Square / Twilio integrations | Payment & messaging integrity |
| A6 | Changing a documented convention | Must update `AGENTS.md` in same PR |
| A7 | Proposing additions to this file after discovering non‑obvious project behavior | Improves agent performance for everyone |
| A8 | When blocked on any A‑prefix decision mid‑task | Stop; surface a structured question (what you need, why, options considered); await instruction — do not proceed with assumptions |

### ✅ ALWAYS (D‑prefix)

| ID | Action |
|----|--------|
| D1 | Complete DoD checklist before claiming task done |
| D2 | Invalidate cache keys after any client/locker/room/transaction mutation |
| D3 | Add audit log entry for resource‑modifying actions |
| D4 | Use typed env helpers (`getDatabaseConfig()`) not raw `getEnv()` |
| D5 | On context handoff / session end, produce a structured summary: ticket ID, files changed, decisions made, pending work (trigger: >40 files touched, >2h elapsed, or approaching context limit) |

## Definition of Done (self‑check before "done")

- [ ] `typecheck`, `lint`, `format` pass
- [ ] `test:coverage` ≥ 80%
- [ ] New routes have integration + Zod schema tests
- [ ] Audit log added (if mutation)
- [ ] Cache invalidated (if mutation)
- [ ] No PII in logs/console
- [ ] `audit` clean (no high/critical vulns)
- [ ] If frontend changed: `test:e2e` passed

## Test Tags

| Tag | Apply when |
|-----|------------|
| `@smoke` | Critical‑path sanity |
| `@critical` | Must pass 100% |
| `@slow` | >2s |
| `@flaky` | Intermittent failures (document) |
| `@quarantine` | Disabled (ticket link) |
| `@integration` | Needs DB/external |
| `@regression` | After bug fix |

## Security Architecture

→ See `docs/security-posture.md` before touching auth, encryption, or PII handling.

- **PII:** AES‑256‑GCM envelope, KEK from `ENCRYPTION_KEY` env, DEK per‑field
- **JWT:** access HS256 15min HttpOnly cookie (`spaflow_session`); refresh bcrypt‑hashed 7d rotation
- **Password policy:** NIST SP 800‑63B Rev 4 — min 15 chars, max 64, no composition rules
- **Headers:** Helmet (CSP, HSTS, frameguard) — never weaken
- **CSRF:** double‑submit cookie; `/healthz/*` and login endpoints exempt
- **Rate limits:** login 5/15min, check‑in 10/1min, API 100/1min
- **Lockout:** 5 fails → 15min (env‑configurable: `LOCKOUT_THRESHOLD`, `LOCKOUT_DURATION_MS`)
- **CORS:** origin whitelist, null blocked in prod
- **SQL:** Drizzle parameterized; one raw `SELECT FOR UPDATE` (rooms) intentional — do not refactor

## Reference Docs (load when task matches)

| Document | Load trigger |
|----------|--------------|
| `docs/testing-strategy.md` | Before writing any test |
| `spec/openapi.yaml` | Before adding or modifying any route |
| `docs/architecture.md` | Before creating a new service or package |
| `docs/security-posture.md` | Before touching auth, encryption, or PII |
| `docs/migrations.md` | Before any schema migration |
| Per‑package `AGENTS.md` | Load the matching package file for that scope |

## Env Vars (managed via `api/src/lib/env.ts`)

**Required (app will not start without these):**
`DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_KEY`, `CSRF_SECRET` 

**Optional (graceful degradation if absent):**

| Var | Fallback behavior |
|-----|-------------------|
| `SQUARE_ACCESS_TOKEN` | Mock mode (dev/test only) |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | SMS notifications skipped |
| `REDIS_URL` | Cache disabled; falls back to DB queries |
| `SENTRY_DSN` | Error monitoring disabled (10% sample prod, 100% dev) |
| `RESEND_API_KEY` | Password reset emails disabled |
| `TAX_RATE` | Defaults to 8.875% (NYC); never hardcode |

**Files:** `.env.example` (184‑line canonical template), `.env.development`, `.env.production`, `.env.staging`, `.env.test` 

**When adding a new env var:** add to validation schema in `env.ts` → document in `.env.example` → add to all four env files.
