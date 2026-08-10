#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/deploy-common.sh"

prepare_deploy "${1:-origin/main}" all
save_deploy_state
compose up -d --build
verify_public_endpoints
print_success
