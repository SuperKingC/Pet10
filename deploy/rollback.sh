#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/deploy-common.sh"

assert_environment
[ -f "$STATE_FILE" ] || fail "No deployment state found: $STATE_FILE"
source "$STATE_FILE"

ROLLBACK_COMMIT="$(resolve_target_commit "${1:-$PREVIOUS_COMMIT}")"
git checkout --detach "$ROLLBACK_COMMIT"
STATIC_ASSET_VERSION="$ROLLBACK_COMMIT"
export STATIC_ASSET_VERSION

case "$DEPLOY_SERVICE" in
  web)
    compose build web
    compose up -d --no-deps web
    restart_static_delivery
    ;;
  api)
    compose build api
    compose up -d --no-deps api
    ;;
  all)
    assert_static_asset_config
    compose up -d --build
    restart_static_delivery
    ;;
  *)
    fail "Unknown deployment service in state: $DEPLOY_SERVICE"
    ;;
esac

verify_public_endpoints
if [ "$DEPLOY_SERVICE" != "api" ]; then
  verify_static_asset_redirect
  persist_static_asset_config
fi
log "Rollback completed: $ROLLBACK_COMMIT"
