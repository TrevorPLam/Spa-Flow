# Security Policy

## Overview

SpaFlow implements a comprehensive security scanning pipeline to identify and remediate vulnerabilities early in the development lifecycle. This document outlines the security scanning tools, processes, and remediation procedures.

## Security Scanning Tools

### 1. Dependency Scanning (SCA) - pnpm audit

**Tool:** pnpm audit  
**Trigger:** Every PR and push to main branch  
**Severity Threshold:** High and Critical vulnerabilities block CI  
**Scope:** 
- `artifacts/api-server` - Backend dependencies
- `artifacts/spaflow` - Frontend dependencies

**Configuration:**
```bash
pnpm audit --audit-level=high
```

This command fails the CI pipeline if any high or critical severity vulnerabilities are found in the dependency tree.

### 2. Static Application Security Testing (SAST) - CodeQL

**Tool:** GitHub CodeQL  
**Trigger:** Every PR and push to main branch  
**Languages:** JavaScript, TypeScript  
**Permissions:** Requires `security-events: write` permission  
**Scope:** Entire codebase

**Configuration:**
- Uses GitHub's default JavaScript/TypeScript query suite
- Analyzes code for common vulnerabilities (XSS, SQL injection, path traversal, etc.)
- Results appear as code scanning alerts in GitHub

## Vulnerability Remediation Process

### High/Critical Vulnerabilities

**SLA:** Remediate within 7 business days

**Steps:**
1. **Identify the vulnerability**
   - Check CI failure logs for pnpm audit output
   - Review CodeQL alerts in the Security tab
   - Note the affected package and CVE/GHSA ID

2. **Assess impact**
   - Determine if the vulnerability is in production code or dev dependencies
   - Check if the vulnerable code path is actually used
   - Review the vulnerability advisory for exploitability

3. **Remediate**
   - **First choice:** Update to a patched version
     ```bash
     pnpm update <package-name>
     ```
   - **Alternative:** Use pnpm overrides if no patch is available
     ```bash
     # In package.json
     "pnpm": {
       "overrides": {
         "vulnerable-package@<safe-version": "safe-version"
       }
     }
     ```
   - **Last resort:** Document as false positive if not exploitable (see below)

4. **Verify fix**
   - Run `pnpm audit` locally to confirm resolution
   - Push changes to trigger CI verification
   - Ensure CI security-scan job passes

5. **Document**
   - Update this document with remediation details if notable
   - Create a GitHub issue if the vulnerability requires ongoing monitoring

### Medium/Low Vulnerabilities

**SLA:** Remediate within 30 business days

**Process:**
- These do not block CI but should be tracked
- Create a GitHub issue to track remediation
- Follow the same assessment and remediation steps as high/critical
- Prioritize based on actual exploitability and impact

### False Positive Handling

**When to mark as false positive:**
- Vulnerability is in a dev dependency not used in production
- Vulnerable code path is not reachable in your application
- Advisory is incorrect or has been retracted
- Vulnerability requires conditions that don't exist in your deployment

**How to document false positives:**
1. For pnpm audit, use `auditConfig.ignoreGhsas` in `.npmrc`:
   ```ini
   auditConfig.ignoreGhsas=GHSA-xxxx-xxxx-xxxx
   ```
2. For CodeQL, dismiss the alert in GitHub with a detailed reason
3. Document the false positive in this security policy document

**Required documentation for false positives:**
- GHSA/CVE ID
- Reason it's a false positive
- Date reviewed
- Reviewer name

## Security Scan Triggers

### Pull Request Scans
- **security-scan job:** Runs on every PR to main
  - Blocks PR merge if high/critical vulnerabilities found
  - Provides immediate feedback to developers
- **codeql job:** Runs on every PR to main
  - Shows new security alerts in the PR diff view
  - Blocks PR merge if new alerts introduced

### Main Branch Scans
- Both security-scan and codeql jobs run on every push to main
- Ensures main branch remains security-compliant
- Provides baseline for PR comparisons

## Escalation Process

### Immediate Escalation (0-24 hours)
- **Trigger:** Critical vulnerability with known active exploits
- **Action:** 
  - Notify security team immediately
  - Consider emergency patch if production is affected
  - Document in incident response system

### Standard Escalation (7-30 days)
- **Trigger:** High severity vulnerabilities approaching SLA
- **Action:**
  - Create GitHub issue with remediation plan
  - Assign to appropriate team
  - Track progress in weekly security review

## Best Practices

### Dependency Management
- Keep dependencies up to date with regular `pnpm update`
- Review new dependencies before adding them
- Prefer packages with active maintenance and security track records
- Lock dependency versions in package.json when appropriate

### Code Security
- Follow secure coding practices (input validation, output encoding)
- Use framework security features (helmet, cors, csrf protection)
- Implement proper authentication and authorization
- Validate and sanitize all user inputs
- Use parameterized queries to prevent SQL injection

### Monitoring
- Review security alerts weekly
- Monitor for new CVEs in dependencies
- Subscribe to security advisories for critical packages
- Review GitHub Dependabot alerts (if enabled)

## Testing Security Scans

### Local Testing
```bash
# Test pnpm audit locally
cd artifacts/api-server && pnpm audit --audit-level=high
cd artifacts/spaflow && pnpm audit --audit-level=high
```

### CI Testing
To test security scans without merging:
1. Create a feature branch
2. Make a trivial change (e.g., update a comment)
3. Create a PR to main
4. Verify security-scan and codeql jobs run and pass

## References

- [GitHub CodeQL Documentation](https://docs.github.com/en/code-security/code-scanning/introduction-to-code-scanning/about-code-scanning-with-codeql)
- [pnpm audit Documentation](https://pnpm.io/cli/audit/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE/SANS Top 25](https://cwe.mitre.org/top25/)
