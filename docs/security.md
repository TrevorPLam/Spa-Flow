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
   # Replace with actual GHSA IDs when documenting false positives
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

## PII Retention Policy

### Retention Period

**Standard Retention:** 7 years

SpaFlow retains Personally Identifiable Information (PII) for a minimum of 7 years to comply with:
- Business record retention requirements
- Tax and financial audit obligations
- Legal dispute resolution needs
- Industry best practices for spa/fitness businesses

**PII Data Types:**
- Date of birth (DOB)
- Physical address
- Government document numbers (ID, license, etc.)
- Contact information (phone, email)
- Membership and rental history

### Data Deletion Procedures

**Automatic Deletion:**
- PII is automatically deleted from the database after 7 years from the last client interaction
- Encrypted PII fields are securely wiped (overwritten with random data before deletion)
- Audit logs of PII access are retained separately for security monitoring

**Manual Deletion Requests:**
- Clients may request deletion of their PII at any time via written request
- Manager approval required for manual deletion before 7-year retention period
- Legal or compliance requirements may override deletion requests
- Deletion requests are logged in audit logs with reason and approver

**Deletion Process:**
1. Verify client identity and authorization
2. Check for legal holds or compliance requirements
3. Obtain manager approval (if before retention period)
4. Log deletion request in audit system
5. Securely wipe encrypted PII fields
6. Delete client record or mark as deleted
7. Confirm deletion to requester

### GDPR Compliance

**Data Subject Rights:**
- **Right to Access:** Clients can request a copy of all their PII data
- **Right to Rectification:** Clients can request correction of inaccurate PII
- **Right to Erasure:** Clients can request deletion of their PII (subject to legal holds)
- **Right to Portability:** Clients can request their data in a machine-readable format
- **Right to Restrict Processing:** Clients can request limitation of PII processing

**Data Processing Basis:**
- **Legitimate Interest:** Business operations, rental management, membership services
- **Contractual Necessity:** Membership agreements, rental contracts
- **Legal Obligation:** Tax reporting, regulatory compliance

**Data Transfers:**
- PII is stored in PostgreSQL databases within the EU/EEA region
- No cross-border data transfers outside EU/EEA without explicit consent
- Third-party service providers (Twilio, Square) process PII under data processing agreements

**Security Measures:**
- PII encrypted at rest using AES-256-GCM envelope encryption
- PII encrypted in transit using TLS 1.3
- Access restricted to manager role only
- All PII access logged for audit trail
- Anomaly detection for unusual PII access patterns

**Data Breach Response:**
- PII breaches are reported to relevant authorities within 72 hours
- Affected clients are notified without undue delay
- Breach response documented in security incident logs

### PII Access Audit

**Access Logging:**
- All PII access is logged with:
  - User ID and role
  - IP address
  - Timestamp
  - Specific PII fields accessed
  - Access reason/context
  - Correlation ID for request tracing

**Anomaly Detection:**
- Bulk PII access (>10 clients in 60 minutes)
- Off-hours PII access (outside 8am-8pm)
- Rapid successive PII access (>5 in 60 seconds)
- Anomalies trigger alerts to all managers

**Audit Retention:**
- PII access audit logs retained for 7 years
- Anomaly alerts retained for 7 years
- Audit logs are separate from client data for security

## References

- [GitHub CodeQL Documentation](https://docs.github.com/en/code-security/code-scanning/introduction-to-code-scanning/about-code-scanning-with-codeql)
- [pnpm audit Documentation](https://pnpm.io/cli/audit/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE/SANS Top 25](https://cwe.mitre.org/top25/)
- [GDPR Official Text](https://gdpr-info.eu/)
- [NIST SP 800-53](https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final)
