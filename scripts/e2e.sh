#!/usr/bin/env bash
# Runs the end-to-end tests against a running server (default http://localhost:3000).
# The server must run with TS11_RELAXED_RATE_LIMITS=1 (tests make many accounts from one IP)
# and without SES, so mail lands in $DEV_DATA_DIR/outbox.
set -euo pipefail
cd "$(dirname "$0")/.."
status=0
for t in tests/e2e/sync.e2e.mjs tests/e2e/auth-api.e2e.mjs tests/e2e/images.e2e.mjs; do
  echo "== $t"
  node "$t" || status=1
done
exit $status
