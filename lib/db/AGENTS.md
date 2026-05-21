# lib/db — DB Schema

**Local:** `push` syncs directly — **never on non‑local** (bypasses migration history).
**Non‑local:** `generate` + `migrate` (ask first, see root A1).
**Rollback:** `migrate:rollback` exists — always generate a migration diff preview and paste it before proceeding (ask first).

- All schema in `src/schema/`. Follow patterns: enums, timestamps, explicit FK `ON DELETE`, indexes.
- **`drizzle-zod`** is available as a dep — use it to generate Zod schemas directly from Drizzle table definitions; do not write them by hand.
- **Query timeouts:** statement 30s, lock 5s, idle in transaction 60s. Avoid long writes.
- **Only raw SQL:** `SELECT FOR UPDATE` on rooms — intentional for atomic assignment; do not refactor without an approved atomic alternative.
- When adding tables: ensure cron jobs (session expiry, waitlist) remain compatible (see root N9).
- When a migration produces a destructive diff (`DROP COLUMN`, `DROP TABLE`, enum removal): generate a preview, paste the full diff, and await explicit approval before applying.
