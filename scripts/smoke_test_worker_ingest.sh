#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env.local"
BASE_URL=""
INGEST_KEY="${CIRCLEBOX_INGEST_KEY:-}"
REGION="us"
KEEP_TEMP=0
DASHBOARD_TOKEN=""
SKIP_DOWNLOAD_CHECK=0

usage() {
  cat <<'EOF'
Usage: scripts/smoke_test_worker_ingest.sh [options]

Run end-to-end smoke tests against Worker-first ingest endpoints.

Options:
  --env-file PATH      Path to env file (default: .env.local)
  --base-url URL       Worker base URL (default: WORKER_PUBLIC_BASE_URL from env)
  --ingest-key KEY     Ingest key to use (required if not in env)
  --region REGION      us|eu (default: us), used only in payload metadata
  --dashboard-token T  Worker dashboard token for download-flow checks
  --skip-download-check  Skip dashboard token/download validation
  --keep-temp          Keep temp payload/response files
  -h, --help           Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      ENV_FILE="$2"
      shift 2
      ;;
    --base-url)
      BASE_URL="$2"
      shift 2
      ;;
    --ingest-key)
      INGEST_KEY="$2"
      shift 2
      ;;
    --region)
      REGION="$2"
      shift 2
      ;;
    --dashboard-token)
      DASHBOARD_TOKEN="$2"
      shift 2
      ;;
    --skip-download-check)
      SKIP_DOWNLOAD_CHECK=1
      shift
      ;;
    --keep-temp)
      KEEP_TEMP=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if ! command -v curl >/dev/null 2>&1; then
  echo "Missing required command: curl" >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Env file not found: $ENV_FILE" >&2
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

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
  echo "Missing ingest key. Pass --ingest-key or set CIRCLEBOX_INGEST_KEY(_US/_EU)." >&2
  exit 1
fi

if [[ -z "$DASHBOARD_TOKEN" ]]; then
  DASHBOARD_TOKEN="${DASHBOARD_WORKER_TOKEN:-}"
fi

now_ms() {
  python3 - <<'PY'
import time
print(int(time.time() * 1000))
PY
}

session_id() {
  if command -v uuidgen >/dev/null 2>&1; then
    uuidgen | tr '[:upper:]' '[:lower:]'
  else
    printf '00000000-0000-4000-8000-%012d' "$RANDOM"
  fi
}

TMP_DIR="$(mktemp -d /tmp/circlebox-smoke.XXXXXX)"
if [[ "$KEEP_TEMP" -eq 0 ]]; then
  trap 'rm -rf "$TMP_DIR"' EXIT
fi

SESSION_ID="$(session_id)"
GENERATED_AT="$(now_ms)"
REPORT_IDEM_KEY="cb_smoke_report_${GENERATED_AT}"
FRAGMENT_IDEM_KEY="cb_smoke_fragment_${GENERATED_AT}"

REPORT_PAYLOAD="${TMP_DIR}/report.json"
FRAGMENT_PAYLOAD="${TMP_DIR}/fragment.json"

cat > "$REPORT_PAYLOAD" <<EOF
{
  "schema_version": 2,
  "session_id": "${SESSION_ID}",
  "platform": "ios",
  "app_version": "1.0.0",
  "build_number": "1",
  "os_version": "17.0",
  "device_model": "smoke-sim",
  "export_source": "live_snapshot",
  "capture_reason": "manual_export",
  "generated_at_unix_ms": ${GENERATED_AT},
  "events": [
    {
      "seq": 1,
      "timestamp_unix_ms": ${GENERATED_AT},
      "uptime_ms": 1000,
      "type": "breadcrumb",
      "thread": "main",
      "severity": "info",
      "attrs": {
        "message": "smoke_start"
      }
    },
    {
      "seq": 2,
      "timestamp_unix_ms": $((GENERATED_AT + 1)),
      "uptime_ms": 1001,
      "type": "native_exception_prehook",
      "thread": "crash",
      "severity": "fatal",
      "attrs": {
        "details": "smoke_test"
      }
    }
  ]
}
EOF

