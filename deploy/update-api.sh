#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/deploy-common.sh"

prepare_deploy "${1:-origin/main}" api
save_deploy_state
compose build api
compose up -d --no-deps api
verify_public_endpoints
print_success
