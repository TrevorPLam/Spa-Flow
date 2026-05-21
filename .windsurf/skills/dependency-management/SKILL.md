---
name: dependency-management
description: Managing npm dependencies with pnpm, catalog dependencies, and supply chain security
---

# Dependency Management

This skill covers managing npm dependencies in the Spa-Flow repository with pnpm, catalog dependencies, and supply chain security.

## Key Concepts

### pnpm Workspace Dependency Management
- pnpm 9.x for workspace management
- Single pnpm-lock.yaml for workspace
- Efficient disk space usage
- Fast installation
- Strict dependency resolution

### Catalog Dependencies for Version Consistency
- Centralized dependency versions
- Defined in pnpm-workspace.yaml
- Referenced as `catalog:dependency-name`
- Reduces version conflicts
- Easier dependency updates

### Supply Chain Security
- 1-day minimum release age for packages
- Prevents supply-chain attacks
- Configured in pnpm-workspace.yaml
- Only stable packages allowed
- Recent vulnerability protection

### Platform-Specific Dependency Exclusions
- Linux-only optimization in CI
- Excludes Windows/macOS-specific packages
- Reduces dependency installation time
- Configured in pnpm-workspace.yaml
- Faster CI builds

### Only Built Dependencies Restriction
- Only install pre-built packages
- Faster installation
- Reduces build time
- Configured in .npmrc
- Requires packages to provide pre-built artifacts

### Lockfile Enforcement
- Single pnpm-lock.yaml for workspace
- Commit to version control
- Ensures consistent installs
- Security audit applies to lockfile
- Prevents dependency drift

### Vulnerability Scanning with pnpm Audit
- `pnpm audit` for vulnerability scanning
- High/critical vulnerabilities block CI
- Automated security checks
- Regular dependency updates
- Supply chain security monitoring

### Dependency Update Workflows
- Update catalog dependencies
- Run `pnpm update` for patch updates
- Run `pnpm update -r` for all updates
- Test after updates
- Commit lockfile changes

### Breaking Change Handling
- Review breaking changes in release notes
- Test thoroughly before upgrade
- Update dependent code if needed
- Update documentation
- Communicate changes to team

## Key Files
- `pnpm-workspace.yaml` - Workspace and catalog config
- `pnpm-lock.yaml` - Lockfile
- `.npmrc` - npm/pnpm configuration

## References
- `AGENTS.md` - Dependency management rules
- `README.md` - Technology stack versions

## Common Tasks

### Installing Dependencies
```bash
# Install all workspace dependencies
pnpm install

# Install specific dependency
pnpm --filter artifacts/api-server add lodash

# Install dev dependency
pnpm --filter artifacts/api-server add -D typescript
```

### Using Catalog Dependencies
```json
{
  "dependencies": {
    "zod": "catalog:zod",
    "react": "catalog:react"
  }
}
```

### Updating Dependencies
```bash
# Update all dependencies
pnpm update

# Update specific dependency
pnpm update lodash

# Update catalog dependencies
# Edit pnpm-workspace.yaml
pnpm install
```

### Running Security Audit
```bash
# Check for vulnerabilities
pnpm audit

# Fix vulnerabilities
pnpm audit fix
```

## Best Practices
- Use catalog dependencies for version consistency
- Run audit regularly
- Update dependencies for security patches
- Test thoroughly after updates
- Commit lockfile changes
