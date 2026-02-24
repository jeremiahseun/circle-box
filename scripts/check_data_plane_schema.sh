#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env.local"

usage() {
  cat <<'EOF'
Usage: scripts/check_data_plane_schema.sh [options]

Verify required data-plane tables are reachable in US and EU Supabase projects.

Options:
  --env-file PATH      Path to env file (default: .env.local)
  -h, --help           Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      ENV_FILE="$2"
      shift 2
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

required_vars=(
  CIRCLEBOX_DATA_PLANE_US_URL
  CIRCLEBOX_DATA_PLANE_US_SERVICE_ROLE_KEY
  CIRCLEBOX_DATA_PLANE_EU_URL
  CIRCLEBOX_DATA_PLANE_EU_SERVICE_ROLE_KEY
)

for key in "${required_vars[@]}"; do
  if [[ -z "${!key:-}" ]]; then
    echo "Missing required env var: $key" >&2
    exit 1
  fi
done

tables=(
  reports
  report_event_index
  fragments
  ingest_dead_letter
  ingest_idempotency
  crash_fingerprint_daily
)

check_region() {
  local label="$1"
  local base_url="$2"
  local service_key="$3"
  local failed=0

  printf '[check_data_plane_schema] Checking %s (%s)\n' "$label" "$base_url"
  for table in "${tables[@]}"; do
    local response_file="/tmp/circlebox-schema-${label}-${table}.json"
    local http_code
    http_code="$(
      curl -sS -o "$response_file" -w "%{http_code}" \
        --get "${base_url}/rest/v1/${table}" \
        --data-urlencode "select=*" \
        --data-urlencode "limit=1" \
        -H "apikey: ${service_key}" \
        -H "Authorization: Bearer ${service_key}"
    )"

    if [[ "$http_code" == "200" ]]; then
      printf '  ✓ %s\n' "$table"
    else
      printf '  ✗ %s (HTTP %s)\n' "$table" "$http_code" >&2
      cat "$response_file" >&2 || true
      failed=1
    fi
  done

  return "$failed"
}

if ! check_region "us" "$CIRCLEBOX_DATA_PLANE_US_URL" "$CIRCLEBOX_DATA_PLANE_US_SERVICE_ROLE_KEY"; then
  echo "[check_data_plane_schema] US schema check failed" >&2
  exit 1
fi

if ! check_region "eu" "$CIRCLEBOX_DATA_PLANE_EU_URL" "$CIRCLEBOX_DATA_PLANE_EU_SERVICE_ROLE_KEY"; then
  echo "[check_data_plane_schema] EU schema check failed" >&2
  exit 1
fi

echo "[check_data_plane_schema] All required tables are reachable in US and EU."
