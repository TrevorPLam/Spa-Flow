#!/bin/bash
# Spa-Flow Database Backup Script
# This script creates encrypted PostgreSQL backups using pg_dump
# Usage: ./backup.sh [environment]
# Environment: development, staging, production (default: development)

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/tmp/spaflow-backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}

# Load environment variables
if [ -f "${SCRIPT_DIR}/../.env.${1:-development}" ]; then
  export $(cat "${SCRIPT_DIR}/../.env.${1:-development}" | grep -v '^#' | xargs)
elif [ -f "${SCRIPT_DIR}/../.env" ]; then
  export $(cat "${SCRIPT_DIR}/../.env" | grep -v '^#' | xargs)
else
  echo "Error: Environment file not found"
  exit 1
fi

# Validate DATABASE_URL
if [ -z "${DATABASE_URL:-}" ]; then
  echo "Error: DATABASE_URL not set"
  exit 1
fi

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Extract database name from DATABASE_URL
DB_NAME=$(echo "${DATABASE_URL}" | sed -n 's/.*\/\([^?]*\).*/\1/p')
BACKUP_FILE="${BACKUP_DIR}/spaflow_${DB_NAME}_${TIMESTAMP}.sql"
COMPRESSED_FILE="${BACKUP_FILE}.gz"
ENCRYPTED_FILE="${COMPRESSED_FILE}.gpg"

echo "Starting backup for ${DB_NAME} at ${TIMESTAMP}"

# Create database dump using pg_dump
echo "Creating database dump..."
pg_dump "${DATABASE_URL}" \
  --format=plain \
  --no-owner \
  --no-acl \
  --verbose \
  > "${BACKUP_FILE}" 2>&1 | tee "${BACKUP_DIR}/backup_${TIMESTAMP}.log"

# Compress the backup
echo "Compressing backup..."
gzip "${BACKUP_FILE}"

# Encrypt the backup with GPG if ENCRYPTION_KEY is set
if [ -n "${BACKUP_ENCRYPTION_KEY:-}" ]; then
  echo "Encrypting backup..."
  echo "${BACKUP_ENCRYPTION_KEY}" | gpg \
    --batch \
    --yes \
    --passphrase-fd 0 \
    --symmetric \
    --cipher-algo AES256 \
    --compress-algo 1 \
    --s2k-digest-algo SHA512 \
    --output "${ENCRYPTED_FILE}" \
    "${COMPRESSED_FILE}"
  
  # Remove unencrypted compressed file
  rm "${COMPRESSED_FILE}"
  FINAL_FILE="${ENCRYPTED_FILE}"
  echo "Backup encrypted successfully"
else
  echo "Warning: BACKUP_ENCRYPTION_KEY not set, skipping encryption"
  FINAL_FILE="${COMPRESSED_FILE}"
fi

# Calculate backup size
BACKUP_SIZE=$(du -h "${FINAL_FILE}" | cut -f1)
BACKUP_DURATION=$(($(date +%s) - $(date -d "${TIMESTAMP}" +%s)))

echo "Backup completed successfully"
echo "File: ${FINAL_FILE}"
echo "Size: ${BACKUP_SIZE}"
echo "Duration: ${BACKUP_DURATION} seconds"

# Clean up old backups
echo "Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "spaflow_${DB_NAME}_*.sql.gz*" -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}" -name "backup_*.log" -mtime +${RETENTION_DAYS} -delete

# Output backup file path for GitHub Actions
echo "backup_file=${FINAL_FILE}" >> $GITHUB_OUTPUT 2>/dev/null || true
echo "backup_size=${BACKUP_SIZE}" >> $GITHUB_OUTPUT 2>/dev/null || true
echo "backup_timestamp=${TIMESTAMP}" >> $GITHUB_OUTPUT 2>/dev/null || true

exit 0
