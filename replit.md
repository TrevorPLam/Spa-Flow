# SpaFlow

A full-stack spa management system for front-desk staff — handles client check-in, locker/room assignment, memberships, waitlists, product inventory, payments, and audit logging.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `ENCRYPTION_KEY`, `JWT_SECRET`, `TAX_RATE=0.08875`

## Seed / Default accounts

After running `pnpm --filter @workspace/db run push`, seed via:
```bash
node --input-type=module < /tmp/seed.mjs
```
(see the seed script in the previous session for the full contents)

Default accounts:
- `admin@spaflow.com` / `SpaFlow2024!` — MANAGER role
- `staff@spaflow.com` / `Staff2024!` — STAFF role

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + pino logging + cookie-parser
- DB: PostgreSQL + Drizzle ORM
- Auth: JWT in HttpOnly cookies (jose), bcrypt password hashing
- Encryption: AES-256-GCM envelope encryption for PII fields (dob, address, documentNumber)
- Payments: Square SDK (mock mode — tokens starting `SQUARE_MOCK_TOKEN_` skip processing)
- SMS: Twilio (mock mode when env vars absent)
- Cron: node-cron background jobs (auto-release expired sessions, SMS reminders)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec → React Query hooks + Zod schemas)
- Frontend: React + Vite + TanStack Query + wouter + shadcn/ui + Tailwind v4
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for API contract
- `lib/api-client-react/src/generated/` — generated hooks and schemas (do not edit)
- `lib/db/src/schema/` — Drizzle table definitions (users, clients, memberships, lockers, rooms, rental_sessions, waitlist, products, transactions, audit_logs)
- `artifacts/api-server/src/routes/` — Express route handlers (one file per resource)
- `artifacts/api-server/src/lib/` — auth, encryption, pricing, audit, square, sms utilities
- `artifacts/api-server/src/jobs/cron.ts` — background jobs
- `artifacts/spaflow/src/pages/` — all frontend pages
- `artifacts/spaflow/src/contexts/AuthContext.tsx` — auth state (JWT cookie-based)
- `artifacts/spaflow/src/index.css` — Tailwind theme (eucalyptus/forest green spa palette)

## Architecture decisions

- **Envelope encryption**: PII is AES-256-GCM encrypted with a per-field data key, itself encrypted with the master `ENCRYPTION_KEY`. Only MANAGER-role users see decrypted PII.
- **Square mock mode**: Any payment token starting with `SQUARE_MOCK_TOKEN_` is accepted without calling Square, enabling full development without live credentials.
- **Contract-first API**: The OpenAPI spec is the single source of truth. All hooks, Zod schemas, and validation are generated from it — never written by hand.
- **RBAC**: Two roles — STAFF (full check-in, clients, resources) and MANAGER (additionally: staff management, audit logs, PII decryption). Enforced server-side on every route.
- **6-hour locker / 1-hour room sessions**: Cron job runs every minute to auto-release expired rentals and advance the waitlist.

## Product

- **Check-in flow**: Search client → select locker or private room → calculate price (with birthday/age/membership rules) → charge card → assign resource
- **Locker grid**: Visual 167-locker grid (L1–L167) color-coded by status; click occupied to release/renew/extend
- **Room grid**: 38 private rooms (R1–R38) with same controls
- **Waitlist**: Queue for private rooms with 15-minute hold window; SMS notification on assignment
- **Clients**: Search/filter, encrypted PII profile, transaction history, active rentals
- **Products**: Inventory management (MANAGER only for create/delete)
- **Transactions**: Full ledger with type, amount, tax, total
- **Staff**: User management (MANAGER only)
- **Audit logs**: Immutable record of all actions (MANAGER only)

## User preferences

- Mock mode for Square and Twilio — development works without live credentials
- TAX_RATE env var controls tax rate (default 8.875% for NYC)

## Gotchas

- Run `pnpm --filter @workspace/db run typecheck:libs` before api-server typecheck (lib/db must be built first)
- `src/lib/auth.tsx` re-exports from `contexts/AuthContext.tsx` — do not add logic to it
- Seed lockers/rooms/users via the ESM seed script (pnpm scripts package has native addon issues with bcrypt)
- Square tokens must start with `SQUARE_MOCK_TOKEN_` in mock mode; any other token hits the real Square API
- The `BASE_URL` env var is set by the workflow — never hardcode it

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
