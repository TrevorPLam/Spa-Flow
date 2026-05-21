---
trigger: glob
globs: artifacts/api-server/src/**/*.ts
---

# Audit Logging Best Practices (2026)

## Current State
- Spa-Flow logs all resource modifications
- Includes userId, action, resourceType, resourceId, ipAddress, correlationId
- MANAGER-only audit log viewing

## 2026 Best Practices
- **Critical**: Audit logs must be tamper-proof for compliance
- Regulators want proof of detection/response capabilities, not just activity records
- Tamper-proof logs are essential for security investigations
- Compliance requirements (HIPAA, GDPR, SOC 2) demand comprehensive audit trails

## Audit Log Requirements

### Mandatory Fields
- **✅ Always Do**: Include userId (who performed the action)
- **✅ Always Do**: Include action (what was done: create, update, delete)
- **✅ Always Do**: Include resourceType (what was affected: client, locker, room)
- **✅ Always Do**: Include resourceId (specific instance affected)
- **✅ Always Do**: Include ipAddress (where the action originated)
- **✅ Always Do**: Include correlationId (for request tracing)
- **✅ Always Do**: Include timestamp (when the action occurred)
- **✅ Always Do**: Include userAgent (client information)

### Actions to Log
- **✅ Always Do**: Log all authentication events (login, logout, password reset)
- **✅ Always Do**: Log all resource modifications (clients, lockers, rooms, transactions)
- **✅ Always Do**: Log all authorization failures
- **✅ Always Do**: Log all privilege escalations
- **✅ Always Do**: Log all configuration changes
- **✅ Always Do**: Log all sensitive data access

```typescript
// ✅ Good: Comprehensive audit log
await db.insert(auditLogs).values({
  userId: req.user.id,
  action: 'update',
  resourceType: 'client',
  resourceId: clientId,
  changes: JSON.stringify({ before: oldData, after: newData }),
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
  correlationId: req.id,
  timestamp: new Date()
});
```

## Tamper-Proof Requirements
- **✅ Always Do**: Write audit logs to immutable storage (WORM device, append-only database)
- **✅ Always Do**: Use cryptographic signing for log integrity (HMAC or digital signatures)
- **✅ Always Do**: Implement log aggregation to prevent local tampering
- **✅ Always Do**: Send logs to external SIEM system (Elastic, Splunk, Datadog)
- **❌ Never Do**: Allow audit logs to be modified after creation
- **❌ Never Do**: Store audit logs in mutable storage without safeguards

## Log Retention
- **✅ Always Do**: Retain audit logs for minimum compliance period (typically 1-7 years)
- **✅ Always Do**: Implement log archiving for long-term storage
- **✅ Always Do**: Compress archived logs to save storage
- **❌ Never Do**: Delete audit logs before retention period expires

## Access Control
- **✅ Always Do**: Restrict audit log viewing to MANAGER role only
- **✅ Always Do**: Log all audit log access attempts
- **✅ Always Do**: Implement role-based access control for audit logs
- **❌ Never Do**: Allow non-privileged users to view audit logs
- **❌ Never Do**: Modify audit logs without explicit approval and logging

## PII in Audit Logs
- **✅ Always Do**: Redact PII from audit logs (dob, address, documentNumber)
- **✅ Always Do**: Log only resource IDs, not full PII data
- **✅ Always Do**: Encrypt sensitive audit log fields if necessary
- **❌ Never Do**: Log PII in plain text
- **❌ Never Do**: Log sensitive data without encryption

## Log Format
- **✅ Always Do**: Use structured logging (JSON format)
- **✅ Always Do**: Use consistent field names across all logs
- **✅ Always Do**: Include correlation IDs for distributed tracing
- **✅ Always Do**: Use ISO 8601 timestamps
- **❌ Never Do**: Use unstructured log formats

## Log Analysis
- **✅ Always Do**: Implement log alerting for suspicious activity
- **✅ Always Do**: Create dashboards for audit log visibility
- **✅ Always Do**: Regularly review audit logs for anomalies
- **✅ Always Do**: Use audit logs for compliance reporting
- **❌ Never Do**: Ignore audit log alerts

## Compliance Requirements
- **✅ Always Do**: Map audit log fields to compliance requirements (HIPAA, GDPR, SOC 2)
- **✅ Always Do**: Implement audit log retention policies per regulation
- **✅ Always Do**: Generate compliance reports from audit logs
- **⚠️ Ask First**: Changing audit log retention policies

## References
- "Compliance by Design: 18 Tips to Implement Tamper-Proof Audit Logs" - Mattermost (February 2026)
- "Compliance Readiness with Audit Logging" - Graylog
- "Logging Best Practices To Meet 2026 Compliance Requirements" - NetWitness
- OWASP Audit Logging Cheat Sheet
