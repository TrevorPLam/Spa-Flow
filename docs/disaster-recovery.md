# Spa-Flow Disaster Recovery Runbook

**Last Updated:** 2026-05-21  
**Version:** 1.0  
**Owner:** Engineering Team

---

## Overview

This document provides comprehensive procedures for disaster recovery (DR) for the Spa-Flow application. It covers backup strategies, restore procedures, and incident response protocols to ensure business continuity in the event of data loss, system failure, or other catastrophic events.

---

## Recovery Objectives

### Recovery Point Objective (RPO): 24 Hours

**Definition:** The maximum acceptable amount of data loss measured in time.

**Rationale:**

- Daily automated backups at 3 AM UTC ensure at most 24 hours of data loss
- Spa-Flow business model can tolerate 24 hours of data loss without significant impact
- Cost-benefit analysis shows 24-hour RPO balances cost and risk appropriately
- More frequent backups would increase storage costs and complexity

**Implications:**

- Any data created/modified after the last backup (3 AM UTC) may be lost
- Critical transactions should be logged separately for manual recovery if needed
- Users should be informed of potential data loss during recovery

### Recovery Time Objective (RTO): 4 Hours

**Definition:** The maximum acceptable length of time to restore a service after a disruption.

**Rationale:**

- 4 hours allows for thorough restore verification and testing
- Business can operate with limited functionality for 4 hours
- Includes time for: backup retrieval (30 min), restore (1 hour), verification (1 hour), application restart (30 min), smoke testing (1 hour)
- Faster recovery would require additional infrastructure investment

**Implications:**

- System may be unavailable for up to 4 hours during recovery
- Staff should have manual procedures for critical operations during outage
- Communication plan should notify users of expected downtime

---

## Backup Strategy

### Backup Schedule

| Environment | Frequency | Time (UTC) | Retention |
| :---------- | :-------- | :--------- | :-------- |
| Production  | Daily     | 3 AM       | 30 days   |
| Staging     | Daily     | 3 AM       | 7 days    |
| Development | On-demand | Manual     | 3 days    |

### Backup Components

1. **Database Backup**
   - Full PostgreSQL dump using `pg_dump`
   - Compressed with gzip
   - Encrypted with AES-256 GPG
   - Stored as GitHub Actions artifacts

2. **Backup Contents**
   - All database tables and data
   - Schema definitions
   - Indexes and constraints
   - Excludes: ownership, ACLs (for portability)

3. **Backup Security**
   - Encrypted at rest using GPG symmetric encryption
   - Encryption key stored in GitHub Actions secrets
   - Backup artifacts retained for 30 days
   - Access restricted to authorized personnel

### Backup Verification

- Automated verification in backup workflow
- Monthly manual restore test to staging environment
- Backup size monitoring (alert on significant deviations)
- Backup log review for errors

---

## Disaster Scenarios

### Scenario 1: Database Corruption

**Severity:** High  
**Detection:** Application errors, database logs, monitoring alerts  
**Recovery Time:** 2-4 hours

**Procedure:**

1. Identify corruption extent using database diagnostics
2. Stop application to prevent further corruption
3. Restore from most recent verified backup
4. Apply transaction logs if available
5. Verify data integrity
6. Restart application
7. Perform smoke testing
8. Monitor for issues

**Rollback:** If restore fails, try previous day's backup

### Scenario 2: Accidental Data Deletion

**Severity:** Medium  
**Detection:** User reports, data validation checks  
**Recovery Time:** 1-2 hours

**Procedure:**

1. Identify affected data and deletion time
2. Select backup from before deletion
3. Restore to staging environment
4. Extract and restore specific tables/rows
5. Verify data restoration
6. Update audit logs
7. Notify affected users

**Rollback:** If partial restore fails, perform full restore

### Scenario 3: Complete System Failure

**Severity:** Critical  
**Detection:** System unresponsive, monitoring alerts  
**Recovery Time:** 3-4 hours

**Procedure:**

1. Declare incident and notify stakeholders
2. Assess infrastructure damage
3. Provision new infrastructure if needed
4. Restore database from backup
5. Deploy application code
6. Configure environment variables
7. Perform end-to-end testing
8. Switch DNS if needed
9. Monitor system health

**Rollback:** If new infrastructure fails, attempt repair of existing

### Scenario 4: Security Breach

**Severity:** Critical  
**Detection:** Security alerts, audit logs, user reports  
**Recovery Time:** 4-8 hours

**Procedure:**

1. Isolate affected systems
2. Identify breach scope and timeline
3. Preserve forensic evidence
4. Rotate all credentials and secrets
5. Restore from pre-breach backup
6. Patch vulnerabilities
7. Perform security audit
8. Notify affected parties
9. Document incident for compliance

**Rollback:** If restore fails, engage security incident response team

---

## Restore Procedures

### Prerequisites

- Access to GitHub Actions artifacts
- Backup encryption key (from GitHub Actions secrets)
- Database credentials for target environment
- PostgreSQL client tools installed
- Sufficient disk space for backup decompression

### Automated Restore (Staging)

