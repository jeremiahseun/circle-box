#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log() {
  printf '\n==> %s\n' "$1"
}

run_step() {
  local name="$1"
  shift
  log "$name"
  "$@"
}

run_step "Naming guard" "${ROOT_DIR}/scripts/check_naming.sh"
run_step "Release version map" "${ROOT_DIR}/scripts/check_release_versions.sh" "0.3.0"
run_step "Schema parity fixtures" "${ROOT_DIR}/scripts/check_schema_parity.py"

run_step "Dashboard checks" /bin/zsh -lc "cd '${ROOT_DIR}/cloud/dashboard' && npm install && npm run typecheck && npm run check:links && npm run build"
run_step "Worker typecheck" /bin/zsh -lc "cd '${ROOT_DIR}/cloud/circlebox-cloud/edge/worker' && npm install && npm run typecheck"

run_step "iOS SDK tests" /bin/zsh -lc "cd '${ROOT_DIR}/ios/CircleBoxSDK' && swift test"
run_step "iOS cloud tests" /bin/zsh -lc "cd '${ROOT_DIR}/ios/CircleBoxCloud' && swift test"

run_step "Android SDK tests" /bin/zsh -lc "cd '${ROOT_DIR}/android/circlebox-sdk' && export ANDROID_HOME=\$HOME/Library/Android/sdk && export ANDROID_SDK_ROOT=\$HOME/Library/Android/sdk && ./gradlew --no-daemon test"
run_step "Android cloud tests" /bin/zsh -lc "cd '${ROOT_DIR}/android/circlebox-cloud' && export ANDROID_HOME=\$HOME/Library/Android/sdk && export ANDROID_SDK_ROOT=\$HOME/Library/Android/sdk && ../circlebox-sdk/gradlew --no-daemon -p . test"

run_step "Flutter core checks" /bin/zsh -lc "cd '${ROOT_DIR}/flutter/circlebox_flutter' && flutter pub get && flutter analyze && flutter test"
run_step "Flutter cloud checks" /bin/zsh -lc "cd '${ROOT_DIR}/flutter/circlebox_cloud_flutter' && flutter pub get && flutter analyze && flutter test"
run_step "Flutter adapters checks" /bin/zsh -lc "cd '${ROOT_DIR}/flutter/circlebox_adapters' && flutter pub get && dart test"

run_step "React Native core typecheck" /bin/zsh -lc "cd '${ROOT_DIR}/react-native/circlebox-react-native' && npm install && npm run typecheck"
run_step "React Native cloud typecheck" /bin/zsh -lc "cd '${ROOT_DIR}/react-native/circlebox-cloud-react-native' && npm install && npm run typecheck"

if [[ -n "${CIRCLEBOX_WORKER_BASE_URL:-}" && -n "${CIRCLEBOX_SMOKE_INGEST_KEY:-}" ]]; then
  run_step "Worker ingest smoke" /bin/zsh -lc "cd '${ROOT_DIR}' && ./scripts/smoke_test_worker_ingest.sh --base-url '${CIRCLEBOX_WORKER_BASE_URL}' --ingest-key '${CIRCLEBOX_SMOKE_INGEST_KEY}' ${DASHBOARD_WORKER_TOKEN:+--dashboard-token '${DASHBOARD_WORKER_TOKEN}'}"
else
  log "Worker ingest smoke skipped (set CIRCLEBOX_WORKER_BASE_URL and CIRCLEBOX_SMOKE_INGEST_KEY to enable)"
fi

log "Release check complete"
