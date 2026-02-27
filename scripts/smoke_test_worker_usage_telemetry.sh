#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env.local"

BASE_URL=""
REGION="us"
INGEST_KEY=""
USAGE_KEY=""
CONTROL_URL=""
CONTROL_SERVICE_ROLE=""
KEEP_TEMP=0

usage() {
  cat <<'EOF'
Usage: scripts/smoke_test_worker_usage_telemetry.sh [options]

Usage telemetry + key lifecycle smoke checks:
1) ingests a report to resolve project_id
2) sends usage telemetry rows (ios/android/flutter/react_native)
3) validates key auth negatives (invalid key, wrong key type, revoked key)
4) validates ingest key lifecycle (valid, revoked, malformed/wrong-region token)

Options:
  --env-file PATH            Env file path (default: .env.local)
  --base-url URL             Worker base URL (default: WORKER_PUBLIC_BASE_URL from env)
  --region REGION            us|eu metadata hint (default: us)
  --ingest-key KEY           Ingest key (or CIRCLEBOX_INGEST_KEY[_US/_EU])
  --usage-key KEY            Usage key (or CIRCLEBOX_USAGE_KEY[_US/_EU]); if absent, auto-created via control-plane
  --control-url URL          Control-plane Supabase URL (or CONTROL_SUPABASE_URL)
  --control-service-role KEY Control-plane service-role key (or CONTROL_SUPABASE_SERVICE_ROLE_KEY)
  --keep-temp                Keep temp payload/response files
  -h, --help                 Show help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      ENV_FILE="$2"; shift 2 ;;
    --base-url)
      BASE_URL="$2"; shift 2 ;;
    --region)
      REGION="$2"; shift 2 ;;
    --ingest-key)
      INGEST_KEY="$2"; shift 2 ;;
    --usage-key)
      USAGE_KEY="$2"; shift 2 ;;
    --control-url)
      CONTROL_URL="$2"; shift 2 ;;
    --control-service-role)
      CONTROL_SERVICE_ROLE="$2"; shift 2 ;;
    --keep-temp)
      KEEP_TEMP=1; shift ;;
    -h|--help)
      usage; exit 0 ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

require_cmd curl
require_cmd python3

if [[ -f "$ENV_FILE" ]]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

if [[ -z "$BASE_URL" ]]; then
  BASE_URL="${WORKER_PUBLIC_BASE_URL:-}"
fi
if [[ -z "$BASE_URL" ]]; then
  echo "Missing worker base URL. Set WORKER_PUBLIC_BASE_URL or pass --base-url." >&2
  exit 1
fi

if [[ -z "$INGEST_KEY" ]]; then
  if [[ "$REGION" == "eu" ]]; then
    INGEST_KEY="${CIRCLEBOX_INGEST_KEY_EU:-}"
  else
    INGEST_KEY="${CIRCLEBOX_INGEST_KEY_US:-}"
  fi
fi
if [[ -z "$INGEST_KEY" ]]; then
  INGEST_KEY="${CIRCLEBOX_INGEST_KEY:-}"
fi
if [[ -z "$INGEST_KEY" ]]; then
  echo "Missing ingest key." >&2
  exit 1
fi

if [[ -z "$USAGE_KEY" ]]; then
  if [[ "$REGION" == "eu" ]]; then
    USAGE_KEY="${CIRCLEBOX_USAGE_KEY_EU:-}"
  else
    USAGE_KEY="${CIRCLEBOX_USAGE_KEY_US:-}"
  fi
fi
if [[ -z "$USAGE_KEY" ]]; then
  USAGE_KEY="${CIRCLEBOX_USAGE_KEY:-}"
fi

if [[ -z "$CONTROL_URL" ]]; then
  CONTROL_URL="${CONTROL_SUPABASE_URL:-}"
fi
if [[ -z "$CONTROL_SERVICE_ROLE" ]]; then
  CONTROL_SERVICE_ROLE="${CONTROL_SUPABASE_SERVICE_ROLE_KEY:-}"
fi

TMP_DIR="$(mktemp -d /tmp/circlebox-usage-smoke.XXXXXX)"
if [[ "$KEEP_TEMP" -eq 0 ]]; then
  trap 'rm -rf "$TMP_DIR"' EXIT
fi

uuidgen_lower() {
  python3 - <<'PY'
import uuid
print(str(uuid.uuid4()))
PY
}

now_ms() {
  python3 - <<'PY'
import time
print(int(time.time() * 1000))
PY
}

today_utc() {
  python3 - <<'PY'
from datetime import datetime, timezone
print(datetime.now(timezone.utc).strftime("%Y-%m-%d"))
PY
}

