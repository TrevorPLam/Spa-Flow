#!/bin/bash
set -euo pipefail

# Deployment script with blue-green strategy support
# Usage: ./scripts/deploy.sh <environment> <version>
# Environment: staging | production
# Version: git commit SHA or tag

ENVIRONMENT="${1:-staging}"
VERSION="${2:-$(git rev-parse HEAD)}"
DEPLOY_DIR="/var/www/spaflow"
BLUE_DIR="${DEPLOY_DIR}/blue"
GREEN_DIR="${DEPLOY_DIR}/green"
CURRENT_LINK="${DEPLOY_DIR}/current"
HEALTH_CHECK_URL="${HEALTH_CHECK_URL:-http://localhost:5000/health}"
HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-300}"
HEALTH_CHECK_INTERVAL="${HEALTH_CHECK_INTERVAL:-5}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Validate environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    log_error "Invalid environment: $ENVIRONMENT. Must be 'staging' or 'production'"
    exit 1
fi

log_info "Starting deployment to $ENVIRONMENT (version: $VERSION)"

# Determine which environment is currently active
if [[ -L "$CURRENT_LINK" ]]; then
    CURRENT_DIR=$(readlink "$CURRENT_LINK")
    if [[ "$CURRENT_DIR" == "$BLUE_DIR" ]]; then
        ACTIVE="blue"
        INACTIVE="green"
    elif [[ "$CURRENT_DIR" == "$GREEN_DIR" ]]; then
        ACTIVE="green"
        INACTIVE="blue"
    else
        log_error "Current link points to unexpected directory: $CURRENT_DIR"
        exit 1
    fi
else
    # No current link, default to blue as active
    ACTIVE="blue"
    INACTIVE="green"
    log_warn "No current deployment found, will deploy to $INACTIVE"
fi

log_info "Active environment: $ACTIVE"
log_info "Target environment: $INACTIVE"

# Create deployment directory for inactive environment
TARGET_DIR="${DEPLOY_DIR}/${INACTIVE}"
log_info "Deploying to $TARGET_DIR"

# Remove old deployment in inactive environment
if [[ -d "$TARGET_DIR" ]]; then
    log_info "Removing old deployment in $INACTIVE"
    rm -rf "$TARGET_DIR"
fi

# Create new deployment directory
mkdir -p "$TARGET_DIR"

# Build and deploy application
log_info "Building application"
cd "$(git rev-parse --show-toplevel)"
pnpm install
pnpm run build

# Copy built artifacts to target directory
log_info "Copying artifacts to $TARGET_DIR"
cp -r artifacts/api-server/dist "${TARGET_DIR}/"
cp -r artifacts/spaflow/dist "${TARGET_DIR}/"
cp -r node_modules "${TARGET_DIR}/"
cp package.json "${TARGET_DIR}/"
cp .env.${ENVIRONMENT} "${TARGET_DIR}/.env" 2>/dev/null || log_warn "No .env.${ENVIRONMENT} found, using existing env"

# Run database migrations
log_info "Running database migrations"
cd "$(git rev-parse --show-toplevel)"
cd lib/db
if [[ "$ENVIRONMENT" == "production" ]]; then
    log_warn "Production migrations - requires manual confirmation"
    read -p "Continue with production migrations? (yes/no): " CONFIRM
    if [[ "$CONFIRM" != "yes" ]]; then
        log_error "Migration cancelled by user"
        exit 1
    fi
fi
pnpm run migrate:apply

# Health check function
health_check() {
    local url="$1"
    local timeout="$2"
    local interval="$3"
    local elapsed=0
    
    log_info "Starting health check on $url"
    
    while [[ $elapsed -lt $timeout ]]; do
        if curl -f -s "$url" > /dev/null 2>&1; then
            log_info "Health check passed"
            return 0
        fi
        sleep "$interval"
        elapsed=$((elapsed + interval))
        log_info "Waiting for health check... (${elapsed}s/${timeout}s)"
    done
    
    log_error "Health check failed after ${timeout}s"
    return 1
}

# Start application in inactive environment
log_info "Starting application in $INACTIVE environment"
cd "$TARGET_DIR"
NODE_ENV="${ENVIRONMENT}" node artifacts/api-server/dist/index.mjs &
APP_PID=$!

# Wait for application to start and health check
sleep 10
if ! health_check "$HEALTH_CHECK_URL" "$HEALTH_CHECK_TIMEOUT" "$HEALTH_CHECK_INTERVAL"; then
    log_error "Application failed health check, rolling back"
    kill "$APP_PID" 2>/dev/null || true
    exit 1
fi

# Switch traffic to new environment (blue-green deployment)
log_info "Switching traffic from $ACTIVE to $INACTIVE"
ln -sfn "$TARGET_DIR" "$CURRENT_LINK"

# Stop old environment
log_info "Stopping old environment ($ACTIVE)"
OLD_PID=$(pgrep -f "artifacts/api-server/dist/index.mjs" | grep -v "$APP_PID" || true)
if [[ -n "$OLD_PID" ]]; then
    kill "$OLD_PID" 2>/dev/null || true
fi

log_info "Deployment to $ENVIRONMENT completed successfully"
log_info "Version: $VERSION"
log_info "Active environment: $INACTIVE"

# Rollback function on failure
rollback() {
    log_error "Deployment failed, initiating rollback"
    ln -sfn "${DEPLOY_DIR}/${ACTIVE}" "$CURRENT_LINK"
    log_info "Rolled back to $ACTIVE environment"
    exit 1
}

trap rollback ERR
