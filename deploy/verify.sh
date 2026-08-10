#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/deploy-common.sh"

assert_environment
compose ps
verify_public_endpoints
log "Revision: $(git rev-parse HEAD)"
