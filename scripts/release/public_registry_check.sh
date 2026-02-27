#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VERSION="${1:-0.3.1}"

require_match() {
  local file="$1"
  local pattern="$2"
  if ! grep -Eq "$pattern" "$file"; then
    echo "[public-registry-check] missing pattern in ${file}: ${pattern}"
    exit 1
  fi
}

"${ROOT_DIR}/scripts/check_release_versions.sh" "${VERSION}"

require_match "${ROOT_DIR}/CircleBoxSDK.podspec" ":tag => \"v#\\{s.version\\}\""
require_match "${ROOT_DIR}/CircleBoxCloud.podspec" ":tag => \"v#\\{s.version\\}\""
require_match "${ROOT_DIR}/react-native/circlebox-react-native/circlebox-react-native.podspec" "s\\.dependency 'CircleBoxSDK'"
require_match "${ROOT_DIR}/docs/release/public-registries.md" "CocoaPods"
require_match "${ROOT_DIR}/docs/release/public-registries.md" "Maven Central"
require_match "${ROOT_DIR}/docs/release/public-registries.md" "pub\\.dev"
require_match "${ROOT_DIR}/docs/release/public-registries.md" "npm"

echo "[public-registry-check] PASS (${VERSION})"
