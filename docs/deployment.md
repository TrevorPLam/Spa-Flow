# Deployment Guide

This document describes the deployment process for Spa-Flow, including staging and production environments, blue-green deployment strategy, and rollback procedures.

## Overview

Spa-Flow uses automated deployment via GitHub Actions with a blue-green deployment strategy to ensure zero-downtime deployments and easy rollback capabilities.

## Environments

### Staging

- **URL**: https://staging.spaflow.example.com
- **Trigger**: Push to `main` branch
- **Approval**: None (automatic)
- **Purpose**: Pre-production testing environment

### Production

- **URL**: https://spaflow.example.com
- **Trigger**: Git tags matching `v*` (e.g., `v1.0.0`)
- **Approval**: Manual approval required
- **Purpose**: Live production environment

## Deployment Strategy: Blue-Green

Blue-green deployment maintains two identical production environments:
- **Blue**: Currently active environment serving traffic
- **Green**: Inactive environment for new deployments

### Deployment Process

1. **Deploy to Inactive Environment**: New version is deployed to the inactive environment (green if blue is active)
2. **Health Checks**: Comprehensive health checks verify the new deployment
3. **Smoke Tests**: Critical-path tests run against the new deployment
4. **Traffic Switch**: Traffic is switched from active to inactive environment
5. **Old Environment Cleanup**: Previous active environment is stopped

### Benefits

- **Zero Downtime**: Traffic is never interrupted during deployment
- **Instant Rollback**: Switch traffic back to previous version if issues arise
- **Safety**: New version is fully tested before receiving production traffic
- **Isolation**: Deployment failures don't affect the active environment

## Automated Deployment Workflows

### Staging Deployment

**File**: `.github/workflows/deploy-staging.yml`

**Triggers**:
- Push to `main` branch
- Manual workflow dispatch

**Steps**:
1. Checkout code
2. Install dependencies
3. Run fast tests
4. Build application
5. Run smoke tests
6. Deploy to staging server via SSH
7. Health check verification
8. Notification on success/failure

**Required Secrets**:
- `STAGING_HOST`: Staging server hostname
- `STAGING_USER`: SSH username
- `STAGING_SSH_KEY`: SSH private key
- `STAGING_PORT`: SSH port (default: 22)

### Production Deployment

**File**: `.github/workflows/deploy-production.yml`

**Triggers**:
- Git tags matching `v*`
- Manual workflow dispatch

**Steps**:
1. Checkout code
2. Install dependencies
3. Run full test suite (typecheck, lint, coverage)
4. Build application
5. Run smoke tests
6. **Manual approval gate**
7. Deploy to production server via SSH (blue-green)
8. Health check verification
9. Production smoke tests
10. Automatic rollback on failure
11. Notification on success/failure

**Required Secrets**:
- `PRODUCTION_HOST`: Production server hostname
- `PRODUCTION_USER`: SSH username
- `PRODUCTION_SSH_KEY`: SSH private key
- `PRODUCTION_PORT`: SSH port (default: 22)
- `PRODUCTION_APPROVAL_SECRET`: Secret for manual approval

## Manual Deployment

For manual deployments or emergency situations, use the deployment script:

```bash
./scripts/deploy.sh <environment> [version]
```

**Examples**:
```bash
# Deploy to staging with current commit
./scripts/deploy.sh staging

# Deploy to production with specific version
./scripts/deploy.sh production abc123def456

# Deploy to production with tag
./scripts/deploy.sh production v1.0.0
```

### Deployment Script Details

**File**: `scripts/deploy.sh`

**Features**:
- Blue-green deployment logic
- Automatic health checks
- Database migration automation
- Rollback on failure
- Colored logging
- Environment validation

**Environment Variables**:
- `HEALTH_CHECK_URL`: Health check endpoint (default: `http://localhost:5000/health`)
- `HEALTH_CHECK_TIMEOUT`: Health check timeout in seconds (default: 300)
- `HEALTH_CHECK_INTERVAL`: Health check interval in seconds (default: 5)

## Database Migrations

Database migrations are automated as part of the deployment process using Drizzle ORM.

### Migration Process

1. **Staging**: Migrations run automatically during deployment
2. **Production**: Migrations require manual confirmation before running