```bash
# Download backup artifact from GitHub Actions
# Extract to local machine
chmod +x scripts/restore.sh
./scripts/restore.sh <backup_file> staging
```

### Manual Restore (Production)

**WARNING:** Manual production restore requires approval from Engineering Lead.

```bash
# 1. Download backup artifact
# 2. Verify backup integrity
gpg --verify backup.sig backup.sql.gz.gpg

# 3. Decrypt backup
gpg --output backup.sql.gz --decrypt backup.sql.gz.gpg

# 4. Decompress
gunzip backup.sql.gz

# 5. Verify dump file
head -n 1 backup.sql | grep "PostgreSQL database dump"

# 6. Stop application
# (Use deployment scripts or manual process)

# 7. Restore database
psql $DATABASE_URL < backup.sql

# 8. Verify restore
psql $DATABASE_URL -c "SELECT COUNT(*) FROM clients;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM transactions;"

# 9. Restart application
# (Use deployment scripts or manual process)

# 10. Smoke testing
# Run critical path tests
```

### Restore Verification Checklist

- [ ] Database connects successfully
- [ ] All tables present
- [ ] Row counts reasonable
- [ ] Critical data verified (clients, transactions)
- [ ] Application starts without errors
- [ ] Authentication works
- [ ] Check-in flow functional
- [ ] Reports generate correctly
- [ ] No data corruption errors in logs

---

## Backup Locations

### Primary Storage

- GitHub Actions Artifacts (30-day retention)
- Environment: production, staging

### Secondary Storage (Future Enhancement)

- Consider adding cloud storage (S3, GCS) for longer retention
- Consider off-site backup for disaster recovery
- Consider backup replication to multiple regions

---

## Contact Information

### Primary Contacts

| Role                   | Name                   | Contact | Availability   |
| :-------------------- | :--------------------- | :------ | :------------- |
| Engineering Lead      | TBD                    | TBD     | 24/7           |
| Database Administrator | TBD                    | TBD     | Business hours |
| DevOps Engineer       | TBD                    | TBD     | Business hours |

### Escalation Path

1. **Level 1:** On-call engineer (immediate)
2. **Level 2:** Engineering Lead (30 min if unresolved)
3. **Level 3:** CTO (1 hour if critical)

---

## Incident Response

### Incident Declaration

An incident is declared when:

- Database is inaccessible for > 15 minutes
- Data corruption is detected
- Security breach is suspected
- Automated backup fails

### Communication Plan

**Internal:**

- Engineering team: Immediate notification
- Management: Within 30 minutes of incident declaration
- Support team: Within 1 hour (if customer-facing)

**External:**

- Customers: If outage > 2 hours
- Status page: Update within 30 minutes
- Social media: If outage > 4 hours

### Post-Incident Review

Conduct post-incident review within 1 week:

- Root cause analysis
- Timeline reconstruction
- Response effectiveness
- Improvement opportunities
- Documentation updates

---

## Testing Procedures

### Monthly Backup Test

1. Select random backup from previous month
2. Restore to staging environment
3. Verify data integrity
4. Document results
5. Report any issues

### Quarterly DR Drill

1. Simulate complete system failure
2. Execute full recovery procedure
3. Measure actual RTO
4. Identify bottlenecks
5. Update procedures if needed

### Annual Review

Review and update this document:

- RPO/RTO appropriateness
- Backup retention policy
- Contact information
- Technology changes
- Regulatory requirements

---

## Maintenance

### Backup Script Maintenance

- Review quarterly for PostgreSQL version compatibility
- Update encryption algorithms as needed
- Monitor backup size trends
- Optimize compression settings

### Workflow Maintenance

- Review GitHub Actions workflow quarterly
- Update runner versions
- Monitor execution time
- Optimize for cost

### Documentation Maintenance

- Update after any procedure change
- Review annually for accuracy
- Keep contact information current
- Incorporate lessons learned

---

## Appendix

### Environment Variables

| Variable              | Description                  | Location                 |
| :-------------------- | :--------------------------- | :----------------------- |
| DATABASE_URL          | Database connection string   | .env files               |
| BACKUP_ENCRYPTION_KEY | GPG encryption key           | GitHub Actions secrets   |
| BACKUP_RETENTION_DAYS | Backup retention period       | backup.yml               |
| BACKUP_DIR            | Backup storage directory    | backup.sh                |

### Useful Commands

```bash
# List available backups
ls -lh /tmp/spaflow-backups/

# Check backup size
du -sh /tmp/spaflow-backups/spaflow_*.sql.gz.gpg

# Verify GPG encryption
gpg --list-packets backup.sql.gz.gpg

# Test database connection
psql $DATABASE_URL -c "SELECT version();"

# Check table counts
psql $DATABASE_URL -c "\dt"
```

### Related Documentation

- [AGENTS.md](../AGENTS.md) - Development conventions
- [README.md](../README.md) - Project overview
- [Security Posture](./security-posture.md) - Security procedures

---

## Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-05-21 | 1.0 | Initial document creation | Engineering Team |
