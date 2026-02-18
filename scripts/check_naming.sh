#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v rg >/dev/null 2>&1; then
  echo "ripgrep (rg) is required" >&2
  exit 2
fi

set +e
MATCHES=$(rg -n -S "blackbox|BlackBox|BLACKBOX" \
  --glob '!scripts/check_naming.sh' \
  --glob '!docs/migration.md' \
  --glob '!.git/*')
STATUS=$?
set -e

if [[ $STATUS -eq 0 ]]; then
  echo "Found disallowed naming references:" >&2
  echo "$MATCHES" >&2
  exit 1
fi

if [[ $STATUS -eq 1 ]]; then
  echo "Naming check passed"
  exit 0
fi

echo "Naming check failed unexpectedly" >&2
exit $STATUS
