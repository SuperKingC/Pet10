#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/deploy-common.sh"

assert_environment
[ -f "$STATE_FILE" ] || fail "No deployment state found: $STATE_FILE"
source "$STATE_FILE"

ROLLBACK_COMMIT="$(resolve_target_commit "${1:-$PREVIOUS_COMMIT}")"
git checkout --detach "$ROLLBACK_COMMIT"

case "$DEPLOY_SERVICE" in
  web)
    compose build web
    compose up -d --no-deps web
    ;;
  api)
    compose build api
    compose up -d --no-deps api
    ;;
  all)
    compose up -d --build
    ;;
  *)
    fail "Unknown deployment service in state: $DEPLOY_SERVICE"
    ;;
esac

verify_public_endpoints
log "Rollback completed: $ROLLBACK_COMMIT"
