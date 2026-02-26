#!/usr/bin/env bash
set -euo pipefail

EXPECTED_VERSION="${1:-0.3.1}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

check_contains() {
  local file="$1"
  local needle="$2"
  if ! grep -Fq "$needle" "$file"; then
    echo "[release-version] mismatch in $file (expected to find: $needle)"
    exit 1
  fi
}

check_contains "${ROOT_DIR}/flutter/circlebox_flutter/pubspec.yaml" "version: ${EXPECTED_VERSION}"
check_contains "${ROOT_DIR}/flutter/circlebox_cloud_flutter/pubspec.yaml" "version: ${EXPECTED_VERSION}"
check_contains "${ROOT_DIR}/flutter/circlebox_adapters/pubspec.yaml" "version: ${EXPECTED_VERSION}"

check_contains "${ROOT_DIR}/react-native/circlebox-react-native/package.json" "\"version\": \"${EXPECTED_VERSION}\""
check_contains "${ROOT_DIR}/react-native/circlebox-cloud-react-native/package.json" "\"version\": \"${EXPECTED_VERSION}\""

check_contains "${ROOT_DIR}/android/circlebox-sdk/build.gradle.kts" "version = \"${EXPECTED_VERSION}\""
check_contains "${ROOT_DIR}/android/circlebox-cloud/build.gradle.kts" "version = \"${EXPECTED_VERSION}\""
check_contains "${ROOT_DIR}/integrations/android/circlebox-integrations/build.gradle.kts" "version = \"${EXPECTED_VERSION}\""

echo "[release-version] PASS (${EXPECTED_VERSION})"