json_field() {
  local file="$1"
  local key="$2"
  python3 - "$file" "$key" <<'PY'
import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as fh:
    data = json.load(fh)
value = data.get(sys.argv[2])
if value is None:
    print("")
elif isinstance(value, (dict, list)):
    print(json.dumps(value))
else:
    print(value)
PY
}

assert_http() {
  local expected="$1"
  local actual="$2"
  local label="$3"
  local body="$4"
  if [[ "$actual" != "$expected" ]]; then
    echo "[smoke_test_worker_usage] ${label} failed (expected ${expected}, got ${actual})" >&2
    cat "$body" >&2
    exit 1
  fi
}

assert_contains() {
  local pattern="$1"
  local label="$2"
  local body="$3"
  if ! grep -Eq "$pattern" "$body"; then
    echo "[smoke_test_worker_usage] ${label} assertion failed: ${pattern}" >&2
    cat "$body" >&2
    exit 1
  fi
}

CONTROL_ENABLED=0
if [[ -n "$CONTROL_URL" && -n "$CONTROL_SERVICE_ROLE" ]]; then
  CONTROL_ENABLED=1
fi

SESSION_ID="$(uuidgen_lower)"
NOW_MS="$(now_ms)"
PROJECT_RESOLVE_PAYLOAD="${TMP_DIR}/project-resolve-report.json"

cat > "$PROJECT_RESOLVE_PAYLOAD" <<EOF
{
  "schema_version": 2,
  "session_id": "${SESSION_ID}",
  "platform": "android",
  "app_version": "1.0.0",
  "build_number": "1",
  "os_version": "14",
  "device_model": "usage-smoke",
  "export_source": "live_snapshot",
  "capture_reason": "manual_export",
  "generated_at_unix_ms": ${NOW_MS},
  "events": [
    {
      "seq": 1,
      "timestamp_unix_ms": ${NOW_MS},
      "uptime_ms": 123,
      "type": "native_exception_prehook",
      "thread": "crash",
      "severity": "fatal",
      "attrs": {"reason":"usage_smoke"}
    }
  ]
}
EOF

project_resolve_resp="${TMP_DIR}/project-resolve-response.json"
project_resolve_http="$(curl -sS -o "$project_resolve_resp" -w "%{http_code}" \
  -X POST "${BASE_URL}/v1/ingest/report" \
  -H "x-circlebox-ingest-key: ${INGEST_KEY}" \
  -H "x-circlebox-idempotency-key: cb_usage_resolve_${NOW_MS}" \
  -H "content-type: application/json" \
  --data-binary "@${PROJECT_RESOLVE_PAYLOAD}")"
assert_http "202" "$project_resolve_http" "project_id resolve ingest" "$project_resolve_resp"
PROJECT_ID="$(json_field "$project_resolve_resp" "project_id")"
if [[ -z "$PROJECT_ID" ]]; then
  echo "[smoke_test_worker_usage] missing project_id in ingest response" >&2
  cat "$project_resolve_resp" >&2
  exit 1
fi

CLI_HOME="${TMP_DIR}/cli-home"
USAGE_KEY_ID=""
INGEST_TEST_KEY=""
INGEST_TEST_KEY_ID=""
CLI_AUTH_READY=0

cli_auth_login() {
  if [[ "$CLI_AUTH_READY" -eq 1 ]]; then
    return
  fi
  CIRCLEBOX_CLI_HOME="$CLI_HOME" \
    bash "${ROOT_DIR}/scripts/cli/circlebox.sh" auth login \
      --control-url "$CONTROL_URL" \
      --service-role "$CONTROL_SERVICE_ROLE" >/dev/null
  CLI_AUTH_READY=1
}

create_key() {
  local key_type="$1"
  CIRCLEBOX_CLI_HOME="$CLI_HOME" \
    bash "${ROOT_DIR}/scripts/cli/circlebox.sh" key create \
      --project-id "$PROJECT_ID" \
      --type "$key_type"
}

revoke_key() {
  local key_id="$1"
  CIRCLEBOX_CLI_HOME="$CLI_HOME" \
    bash "${ROOT_DIR}/scripts/cli/circlebox.sh" key revoke \
      --project-id "$PROJECT_ID" \
      --key-id "$key_id" >/dev/null
}

if [[ -z "$USAGE_KEY" && "$CONTROL_ENABLED" -eq 1 ]]; then
  cli_auth_login
  key_output="$(create_key "usage_beacon")"
  USAGE_KEY_ID="$(printf '%s\n' "$key_output" | sed -n 's/^key_created id=\([^ ]*\).*/\1/p')"
  USAGE_KEY="$(printf '%s\n' "$key_output" | sed -n 's/^secret=\(.*\)$/\1/p')"
fi

if [[ -z "$USAGE_KEY" ]]; then
  echo "[smoke_test_worker_usage] missing usage key and cannot auto-provision (control-plane creds not set)" >&2
  exit 1
