#!/bin/bash
# Health check script with exponential backoff
# Polls a health endpoint until it responds successfully or timeout
# Usage: ./wait-for-server.sh <URL> [MAX_RETRIES] [INITIAL_DELAY]
# Example: ./wait-for-server.sh http://localhost:5000/health 12 5

set -e

URL="${1:-http://localhost:5000/health}"
MAX_RETRIES="${2:-12}"
INITIAL_DELAY="${3:-5}"
CURRENT_DELAY=$INITIAL_DELAY

echo "Waiting for server at $URL to be healthy..."
echo "Max retries: $MAX_RETRIES, Initial delay: ${INITIAL_DELAY}s"

for i in $(seq 1 $MAX_RETRIES); do
  if curl -f -s -o /dev/null "$URL"; then
    echo "✓ Server is healthy (attempt $i/$MAX_RETRIES)"
    exit 0
  fi
  
  echo "✗ Attempt $i/$MAX_RETRIES failed, retrying in ${CURRENT_DELAY}s..."
  sleep $CURRENT_DELAY
  
  # Exponential backoff: double the delay for next attempt (max 60s)
  CURRENT_DELAY=$((CURRENT_DELAY * 2))
  if [ $CURRENT_DELAY -gt 60 ]; then
    CURRENT_DELAY=60
  fi
done

echo "✗ Server health check failed after $MAX_RETRIES attempts"
echo "  URL: $URL"
echo "  Total wait time: $((INITIAL_DELAY * (2 ** MAX_RETRIES - 1)))s (theoretical max)"
exit 1
