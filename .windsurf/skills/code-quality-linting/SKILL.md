---
name: code-quality-linting
description: Maintaining code quality with ESLint, Prettier, and type checking across all packages
---

# Code Quality & Linting

This skill covers maintaining code quality in the Spa-Flow repository with ESLint, Prettier, and type checking across all packages.

## Key Concepts

### ESLint Configuration and Rules
- ESLint for linting JavaScript/TypeScript
- Configuration in `.eslintrc.*` files
- Custom rules for project-specific patterns
- Shared configuration across packages
- Extends recommended configs

### Prettier Formatting Configuration
- Prettier for code formatting
- Configuration in `.prettierrc`
- Consistent code style
- Automatic formatting on save
- Integration with ESLint

### TypeScript Strict Mode Enforcement
- Strict mode enabled in all packages
- Configuration in `tsconfig.base.json`
- No implicit any
- Strict null checks
- Strict function types

### Type Checking Workflow
- Type check libs first: `cd lib/* && pnpm run typecheck`
- Then type check artifacts: `cd artifacts/* && pnpm run typecheck`
- Or run across workspace: `pnpm -r run typecheck`
- Type errors block CI
- Fix type errors before committing

### Linting Across All Packages
- Run `pnpm run lint` for all packages
- Run `pnpm --filter <package> run lint` for specific package
- Lint errors block CI
- Fix lint errors before committing
- Auto-fix with `--fix` flag

### Code Formatting Before Commit
- Run `pnpm run format` before committing
- Auto-formats all files
- Consistent style across codebase
- Pre-commit hooks (future)
- Git integration

### Unused Variable Elimination
- ESLint rule for unused variables
- TypeScript strict mode enforcement
- Remove unused imports
- Remove unused variables
- Clean code practice

### Implicit Any Prevention
- TypeScript strict mode
- No implicit any allowed
- Type all variables explicitly
- Use type guards
- Avoid type assertions

### Strict Null Checks
- Strict null checks enabled
- Handle null/undefined explicitly
- Use optional chaining
- Use nullish coalescing
- Type-safe null handling

## Key Files
- `.eslintrc.*` - ESLint configuration
- `.prettierrc` - Prettier configuration
- `tsconfig.base.json` - TypeScript configuration

## References
- `AGENTS.md` - Code quality commands
- `package.json` - Lint and format scripts

## Common Tasks

### Running Linter
```bash
# Lint all packages
pnpm run lint

# Lint specific package
pnpm --filter artifacts/api-server run lint

# Auto-fix linting issues
pnpm run lint --fix
```

### Formatting Code
```bash
# Format all files
pnpm run format

# Format specific package
pnpm --filter artifacts/spaflow run format
```

### Type Checking
```bash
# Type check all packages
pnpm -r run typecheck

# Type check specific package
pnpm --filter lib/db run typecheck
```

### Fixing Linting Issues
```bash
# Auto-fix where possible
pnpm run lint --fix

# Manual fixes for remaining issues
# Review and apply suggestions
```

## Best Practices
- Run lint before committing
- Format code before committing
- Type check before committing
- Fix all linting errors
- Use strict TypeScript mode