fi

post_usage() {
  local usage_key="$1"
  local family="$2"
  local version="$3"
  local mode="$4"
  local body_file="$5"
  local payload_file="$6"
  local active_apps="$7"
  local crash_reports="$8"
  local events_emitted="$9"

  cat > "$payload_file" <<EOF
{
  "sdk_family":"${family}",
  "sdk_version":"${version}",
  "mode":"${mode}",
  "usage_date":"$(today_utc)",
  "active_apps":${active_apps},
  "crash_reports":${crash_reports},
  "events_emitted":${events_emitted}
}
EOF

  curl -sS -o "$body_file" -w "%{http_code}" \
    -X POST "${BASE_URL}/v1/telemetry/usage" \
    -H "x-circlebox-usage-key: ${usage_key}" \
    -H "content-type: application/json" \
    --data-binary "@${payload_file}"
}

families=(ios android flutter react_native)
index=0
for family in "${families[@]}"; do
  response_file="${TMP_DIR}/usage-${family}.json"
  payload_file="${TMP_DIR}/usage-${family}-payload.json"
  http_code="$(post_usage "$USAGE_KEY" "$family" "0.3.1-smoke" "core_cloud" "$response_file" "$payload_file" 1 $((index + 1)) $((100 + index)))"
  assert_http "202" "$http_code" "usage telemetry ${family}" "$response_file"
  assert_contains '"status"[[:space:]]*:[[:space:]]*"accepted"' "usage telemetry accepted (${family})" "$response_file"
  assert_contains "\"project_id\"[[:space:]]*:[[:space:]]*\"${PROJECT_ID}\"" "usage telemetry project_id (${family})" "$response_file"
  index=$((index + 1))
done

# Negative: malformed usage key
bad_usage_resp="${TMP_DIR}/usage-invalid-key.json"
bad_usage_payload="${TMP_DIR}/usage-invalid-key-payload.json"
http_code="$(post_usage "cb_usage_invalid_smoke_key" "ios" "0.3.1-smoke" "core_cloud" "$bad_usage_resp" "$bad_usage_payload" 1 1 1)"
assert_http "401" "$http_code" "invalid usage key rejection" "$bad_usage_resp"
assert_contains '"invalid_usage_key"' "invalid usage key error" "$bad_usage_resp"

# Negative: wrong key type for usage endpoint (ingest key)
wrong_type_usage_resp="${TMP_DIR}/usage-wrong-key-type.json"
wrong_type_usage_payload="${TMP_DIR}/usage-wrong-key-type-payload.json"
http_code="$(post_usage "$INGEST_KEY" "ios" "0.3.1-smoke" "core_cloud" "$wrong_type_usage_resp" "$wrong_type_usage_payload" 1 1 1)"
assert_http "401" "$http_code" "ingest key rejected on usage endpoint" "$wrong_type_usage_resp"
assert_contains '"invalid_usage_key"' "ingest key rejected on usage endpoint payload" "$wrong_type_usage_resp"

# Negative: wrong key type for ingest endpoint (usage key)
usage_on_ingest_resp="${TMP_DIR}/usage-on-ingest.json"
http_code="$(curl -sS -o "$usage_on_ingest_resp" -w "%{http_code}" \
  -X POST "${BASE_URL}/v1/ingest/report" \
  -H "x-circlebox-ingest-key: ${USAGE_KEY}" \
  -H "x-circlebox-idempotency-key: cb_usage_wrong_type_${NOW_MS}" \
  -H "content-type: application/json" \
  --data-binary "@${PROJECT_RESOLVE_PAYLOAD}")"
assert_http "401" "$http_code" "usage key rejected on ingest endpoint" "$usage_on_ingest_resp"
assert_contains '"invalid_ingest_key"' "usage key rejected on ingest endpoint payload" "$usage_on_ingest_resp"

# Optional control-plane assertions + lifecycle tests.
if [[ "$CONTROL_ENABLED" -eq 1 ]]; then
  cli_auth_login
  usage_rows_file="${TMP_DIR}/usage-rows.json"
  usage_date="$(today_utc)"
  usage_query="project_id=eq.${PROJECT_ID}&usage_date=eq.${usage_date}&select=sdk_family&limit=200"
  usage_rows_http="$(curl -sS -o "$usage_rows_file" -w "%{http_code}" \
    -H "Authorization: Bearer ${CONTROL_SERVICE_ROLE}" \
    -H "apikey: ${CONTROL_SERVICE_ROLE}" \
    -H "accept: application/json" \
    "${CONTROL_URL%/}/rest/v1/usage_beacon_daily?${usage_query}")"
  assert_http "200" "$usage_rows_http" "control-plane usage_beacon_daily query" "$usage_rows_file"
  python3 - "$usage_rows_file" <<'PY'