### Migration Safety

- **Production migrations require explicit confirmation**
- Migrations run before application deployment
- Failed migrations block deployment
- Rollback includes database rollback if supported

### Manual Migration

To run migrations manually:

```bash
cd lib/db
pnpm run migrate
```

## Rollback Procedures

### Automatic Rollback

Production deployment automatically rolls back if:
- Health checks fail
- Smoke tests fail
- Application crashes after deployment

### Manual Rollback

To manually rollback to the previous version:

```bash
./scripts/deploy.sh production rollback
```

Or via SSH:
```bash
ssh production-server
cd /var/www/spaflow
./scripts/deploy.sh production rollback
```

### Rollback Strategy

Rollback switches traffic back to the previous active environment (blue-green). The failed deployment remains on the inactive environment for investigation.

## Health Checks

### Health Check Endpoint

**URL**: `/health`

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2026-05-21T00:00:00Z",
  "services": {
    "database": "ok",
    "redis": "ok",
    "square": "ok",
    "twilio": "ok"
  }
}
```

### Health Check Configuration

- **Timeout**: 300 seconds (5 minutes)
- **Interval**: 5 seconds
- **Max Attempts**: 30 (staging), 30 (production)

## Troubleshooting

### Deployment Fails During Build

**Cause**: Build errors, test failures, or dependency issues

**Solution**:
1. Check CI logs for specific error
2. Run `pnpm run typecheck` and `pnpm run lint` locally
3. Run `pnpm run test` locally
4. Fix issues and push new commit

### Deployment Fails During Health Check

**Cause**: Application fails to start or health check fails

**Solution**:
1. Check application logs on server
2. Verify environment variables
3. Check database connectivity
4. Verify database migrations completed
5. Manual rollback if needed

### Database Migration Fails

**Cause**: Migration script error or database state mismatch

**Solution**:
1. Review migration error logs
2. Check database state
3. Manually run migration with debug output
4. Rollback migration if needed
5. Contact database administrator if stuck

### SSH Connection Fails

**Cause**: SSH key issues, network problems, or server down

**Solution**:
1. Verify SSH key is correct in GitHub secrets
2. Verify server is accessible
3. Check SSH port and firewall rules
4. Verify user permissions

## Monitoring and Alerts

### Deployment Metrics

Deployments log the following metrics:
- Deployment duration
- Health check time
- Migration duration
- Success/failure status

### Alerts

Alerts are configured for:
- Deployment failures
- Health check failures
- Migration failures
- Rollback events

### Logs

Deployment logs are available in:
- GitHub Actions workflow runs
- Server application logs
- Deployment script output

## Security Considerations

### Secrets Management

All sensitive data is stored in GitHub Secrets:
- SSH keys
- Database credentials
- API keys
- Approval secrets

### Access Control

- Production deployment requires manual approval
- SSH access restricted to authorized users
- Server access logged and audited

### Network Security

- SSH uses key-based authentication
- Firewall rules restrict access
- HTTPS required for all endpoints

## Best Practices

### Before Deployment

1. Ensure all tests pass locally
2. Review changes in PR
3. Test in staging environment first
4. Verify database migrations are safe
5. Have rollback plan ready

### During Deployment

1. Monitor deployment logs
2. Watch for health check failures
3. Be ready to approve production deployment
4. Have rollback command ready

### After Deployment

1. Verify application functionality
2. Check error logs
3. Monitor performance metrics
4. Verify database integrity
5. Document any issues

## Appendix

### Server Requirements

**Minimum**:
- Node.js 20.x
- PostgreSQL 14+
- 2GB RAM
- 20GB disk space

**Recommended**:
- Node.js 20.x
- PostgreSQL 15+
- 4GB RAM
- 50GB disk space

### Directory Structure

```
/var/www/spaflow/
├── blue/          # Blue environment
├── green/         # Green environment
├── current -> blue/green  # Symlink to active environment
└── scripts/
    └── deploy.sh  # Deployment script
```

### Environment Files

- `.env.staging`: Staging environment variables
- `.env.production`: Production environment variables
- `.env.example`: Template for environment variables

## Support

For deployment issues or questions:
- Check this documentation first
- Review GitHub Actions logs
- Contact DevOps team
- Create issue in repository
