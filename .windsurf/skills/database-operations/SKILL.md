---
name: database-operations
description: Managing database schema, queries, migrations, and connection pooling using Drizzle ORM with PostgreSQL
---

# Database Operations (Drizzle ORM & PostgreSQL)

This skill covers managing database operations in the Spa-Flow repository using Drizzle ORM with PostgreSQL.

## Key Concepts

### Schema Definition Patterns
- All schemas live in `lib/db/src/schema/`
- Use `pgTable` for table definitions
- Prefer identity columns over serial types (PostgreSQL 2026 recommendation)
- Define enum types for status fields
- Include `createdAt` and `updatedAt` timestamps with `default: sql`now()``
- Set explicit `ON DELETE` rules on foreign keys
- Add indexes for query performance optimization

### Connection Pooling Configuration
The repository uses PostgreSQL connection pooling with these settings:
- `DB_POOL_MAX`: Maximum connections (default: 20)
- `DB_POOL_IDLE_TIMEOUT_MS`: Idle connection timeout (default: 30000)
- `DB_POOL_CONNECTION_TIMEOUT_MS`: Connection acquisition timeout (default: 5000)
- `DB_STATEMENT_TIMEOUT_MS`: Statement timeout (default: 30000)
- `DB_LOCK_TIMEOUT_MS`: Lock timeout (default: 5000)
- `DB_IDLE_IN_TRANSACTION_TIMEOUT_MS`: Idle in-transaction timeout (default: 60000)

### Transaction Patterns
- Use `db.transaction()` for multi-step operations
- The only intentional raw SQL is `SELECT FOR UPDATE` on rooms in `lib/db/src/rooms.ts` - do not refactor
- Always use parameterized queries (Drizzle handles this automatically)
- Avoid `sql.raw()` with string interpolation - SQL injection risk

### 2026 Best Practices
Based on current Drizzle ORM best practices:

**1. Use Parameterized Queries**
```typescript
// GOOD: Automatic parameterization
await db.select().from(users).where(eq(users.email, userInput));

// GOOD: Parameterized raw SQL
await db.execute(sql`SELECT * FROM users WHERE email = ${userInput}`);

// BAD: SQL injection risk
await db.execute(sql.raw(`SELECT * FROM users WHERE email = '${userInput}'`));
```

**2. Select Specific Columns**
```typescript
// BAD: Loads all columns including sensitive data
const allUsers = await db.select().from(users);

// GOOD: Only what you need
const userList = await db
  .select({ id: users.id, email: users.email })
  .from(users);
```

**3. Index Your Queries**
Add indexes for columns in WHERE, JOIN, and ORDER BY:
```typescript
export const posts = pgTable('posts', {
  // columns...
}, (table) => ({
  authorIdx: index('author_idx').on(table.authorId),
  statusIdx: index('status_idx').on(table.status),
}));
```

**4. Handle Connection Errors**
Implement retry logic for transient failures with exponential backoff.

### Migration Workflow
- **Local Development Only**: Use `pnpm run push` in `lib/db` - syncs schema directly to database
- **Staging/Production**: Generate migrations with `drizzle-kit generate` and apply with `drizzle-kit migrate`
- **Never run `push` against shared databases** - it bypasses migration history and causes schema drift

### PII Encryption Field Patterns
- PII fields (dob, address, documentNumber) use envelope encryption
- AES-256-GCM encryption with KEK/DEK pattern
- KEK stored in environment variable
- DEKs stored alongside ciphertext in database
- Never log or output PII fields in logs or console

### Database Timeout Configuration
All timeouts are configurable via environment variables:
- Statement timeout prevents long-running queries
- Lock timeout prevents deadlocks
- Idle in transaction timeout prevents abandoned transactions

## Key Files
- `lib/db/src/schema/*.ts` - All table definitions
- `lib/db/src/index.ts` - Connection setup
- `lib/db/drizzle.config.ts` - Drizzle configuration
- `lib/db/src/rooms.ts` - Contains the intentional SELECT FOR UPDATE raw SQL

## References
- `AGENTS.md` - Database migration rules
- `docs/migrations.md` - Migration strategy
- `lib/db/AGENTS.md` - Package-specific database rules

## Common Tasks

### Adding a New Table
1. Define schema in `lib/db/src/schema/`
2. Run `cd lib/db && pnpm run push` (local only)
3. Update OpenAPI spec if exposed via API
4. Regenerate API client and Zod schemas
5. Add tests

### Modifying Schema
1. Update schema in `lib/db/src/schema/`
2. For local: `pnpm run push`
3. For staging/production: Generate migration, ask before applying
4. Update dependent code
5. Run tests

### Query Patterns
- Use Drizzle's query builder for type safety
- Leverage relations for joins
- Use `eq()`, `and()`, `or()` for conditions
- Avoid N+1 queries with proper joins