import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as fh:
    rows = json.load(fh)
families = {row.get("sdk_family") for row in rows if isinstance(row, dict)}
expected = {"ios", "android", "flutter", "react_native"}
missing = sorted(expected - families)
if missing:
    raise SystemExit(f"missing sdk_family rows in usage_beacon_daily: {missing}")
PY

  # Revoke created usage key and ensure it fails.
  if [[ -n "$USAGE_KEY_ID" ]]; then
    revoke_key "$USAGE_KEY_ID"
    revoked_usage_resp="${TMP_DIR}/usage-revoked-key.json"
    revoked_usage_payload="${TMP_DIR}/usage-revoked-key-payload.json"
    http_code="$(post_usage "$USAGE_KEY" "ios" "0.3.1-smoke" "core_cloud" "$revoked_usage_resp" "$revoked_usage_payload" 1 1 1)"
    assert_http "401" "$http_code" "revoked usage key rejection" "$revoked_usage_resp"
    assert_contains '"invalid_usage_key"' "revoked usage key error" "$revoked_usage_resp"
  fi

  # Create/revoke ingest key lifecycle and malformed token test.
  ingest_output="$(create_key "ingest")"
  INGEST_TEST_KEY_ID="$(printf '%s\n' "$ingest_output" | sed -n 's/^key_created id=\([^ ]*\).*/\1/p')"
  INGEST_TEST_KEY="$(printf '%s\n' "$ingest_output" | sed -n 's/^secret=\(.*\)$/\1/p')"
  if [[ -z "$INGEST_TEST_KEY_ID" || -z "$INGEST_TEST_KEY" ]]; then
    echo "[smoke_test_worker_usage] failed to create ingest lifecycle test key" >&2
    exit 1
  fi

  ingest_lifecycle_ok="${TMP_DIR}/ingest-lifecycle-ok.json"
  http_code="$(curl -sS -o "$ingest_lifecycle_ok" -w "%{http_code}" \
    -X POST "${BASE_URL}/v1/ingest/report" \
    -H "x-circlebox-ingest-key: ${INGEST_TEST_KEY}" \
    -H "x-circlebox-idempotency-key: cb_ingest_lifecycle_ok_${NOW_MS}" \
    -H "content-type: application/json" \
    --data-binary "@${PROJECT_RESOLVE_PAYLOAD}")"
  assert_http "202" "$http_code" "new ingest key accepted" "$ingest_lifecycle_ok"

  # Wrong-region/malformed token mutation should be rejected.
  wrong_region_key="$INGEST_TEST_KEY"
  if [[ "$wrong_region_key" == *"_us_"* ]]; then
    wrong_region_key="${wrong_region_key/_us_/_eu_}"
  elif [[ "$wrong_region_key" == *"_eu_"* ]]; then
    wrong_region_key="${wrong_region_key/_eu_/_us_}"
  else
    wrong_region_key="${wrong_region_key}_eu"
  fi
  ingest_wrong_region_resp="${TMP_DIR}/ingest-wrong-region.json"
  http_code="$(curl -sS -o "$ingest_wrong_region_resp" -w "%{http_code}" \
    -X POST "${BASE_URL}/v1/ingest/report" \
    -H "x-circlebox-ingest-key: ${wrong_region_key}" \
    -H "x-circlebox-idempotency-key: cb_ingest_wrong_region_${NOW_MS}" \
    -H "content-type: application/json" \
    --data-binary "@${PROJECT_RESOLVE_PAYLOAD}")"
  assert_http "401" "$http_code" "wrong-region/malformed ingest key rejection" "$ingest_wrong_region_resp"
  assert_contains '"invalid_ingest_key"' "wrong-region/malformed ingest key payload" "$ingest_wrong_region_resp"

  revoke_key "$INGEST_TEST_KEY_ID"
  ingest_revoked_resp="${TMP_DIR}/ingest-revoked.json"
  http_code="$(curl -sS -o "$ingest_revoked_resp" -w "%{http_code}" \
    -X POST "${BASE_URL}/v1/ingest/report" \
    -H "x-circlebox-ingest-key: ${INGEST_TEST_KEY}" \
    -H "x-circlebox-idempotency-key: cb_ingest_revoked_${NOW_MS}" \
    -H "content-type: application/json" \
    --data-binary "@${PROJECT_RESOLVE_PAYLOAD}")"
  assert_http "401" "$http_code" "revoked ingest key rejection" "$ingest_revoked_resp"
  assert_contains '"invalid_ingest_key"' "revoked ingest key payload" "$ingest_revoked_resp"
fi

echo "[smoke_test_worker_usage] PASS"
if [[ "$KEEP_TEMP" -eq 1 ]]; then
  echo "[smoke_test_worker_usage] Response artifacts kept in: $TMP_DIR"
fi
