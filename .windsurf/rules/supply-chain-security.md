---
trigger: always_on
globs: package.json,pnpm-lock.yaml
---

# Supply Chain Security Best Practices (2026)

## Current State
- Spa-Flow uses pnpm 9.x with minimum release age enforcement
- 1-day minimum release age for npm packages (except @replit/*)
- pnpm audit blocks on high/critical vulnerabilities

## 2026 Security Landscape
- **Critical Update**: pnpm 11 (released May 2026) turns on minimum release age by default
- Supply chain attacks are the #1 security threat in npm ecosystem (2026)
- Axios supply chain compromise (April 2026) demonstrated real-world impact
- CISA issued alerts about npm supply chain compromises

## Configuration Requirements
### Minimum Release Age
- **✅ Always Do**: Enforce minimum release age of 1440 minutes (24 hours)
- **✅ Always Do**: Configure in `.npmrc`:
  ```
  min-release-age=1440m
  ```
- **✅ Always Do**: Verify pnpm 11+ is using this by default
- **❌ Never Do**: Install packages less than 24 hours old (except @replit/*)
- **❌ Never Do**: Disable minimum release age for convenience

### Dependency Auditing
- **✅ Always Do**: Run `pnpm audit` before committing
- **✅ Always Do**: Block on high/critical vulnerabilities
- **✅ Always Do**: Review medium/low vulnerabilities
- **✅ Always Do**: Keep dependencies updated regularly

### Package Selection Criteria
- **⚠️ Ask First**: Adding new npm dependency (must satisfy minimum release age)
- **✅ Always Do**: Prefer packages with:
  - Active maintenance (recent commits)
  - High download counts
  - Good security reputation
  - No known vulnerabilities
- **❌ Never Do**: Use packages with abandoned maintenance
- **❌ Never Do**: Use packages with recent security incidents

### Lock File Integrity
- **✅ Always Do**: Commit `pnpm-lock.yaml`
- **✅ Always Do**: Use `--frozen-lockfile` in CI/CD
- **✅ Always Do**: Review lock file changes in PRs
- **❌ Never Do**: Commit package-lock.json or yarn.lock (use pnpm)

## CI/CD Integration
- **✅ Always Do**: Run security scan in CI pipeline
- **✅ Always Do**: Block PRs on high/critical vulnerabilities
- **✅ Always Do**: Use Dependabot for automated dependency updates
- **✅ Always Do**: Enable pnpm audit in CI workflow

## 2026 Enhancements
- Consider using:
  - `pnpm-deduplicate` to reduce attack surface
  - `snyk` or `npm audit --audit-level=moderate` for enhanced scanning
  - `osv-scanner` for vulnerability scanning
  - `sigstore` for package signing verification

## References
- CISA Alert: Supply Chain Compromise Impacts Axios (April 2026)
- "pnpm 11 Turns On Minimum Release Age by Default" - Cybersecurity News (May 2026)
- OWASP Supply Chain Security Cheat Sheet
