#!/bin/bash
# Spa-Flow Database Restore Script
# This script restores encrypted PostgreSQL backups
# Usage: ./restore.sh <backup_file> [environment]
# Environment: development, staging, production (default: development)

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMP_DIR="/tmp/spaflow-restore-$(date +%Y%m%d_%H%M%S)"

# Validate arguments
if [ $# -lt 1 ]; then
  echo "Usage: $0 <backup_file> [environment]"
  echo "Example: $0 /tmp/spaflow-backups/spaflow_production_20260521_030000.sql.gz.gpg production"
  exit 1
fi

BACKUP_FILE="$1"
ENVIRONMENT="${2:-development}"

# Check if backup file exists
if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Error: Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

# Load environment variables
if [ -f "${SCRIPT_DIR}/../.env.${ENVIRONMENT}" ]; then
  export $(cat "${SCRIPT_DIR}/../.env.${ENVIRONMENT}" | grep -v '^#' | xargs)
elif [ -f "${SCRIPT_DIR}/../.env" ]; then
  export $(cat "${SCRIPT_DIR}/../.env" | grep -v '^#' | xargs)
else
  echo "Error: Environment file not found for ${ENVIRONMENT}"
  exit 1
fi

# Validate DATABASE_URL
if [ -z "${DATABASE_URL:-}" ]; then
  echo "Error: DATABASE_URL not set"
  exit 1
fi

# Create temporary directory
mkdir -p "${TEMP_DIR}"

# Determine file type and process accordingly
if [[ "${BACKUP_FILE}" == *.gpg ]]; then
  echo "Decrypting backup..."
  if [ -z "${BACKUP_ENCRYPTION_KEY:-}" ]; then
    echo "Error: BACKUP_ENCRYPTION_KEY not set for decryption"
    exit 1
  fi
  
  DECRYPTED_FILE="${TEMP_DIR}/$(basename ${BACKUP_FILE} .gpg)"
  echo "${BACKUP_ENCRYPTION_KEY}" | gpg \
    --batch \
    --yes \
    --passphrase-fd 0 \
    --decrypt \
    --output "${DECRYPTED_FILE}" \
    "${BACKUP_FILE}"
  
  BACKUP_FILE="${DECRYPTED_FILE}"
  echo "Decryption complete"
fi

# Decompress if needed
if [[ "${BACKUP_FILE}" == *.gz ]]; then
  echo "Decompressing backup..."
  DECOMPRESSED_FILE="${TEMP_DIR}/$(basename ${BACKUP_FILE} .gz)"
  gunzip -c "${BACKUP_FILE}" > "${DECOMPRESSED_FILE}"
  BACKUP_FILE="${DECOMPRESSED_FILE}"
  echo "Decompression complete"
fi

# Verify the backup file
echo "Verifying backup file..."
if ! head -n 1 "${BACKUP_FILE}" | grep -q "PostgreSQL database dump"; then
  echo "Error: Invalid PostgreSQL dump file"
  exit 1
fi

# Extract database name from DATABASE_URL
DB_NAME=$(echo "${DATABASE_URL}" | sed -n 's/.*\/\([^?]*\).*/\1/p')

# Confirm restore operation
echo "=========================================="
echo "Restore Details"
echo "=========================================="
echo "Backup file: ${BACKUP_FILE}"
echo "Target database: ${DB_NAME}"
echo "Environment: ${ENVIRONMENT}"
echo "=========================================="
echo ""
read -p "WARNING: This will replace all data in ${DB_NAME}. Continue? (yes/no): " CONFIRM

if [ "${CONFIRM}" != "yes" ]; then
  echo "Restore cancelled"
  rm -rf "${TEMP_DIR}"
  exit 0
fi

# Perform restore
echo "Starting restore to ${DB_NAME}..."
psql "${DATABASE_URL}" < "${BACKUP_FILE}" 2>&1 | tee "${TEMP_DIR}/restore.log"

# Verify restore
echo "Verifying restore..."
TABLE_COUNT=$(psql "${DATABASE_URL}" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
echo "Restored ${TABLE_COUNT} tables"

# Clean up
rm -rf "${TEMP_DIR}"

echo "Restore completed successfully"
exit 0