cat > "$FRAGMENT_PAYLOAD" <<EOF
{
  "schema_version": 2,
  "session_id": "${SESSION_ID}",
  "platform": "ios",
  "app_version": "1.0.0",
  "build_number": "1",
  "export_source": "live_snapshot",
  "capture_reason": "manual_export",
  "generated_at_unix_ms": ${GENERATED_AT},
  "crash_fingerprint": "fp_smoke",
  "event_count": 2,
  "critical_events": [
    {
      "seq": 2,
      "type": "native_exception_prehook",
      "severity": "fatal",
      "attrs": {
        "details": "smoke_test"
      },
      "timestamp_unix_ms": $((GENERATED_AT + 1))
    }
  ]
}
EOF

request_and_capture() {
  local endpoint="$1"
  local payload_file="$2"
  local idem_key="$3"
  local response_file="$4"

  curl -sS -o "$response_file" -w "%{http_code}" \
    -X POST "${BASE_URL}${endpoint}" \
    -H "x-circlebox-ingest-key: ${INGEST_KEY}" \
    -H "x-circlebox-idempotency-key: ${idem_key}" \
    -H "content-type: application/json" \
    --data-binary "@${payload_file}"
}

assert_http_202() {
  local http_code="$1"
  local label="$2"
  local response_file="$3"
  if [[ "$http_code" != "202" ]]; then
    echo "[smoke_test_worker_ingest] ${label} failed with HTTP ${http_code}" >&2
    cat "$response_file" >&2
    exit 1
  fi
}

assert_contains() {
  local pattern="$1"
  local label="$2"
  local response_file="$3"
  if ! grep -Eq "$pattern" "$response_file"; then
    echo "[smoke_test_worker_ingest] ${label} assertion failed: pattern '$pattern' not found" >&2
    cat "$response_file" >&2
    exit 1
  fi
}

json_field() {
  local file="$1"
  local key="$2"
  python3 - "$file" "$key" <<'PY'
import json, sys
path, key = sys.argv[1], sys.argv[2]
with open(path, "r", encoding="utf-8") as fh:
    data = json.load(fh)
value = data.get(key)
if value is None:
    print("")
elif isinstance(value, (dict, list)):
    print(json.dumps(value))
else:
    print(value)
PY
}

echo "[smoke_test_worker_ingest] Base URL: ${BASE_URL}"
echo "[smoke_test_worker_ingest] Region metadata: ${REGION}"

report_first="${TMP_DIR}/report-first.json"
report_second="${TMP_DIR}/report-second.json"
fragment_first="${TMP_DIR}/fragment-first.json"
fragment_second="${TMP_DIR}/fragment-second.json"

http_code="$(request_and_capture "/v1/ingest/report" "$REPORT_PAYLOAD" "$REPORT_IDEM_KEY" "$report_first")"
assert_http_202 "$http_code" "report first call" "$report_first"
assert_contains '"status"[[:space:]]*:[[:space:]]*"accepted"' "report first accepted" "$report_first"

http_code="$(request_and_capture "/v1/ingest/report" "$REPORT_PAYLOAD" "$REPORT_IDEM_KEY" "$report_second")"
assert_http_202 "$http_code" "report second call" "$report_second"
assert_contains '"deduplicated"[[:space:]]*:[[:space:]]*true' "report dedupe" "$report_second"

http_code="$(request_and_capture "/v1/ingest/fragment" "$FRAGMENT_PAYLOAD" "$FRAGMENT_IDEM_KEY" "$fragment_first")"
assert_http_202 "$http_code" "fragment first call" "$fragment_first"
assert_contains '"status"[[:space:]]*:[[:space:]]*"accepted"' "fragment first accepted" "$fragment_first"

http_code="$(request_and_capture "/v1/ingest/fragment" "$FRAGMENT_PAYLOAD" "$FRAGMENT_IDEM_KEY" "$fragment_second")"
assert_http_202 "$http_code" "fragment second call" "$fragment_second"
assert_contains '"deduplicated"[[:space:]]*:[[:space:]]*true' "fragment dedupe" "$fragment_second"

