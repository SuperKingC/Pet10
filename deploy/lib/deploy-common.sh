#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PROJECT_DIR="${DEPLOY_PROJECT_DIR:-$REPO_ROOT}"
COMPOSE_FILE="${DEPLOY_COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${DEPLOY_ENV_FILE:-.env.production}"
PUBLIC_URL="${DEPLOY_PUBLIC_URL:-}"
STATIC_ASSET_BASE_URL="${STATIC_ASSET_BASE_URL:-}"
STATIC_ASSET_VERSION="${STATIC_ASSET_VERSION:-}"
STATE_DIR="${DEPLOY_STATE_DIR:-$HOME/.pet10-deploy}"
STATE_FILE="$STATE_DIR/last-deploy.env"

log() {
  printf '[pet10-deploy] %s\n' "$*"
}

fail() {
  printf '[pet10-deploy] ERROR: %s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

assert_environment() {
  require_command git
  require_command docker
  require_command curl
  cd "$PROJECT_DIR"
  [ -f "$COMPOSE_FILE" ] || fail "Compose file not found: $PROJECT_DIR/$COMPOSE_FILE"
  [ -f "$ENV_FILE" ] || fail "Environment file not found: $PROJECT_DIR/$ENV_FILE"
  [ -z "$(git status --porcelain)" ] || fail "Server worktree is not clean"
  mkdir -p "$STATE_DIR"
}

resolve_target_commit() {
  local requested="${1:-origin/main}"
  git fetch --prune origin main
  local target
  target="$(git rev-parse --verify "${requested}^{commit}")" || fail "Unknown commit: $requested"
  git merge-base --is-ancestor "$target" origin/main || fail "Target commit is not on origin/main: $target"
  printf '%s\n' "$target"
}

prepare_deploy() {
  local requested="${1:-origin/main}"
  local service="$2"
  assert_environment
  PREVIOUS_COMMIT="$(git rev-parse HEAD)"
  TARGET_COMMIT="$(resolve_target_commit "$requested")"
  DEPLOY_SERVICE="$service"
  log "Previous revision: $PREVIOUS_COMMIT"
  log "Target revision:   $TARGET_COMMIT"
  log "Deploy service:    $DEPLOY_SERVICE"
  git checkout --detach "$TARGET_COMMIT"
  STATIC_ASSET_VERSION="$TARGET_COMMIT"
  export STATIC_ASSET_VERSION
}

save_deploy_state() {
  cat >"$STATE_FILE" <<EOF
PREVIOUS_COMMIT=$PREVIOUS_COMMIT
TARGET_COMMIT=$TARGET_COMMIT
DEPLOY_SERVICE=$DEPLOY_SERVICE
STATIC_ASSET_BASE_URL=$STATIC_ASSET_BASE_URL
EOF
}

assert_static_asset_config() {
  [ -n "$STATIC_ASSET_BASE_URL" ] || fail "STATIC_ASSET_BASE_URL is required for web deployment"
  [ -n "$STATIC_ASSET_VERSION" ] || fail "STATIC_ASSET_VERSION is required for web deployment"
  export STATIC_ASSET_BASE_URL STATIC_ASSET_VERSION
}

persist_static_asset_config() {
  assert_static_asset_config
  local environment_directory
  local temporary_file
  environment_directory="$(dirname "$ENV_FILE")"
  temporary_file="$(mktemp "$environment_directory/.pet10-env.XXXXXX")"

  if ! awk '
    !/^STATIC_ASSET_BASE_URL=/ &&
    !/^STATIC_ASSET_VERSION=/
  ' "$ENV_FILE" >"$temporary_file"; then
    rm -f "$temporary_file"
    fail "Could not prepare static asset configuration"
  fi

  {
    printf '\nSTATIC_ASSET_BASE_URL=%s\n' "$STATIC_ASSET_BASE_URL"
    printf 'STATIC_ASSET_VERSION=%s\n' "$STATIC_ASSET_VERSION"
  } >>"$temporary_file"

  chmod --reference="$ENV_FILE" "$temporary_file"
  mv "$temporary_file" "$ENV_FILE"
  log "Persisted static asset delivery configuration"
}

restart_static_delivery() {
  assert_static_asset_config
  compose up -d --no-deps --force-recreate caddy
}

wait_for_url() {
  local url="$1"
  local attempts="${2:-30}"
  local delay="${3:-2}"
  local attempt
  for ((attempt = 1; attempt <= attempts; attempt += 1)); do
    if curl --fail --silent --show-error --max-time 10 "$url" >/dev/null; then
      log "Healthy: $url"
      return 0
    fi
    sleep "$delay"
  done
  fail "Health check failed: $url"
}

verify_public_endpoints() {
  [ -n "$PUBLIC_URL" ] || fail "DEPLOY_PUBLIC_URL is required"
  local base="${PUBLIC_URL%/}"
  wait_for_url "$base/healthz"
  wait_for_url "$base/health"
}

verify_static_asset_redirect() {
  assert_static_asset_config
  [ -n "$PUBLIC_URL" ] || fail "DEPLOY_PUBLIC_URL is required"
  local source="${PUBLIC_URL%/}/pet/xiaoduoli.png"
  local expected="${STATIC_ASSET_BASE_URL%/}/${STATIC_ASSET_VERSION}/pet/xiaoduoli.png"
  local location
  location="$(curl --silent --show-error --head --max-time 10 "$source" | tr -d '\r' | awk -F ': ' 'tolower($1) == "location" { print $2 }')"
  [ "$location" = "$expected" ] || fail "Unexpected static redirect: ${location:-missing}; expected $expected"
  log "Static assets: $expected"
}

print_success() {
  log "Deployment completed"
  log "Old revision: $PREVIOUS_COMMIT"
  log "New revision: $TARGET_COMMIT"
  log "Service: $DEPLOY_SERVICE"
  log "URL: ${PUBLIC_URL%/}"
  log "Rollback: STATIC_ASSET_BASE_URL='$STATIC_ASSET_BASE_URL' DEPLOY_PUBLIC_URL='$PUBLIC_URL' ./deploy/rollback.sh"
}
