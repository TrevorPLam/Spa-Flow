---
trigger: model_decision
globs: .github/workflows/*.yml
---

# CI/CD Security Best Practices (2026)

## Current State
- Spa-Flow uses GitHub Actions with 11-stage pipeline
- Includes security scan, CodeQL analysis, type check, build, smoke tests, contract tests, component tests, coverage, E2E tests, load tests, mutation tests
- Blocks on high/critical vulnerabilities
- Requires ≥80% coverage

## 2026 Best Practices
- **Critical Enhancement**: GitHub enhanced CodeQL with declarative security modeling (May 2026)
- Security scanning must be integrated throughout pipeline, not just at end
- Dependency scanning is critical given supply chain attack landscape
- Container scanning essential for production deployments
- SAST (Static Application Security Testing) mandatory for all code

## Pipeline Stages

### 1. Security Scan (Dependency)
```yaml
# ✅ Good: Dependency scanning
- name: Run pnpm audit
  run: pnpm audit --audit-level=high
  # Blocks on high/critical vulnerabilities
```

### 2. CodeQL Analysis (SAST)
```yaml
# ✅ Good: CodeQL with declarative security modeling
- name: Initialize CodeQL
  uses: github/codeql-action/init@v3
  with:
    languages: javascript, typescript
    queries: security-extended, security-and-quality

- name: Perform CodeQL Analysis
  uses: github/codeql-action/analyze@v3
```

### 3. Container Scanning (If Using Docker)
```yaml
# ✅ Good: Trivy vulnerability scan
- name: Run Trivy vulnerability scan
  uses: aquasecurity/trivy-action@master
  with:
    scan-type: 'fs'
    severity: 'CRITICAL,HIGH'
    exit-code: '1'
```

### 4. Secret Scanning
```yaml
# ✅ Good: Secret scanning
- name: Run Gitleaks
  uses: gitleaks/gitleaks-action@v2
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    GIT_LEAKS_VERSION: latest
```

### 5. Type Check
```yaml
# ✅ Good: TypeScript strict mode check
- name: Type check
  run: pnpm -r run typecheck
```

### 6. Build
```yaml
# ✅ Good: Build all packages
- name: Build
  run: pnpm -r run build
```

### 7. Security Tests (Smoke)
```yaml
# ✅ Good: Security-focused smoke tests
- name: Run security smoke tests
  run: pnpm run test -- @smoke @security
```

### 8. Contract Tests (API Changes)
```yaml
# ✅ Good: API contract validation
- name: Run contract tests
  if: contains(github.changed_files, 'artifacts/api-server/')
  run: cd artifacts/api-server && pnpm run test:contract
```

### 9. Component Tests (Frontend Changes)
```yaml
# ✅ Good: Frontend component tests
- name: Run component tests
  if: contains(github.changed_files, 'artifacts/spaflow/')
  run: cd artifacts/spaflow && pnpm run test:component
```

### 10. Coverage Report
```yaml
# ✅ Good: Coverage with 80% threshold
- name: Run coverage
  run: pnpm -r run test:coverage
- name: Check coverage threshold
  run: |
    if [ $(pnpm run coverage:percent) -lt 80 ]; then
      echo "Coverage below 80%"
      exit 1
    fi
```

### 11. E2E Tests (Frontend Changes)
```yaml
# ✅ Good: E2E tests with visual regression
- name: Run E2E tests
  if: contains(github.changed_files, 'artifacts/spaflow/')
  run: cd artifacts/spaflow && pnpm run test:e2e
```

### 12. Load Tests
```yaml
# ✅ Good: Performance validation
- name: Run load tests
  run: pnpm run test:load:smoke
```

### 13. Mutation Tests
```yaml
# ✅ Good: Test effectiveness validation
- name: Run mutation tests
  run: cd artifacts/api-server && pnpm run test:mutation
```

## Security Requirements
- **✅ Always Do**: Security scan blocks on high/critical vulnerabilities
- **✅ Always Do**: CodeQL analysis runs on every PR
- **✅ Always Do**: Type check runs on every PR
- **✅ Always Do**: Build runs on every PR
- **✅ Always Do**: Smoke tests run on every PR
- **✅ Always Do**: Contract tests run on api-server changes
- **✅ Always Do**: Component tests run on spaflow changes
- **✅ Always Do**: Coverage report requires ≥80%
- **✅ Always Do**: E2E tests run on spaflow changes
- **✅ Always Do**: Load tests run on every PR
- **✅ Always Do**: Mutation tests run on every PR
- **❌ Never Do**: Skip security stages for speed
- **❌ Never Do**: Merge with failing security checks

## Caching Strategy
- **✅ Always Do**: Use pnpm store cache for dependencies
- **✅ Always Do**: Use build cache for compiled artifacts
- **✅ Always Do**: Use Vitest cache for test execution
- **✅ Always Do**: Use Playwright browser cache
- **✅ Always Do**: Use Stryker cache for mutation testing
- **❌ Never Do**: Disable caching without justification

## Secrets Management
- **✅ Always Do**: Use GitHub Secrets for sensitive data
- **✅ Always Do**: Never commit secrets to repository
- **✅ Always Do**: Rotate secrets regularly
- **✅ Always Do**: Use environment-specific secrets
- **❌ Never Do**: Log secrets in CI output
- **❌ Never Do**: Use secrets in PR workflows from forks

## 2026 Enhancements
- Consider adding:
  - SBOM (Software Bill of Materials) generation
  - Signed commits (commit signing verification)
  - Policy-as-code (OPA, Rego)
  - Runtime security monitoring (Falco)
  - DAST (Dynamic Application Security Testing)

## References
- "GitHub Enhances CodeQL with Declarative Security Modeling" - InfoQ (May 2026)
- "How to Configure Security Scanning in CI/CD Pipelines" - OneUptime (January 2026)
- "CI/CD Pipelines 2026 Complete Guide" - Calmops
- OWASP CI/CD Security Cheat Sheet