if [[ "$SKIP_DOWNLOAD_CHECK" -eq 0 && -n "$DASHBOARD_TOKEN" ]]; then
  report_id="$(json_field "$report_first" "report_id")"
  project_id="$(json_field "$report_first" "project_id")"
  if [[ -z "$report_id" || -z "$project_id" ]]; then
    echo "[smoke_test_worker_ingest] missing report_id or project_id in report response" >&2
    cat "$report_first" >&2
    exit 1
  fi

  mint_ok="${TMP_DIR}/mint-ok.json"
  mint_payload="${TMP_DIR}/mint-ok-payload.json"
  cat > "$mint_payload" <<EOF
{
  "project_id": "${project_id}",
  "region": "${REGION}",
  "expires_in_sec": 120
}
EOF

  http_code="$(curl -sS -o "$mint_ok" -w "%{http_code}" \
    -X POST "${BASE_URL}/v1/dashboard/reports/${report_id}/download-token" \
    -H "x-circlebox-dashboard-token: ${DASHBOARD_TOKEN}" \
    -H "content-type: application/json" \
    --data-binary "@${mint_payload}")"
  if [[ "$http_code" != "200" ]]; then
    echo "[smoke_test_worker_ingest] mint token failed with HTTP ${http_code}" >&2
    cat "$mint_ok" >&2
    exit 1
  fi

  download_url="$(json_field "$mint_ok" "download_url")"
  if [[ -z "$download_url" ]]; then
    echo "[smoke_test_worker_ingest] mint response missing download_url" >&2
    cat "$mint_ok" >&2
    exit 1
  fi

  download_body="${TMP_DIR}/download-ok-body.bin"
  http_code="$(curl -sS -o "$download_body" -w "%{http_code}" "$download_url")"
  if [[ "$http_code" != "200" ]]; then
    echo "[smoke_test_worker_ingest] download request failed with HTTP ${http_code}" >&2
    cat "$mint_ok" >&2
    exit 1
  fi
  if ! grep -Eq '"schema_version"[[:space:]]*:[[:space:]]*2' "$download_body"; then
    echo "[smoke_test_worker_ingest] download body does not look like report json" >&2
    head -n 20 "$download_body" >&2 || true
    exit 1
  fi

  mismatch_region="us"
  if [[ "$REGION" == "us" ]]; then
    mismatch_region="eu"
  fi
  mint_mismatch="${TMP_DIR}/mint-mismatch.json"
  mint_mismatch_payload="${TMP_DIR}/mint-mismatch-payload.json"
  cat > "$mint_mismatch_payload" <<EOF
{
  "project_id": "${project_id}",
  "region": "${mismatch_region}",
  "expires_in_sec": 120
}
EOF
  http_code="$(curl -sS -o "$mint_mismatch" -w "%{http_code}" \
    -X POST "${BASE_URL}/v1/dashboard/reports/${report_id}/download-token" \
    -H "x-circlebox-dashboard-token: ${DASHBOARD_TOKEN}" \
    -H "content-type: application/json" \
    --data-binary "@${mint_mismatch_payload}")"
  if [[ "$http_code" == "200" ]]; then
    echo "[smoke_test_worker_ingest] expected region mismatch to fail but got HTTP 200" >&2
    cat "$mint_mismatch" >&2
    exit 1
  fi

  mint_short="${TMP_DIR}/mint-short.json"
  mint_short_payload="${TMP_DIR}/mint-short-payload.json"
  cat > "$mint_short_payload" <<EOF
{
  "project_id": "${project_id}",
  "region": "${REGION}",
  "expires_in_sec": 30
}
EOF
  http_code="$(curl -sS -o "$mint_short" -w "%{http_code}" \
    -X POST "${BASE_URL}/v1/dashboard/reports/${report_id}/download-token" \
    -H "x-circlebox-dashboard-token: ${DASHBOARD_TOKEN}" \
    -H "content-type: application/json" \
    --data-binary "@${mint_short_payload}")"
  if [[ "$http_code" != "200" ]]; then
    echo "[smoke_test_worker_ingest] short-lived mint failed with HTTP ${http_code}" >&2
    cat "$mint_short" >&2
    exit 1
  fi
  short_url="$(json_field "$mint_short" "download_url")"
  sleep 31
  expired_body="${TMP_DIR}/download-expired.json"
  http_code="$(curl -sS -o "$expired_body" -w "%{http_code}" "$short_url")"
  if [[ "$http_code" != "401" ]]; then
    echo "[smoke_test_worker_ingest] expected expired token to return 401, got ${http_code}" >&2
    cat "$expired_body" >&2
    exit 1
  fi
fi

echo "[smoke_test_worker_ingest] PASS"
if [[ "$KEEP_TEMP" -eq 1 ]]; then
  echo "[smoke_test_worker_ingest] Response artifacts kept in: $TMP_DIR"
fi
