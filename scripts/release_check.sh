#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RELEASE_VERSION="${RELEASE_VERSION:-0.3.1}"
RELEASE_STRICT_REMOTE_DEPS="${RELEASE_STRICT_REMOTE_DEPS:-0}"

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
run_step "Release version map" "${ROOT_DIR}/scripts/check_release_versions.sh" "${RELEASE_VERSION}"
run_step "Schema parity fixtures" "${ROOT_DIR}/scripts/check_schema_parity.py"
run_step "CLI syntax check" /bin/zsh -lc "bash -n '${ROOT_DIR}/scripts/cli/circlebox.sh'"

run_step "Dashboard checks" /bin/zsh -lc "cd '${ROOT_DIR}/cloud/dashboard' && npm install && npm run typecheck && npm run check:links && npm run build"
run_step "Worker typecheck" /bin/zsh -lc "cd '${ROOT_DIR}/cloud/circlebox-cloud/edge/worker' && npm install && npm run typecheck"

run_step "iOS SDK tests" /bin/zsh -lc "cd '${ROOT_DIR}/ios/CircleBoxSDK' && swift test"
run_step "iOS cloud tests" /bin/zsh -lc "cd '${ROOT_DIR}/ios/CircleBoxCloud' && swift test"

run_step "Android SDK tests" /bin/zsh -lc "cd '${ROOT_DIR}/android/circlebox-sdk' && export ANDROID_HOME=\$HOME/Library/Android/sdk && export ANDROID_SDK_ROOT=\$HOME/Library/Android/sdk && ./gradlew --no-daemon test"
run_step "Android cloud tests" /bin/zsh -lc "cd '${ROOT_DIR}/android/circlebox-cloud' && export ANDROID_HOME=\$HOME/Library/Android/sdk && export ANDROID_SDK_ROOT=\$HOME/Library/Android/sdk && ./gradlew --no-daemon test"
run_step "Android integrations tests" /bin/zsh -lc "cd '${ROOT_DIR}/integrations/android/circlebox-integrations' && ./gradlew --no-daemon test"

if [[ "${RELEASE_STRICT_REMOTE_DEPS}" == "1" ]]; then
  run_step "Flutter core checks" /bin/zsh -lc "cd '${ROOT_DIR}/flutter/circlebox_flutter' && flutter pub get && flutter analyze && flutter test"
  run_step "Flutter cloud checks" /bin/zsh -lc "cd '${ROOT_DIR}/flutter/circlebox_cloud_flutter' && flutter pub get && flutter analyze && flutter test"
  run_step "Flutter adapters checks" /bin/zsh -lc "cd '${ROOT_DIR}/flutter/circlebox_adapters' && flutter pub get && flutter analyze && flutter test"
else
  run_step "Flutter core checks (local lockfile mode)" /bin/zsh -lc "cd '${ROOT_DIR}/flutter/circlebox_flutter' && flutter analyze --no-pub && flutter test --no-pub"
  run_step "Flutter cloud checks (local lockfile mode)" /bin/zsh -lc "cd '${ROOT_DIR}/flutter/circlebox_cloud_flutter' && flutter analyze --no-pub && flutter test --no-pub"
  run_step "Flutter adapters checks (local lockfile mode)" /bin/zsh -lc "cd '${ROOT_DIR}/flutter/circlebox_adapters' && printf 'dependency_overrides:\n  circlebox_flutter:\n    path: ../circlebox_flutter\n' > pubspec_overrides.yaml && flutter pub get && flutter analyze --no-pub && flutter test --no-pub && rm -f pubspec_overrides.yaml"
fi

run_step "React Native core typecheck" /bin/zsh -lc "cd '${ROOT_DIR}/react-native/circlebox-react-native' && npm install && npm run typecheck"
run_step "React Native cloud typecheck" /bin/zsh -lc "cd '${ROOT_DIR}/react-native/circlebox-cloud-react-native' && npm install && npm run typecheck"

if [[ -n "${CIRCLEBOX_WORKER_BASE_URL:-}" && -n "${CIRCLEBOX_SMOKE_INGEST_KEY:-}" ]]; then
  run_step "Worker ingest smoke" /bin/zsh -lc "cd '${ROOT_DIR}' && ./scripts/smoke_test_worker_ingest.sh --base-url '${CIRCLEBOX_WORKER_BASE_URL}' --ingest-key '${CIRCLEBOX_SMOKE_INGEST_KEY}' ${DASHBOARD_WORKER_TOKEN:+--dashboard-token '${DASHBOARD_WORKER_TOKEN}'}"
else
  log "Worker ingest smoke skipped (set CIRCLEBOX_WORKER_BASE_URL and CIRCLEBOX_SMOKE_INGEST_KEY to enable)"
fi

if [[ -n "${CIRCLEBOX_WORKER_BASE_URL:-}" && -n "${CIRCLEBOX_SMOKE_INGEST_KEY:-}" && -n "${CONTROL_SUPABASE_URL:-}" && -n "${CONTROL_SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  run_step "Worker usage/key-auth smoke" /bin/zsh -lc "cd '${ROOT_DIR}' && ./scripts/smoke_test_worker_usage_telemetry.sh --base-url '${CIRCLEBOX_WORKER_BASE_URL}' --ingest-key '${CIRCLEBOX_SMOKE_INGEST_KEY}' --control-url '${CONTROL_SUPABASE_URL}' --control-service-role '${CONTROL_SUPABASE_SERVICE_ROLE_KEY}'"
else
  log "Worker usage/key-auth smoke skipped (set CIRCLEBOX_WORKER_BASE_URL, CIRCLEBOX_SMOKE_INGEST_KEY, CONTROL_SUPABASE_URL, CONTROL_SUPABASE_SERVICE_ROLE_KEY)"
fi

log "Release check complete"
