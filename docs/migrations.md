# Database Migrations

This document describes the migration process for SpaFlow using Drizzle ORM and Drizzle Kit.

## Overview

SpaFlow uses Drizzle ORM with a codebase-first approach. The TypeScript schema files in `lib/db/src/schema/` are the source of truth for the database schema. Migrations are generated from these schema changes and applied to the database.

## Prerequisites

- Node.js 20+
- pnpm package manager
- PostgreSQL database with `DATABASE_URL` environment variable set
- Database connection permissions to create/modify tables

## Migration Commands

All migration commands should be run from the `lib/db` directory:

```bash
cd lib/db
```

### Generate Migration

Generate a new migration file based on schema changes:

```bash
pnpm migrate:generate
```

This command:
- Compares the current schema in `lib/db/src/schema/` with the existing migrations
- Creates a new SQL migration file in `lib/db/drizzle/`
- Names the migration with a timestamp (e.g., `0001_wonderful_capybara.sql`)

**Important:** Review the generated SQL file before applying it to ensure the changes are correct.

### Apply Migration

Apply pending migrations to the database:

```bash
pnpm migrate:apply
```

This command:
- Checks the `drizzle` table in the database to see which migrations have been applied
- Applies any pending migrations in order
- Updates the `drizzle` table to track applied migrations

### Rollback Migration

Rollback the last applied migration:

```bash
pnpm migrate:rollback
```

**Note:** Rollback functionality requires creating custom rollback SQL files (`.down.sql`). Drizzle Kit does not automatically generate rollback files. You must manually create a `.down.sql` file for each migration that needs rollback capability.

## Development Workflow

### 1. Make Schema Changes

Edit the schema files in `lib/db/src/schema/`:

```typescript
// Example: Adding a new column
export const users = pgTable("users", {
  id: serial().primaryKey(),
  name: text(),
  email: text().unique(),
  // New column
  phone: text(),
});
```

### 2. Generate Migration

```bash
cd lib/db
pnpm migrate:generate
```

### 3. Review Generated SQL

Open the generated migration file in `lib/db/drizzle/` and review the SQL:

```sql
-- Example generated migration
ALTER TABLE "users" ADD COLUMN "phone" text;
```

### 4. Apply Migration

```bash
pnpm migrate:apply
```

### 5. Update TypeScript Types

If you added new columns or tables, regenerate types if needed:

```bash
pnpm --filter @workspace/db run typecheck
```

## Production Workflow

### 1. Test Migrations Locally

Always test migrations on a local or staging database before applying to production:

```bash
# Use a staging DATABASE_URL
export DATABASE_URL=postgresql://user:password@staging-host:5432/dbname
pnpm migrate:apply
```

### 2. Backup Database

Before applying migrations to production, create a database backup:

```bash
pg_dump dbname > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 3. Apply Migration

```bash
export DATABASE_URL=postgresql://user:password@production-host:5432/dbname
pnpm migrate:apply
```

### 4. Verify

Check that the application works correctly with the new schema.

## Troubleshooting

### Migration Conflicts

If you get a conflict error during migration:

```bash
# Force apply (use with caution)
pnpm migrate:apply --ignore-conflicts
```

**Warning:** Only use `--ignore-conflicts` if you understand the implications and have verified the database state.

### Migration Already Applied

If a migration was already applied but Drizzle doesn't know about it:

1. Check the `drizzle` table in your database
2. Manually insert the migration record if needed:

```sql
INSERT INTO drizzle (hash, created_at) VALUES ('migration_hash', NOW());
```

### Database Connection Errors

If you get database connection errors:

1. Verify `DATABASE_URL` is set correctly
2. Check database server is running
3. Verify network connectivity
4. Check database user permissions

### Schema Mismatch

If the database schema doesn't match the TypeScript schema:

1. Review recent migration files
2. Check if a migration was applied manually
3. Consider using `drizzle-kit push` for development (not recommended for production)

```bash
# Development only - pushes schema directly without migration file
pnpm push
```

## Rules to Follow

1. **Never modify applied migrations** - Once a migration is applied to production, never modify the migration file
2. **Review generated SQL** - Always review the generated SQL before applying
3. **Test on staging** - Always test migrations on a staging environment first
4. **Backup before production** - Always create a backup before applying migrations to production
5. **One change per migration** - Keep migrations focused on a single schema change for easier rollback
6. **Version control migrations** - All migration files should be committed to git
7. **Use transactions** - Drizzle automatically wraps migrations in transactions

## Anti-Patterns

- **Manual schema changes** - Never manually modify the database schema outside of migrations
- **Modifying applied migrations** - Never edit a migration file that has already been applied
- **Skipping staging** - Never apply migrations directly to production without testing
- **Large migrations** - Avoid migrations that change too many things at once
- **No backups** - Never apply migrations without a recent backup

## CI/CD Integration

The CI workflow (`.github/workflows/ci.yml`) automatically:
- Type checks all TypeScript code
- Builds all packages
- Ensures schema changes don't break the build

Migrations are not automatically applied in CI to prevent accidental database modifications.

## Additional Resources

- [Drizzle ORM Migrations Documentation](https://orm.drizzle.team/docs/migrations)
- [Drizzle Kit CLI Documentation](https://orm.drizzle.team/docs/drizzle-kit-migrate)
- [PostgreSQL Migration Best Practices](https://www.postgresql.org/docs/current/sql-createtable.html)
