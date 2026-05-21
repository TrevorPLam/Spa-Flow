---
name: monorepo-management
description: Working with pnpm workspaces, catalog dependencies, and package interdependencies
---

# Monorepo Management

This skill covers working with pnpm workspaces, catalog dependencies, and package interdependencies in the Spa-Flow monorepo.

## Key Concepts

### pnpm Workspace Configuration
- Defined in `pnpm-workspace.yaml`
- Lists all workspace packages
- Defines catalog dependencies
- Configures package-specific settings
- Enables workspace-aware commands

### Catalog Dependencies
- Centralized dependency management
- Version consistency across packages
- Defined in pnpm-workspace.yaml
- Referenced as `catalog:dependency-name`
- Reduces version conflicts

### Package Interdependency Graph
- lib packages have no dependencies on artifacts
- artifacts depend on lib packages
- api-server depends on db, api-spec, api-zod
- spaflow depends on api-client-react
- Clear dependency hierarchy

### Workspace-Aware Module Resolution
- Import packages by workspace name
- TypeScript path aliases configured
- No relative imports between packages
- Clean import statements
- Type-safe cross-package references

### Incremental Testing with --filter
- `pnpm --filter <package> run test`
- Test only changed packages
- Test affected packages and dependents
- Faster feedback for large codebases
- Reduces CI runtime

### Building Packages in Dependency Order
- Build lib packages first
- Then build artifacts
- pnpm handles dependency order
- Use `pnpm -r run build`
- Or build specific packages

### Shared Type Configuration
- `tsconfig.base.json` for shared config
- Extends by all packages
- Strict mode enabled
- Path aliases defined
- Consistent compiler options

### Preinstall Script
- Enforces pnpm usage
- Prevents npm/yarn usage
- Checks for correct package manager
- Fails fast on wrong manager
- Ensures consistent installs

### Lockfile Management
- Single pnpm-lock.yaml for workspace
- Shared across all packages
- Commit to version control
- Ensures consistent installs
- Security audit applies to all

### Platform-Specific Dependency Exclusions
- Linux-only optimization in CI
- Excludes Windows/macOS-specific packages
- Configured in pnpm-workspace.yaml
- Reduces dependency installation time
- Supply chain security measure

## Key Files
- `pnpm-workspace.yaml` - Workspace configuration
- `package.json` (root) - Workspace scripts
- `tsconfig.base.json` - Shared TypeScript config

## References
- `README.md` - Workspace architecture
- `ANALYSIS.md` - Package graph details

## Common Tasks

### Installing Dependencies
```bash
# Install all workspace dependencies
pnpm install

# Install specific package dependency
pnpm --filter artifacts/api-server add lodash
```

### Running Commands Across Workspace
```bash
# Run command in all packages
pnpm -r run test

# Run command in specific package
pnpm --filter artifacts/api-server run dev

# Run command in package and dependents
pnpm --filter ... --filter-dependents run test
```

### Adding a New Package
1. Create package directory
2. Add package.json
3. Add to pnpm-workspace.yaml
4. Install dependencies
5. Configure TypeScript

### Using Catalog Dependencies
```json
{
  "dependencies": {
    "zod": "catalog:zod",
    "react": "catalog:react"
  }
}
```

### Incremental Testing
```bash
# Test only changed packages
pnpm run test:changed

# Test changed packages and dependents
pnpm run test:affected
```

## Best Practices
- Use catalog dependencies for version consistency
- Build lib packages before artifacts
- Use workspace-aware commands
- Commit lockfile to version control
- Use incremental testing for faster feedback
