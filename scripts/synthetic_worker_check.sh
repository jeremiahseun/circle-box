#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE=""
WORKER_URL=""
ALERT_WEBHOOK_URL=""
TIMEOUT_SEC=10

usage() {
  cat <<'USAGE'
Usage:
  scripts/synthetic_worker_check.sh [--env-file .env.local] [--worker-url https://...workers.dev] [--alert-webhook-url https://...]

Checks GET /v1/health on the CircleBox Worker.
If the check fails and --alert-webhook-url is provided, a JSON payload is posted to that webhook.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      ENV_FILE="$2"
      shift 2
      ;;
    --worker-url)
      WORKER_URL="$2"
      shift 2
      ;;
    --alert-webhook-url)
      ALERT_WEBHOOK_URL="$2"
      shift 2
      ;;
    --timeout-sec)
      TIMEOUT_SEC="$2"
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

if [[ -n "$ENV_FILE" ]]; then
  if [[ ! -f "$ENV_FILE" ]]; then
    echo "env file not found: $ENV_FILE" >&2
    exit 1
  fi
  # shellcheck disable=SC1090
  set -a; source "$ENV_FILE"; set +a
fi

if [[ -z "$WORKER_URL" ]]; then
  WORKER_URL="${WORKER_PUBLIC_BASE_URL:-}"
fi

if [[ -z "$WORKER_URL" ]]; then
  echo "worker URL missing; pass --worker-url or set WORKER_PUBLIC_BASE_URL" >&2
  exit 1
fi

HEALTH_URL="${WORKER_URL%/}/v1/health"
TMP_FILE="$(mktemp)"
HTTP_CODE="$(curl -sS --max-time "$TIMEOUT_SEC" -o "$TMP_FILE" -w '%{http_code}' "$HEALTH_URL" || true)"

if [[ "$HTTP_CODE" != "200" ]]; then
  echo "[synthetic_worker_check] FAIL url=$HEALTH_URL status=$HTTP_CODE" >&2
  if [[ -n "$ALERT_WEBHOOK_URL" ]]; then
    curl -sS -X POST "$ALERT_WEBHOOK_URL" \
      -H "content-type: application/json" \
      -d "{\"service\":\"circlebox-worker\",\"status\":\"fail\",\"http_code\":\"$HTTP_CODE\",\"health_url\":\"$HEALTH_URL\"}" >/dev/null || true
  fi
  rm -f "$TMP_FILE"
  exit 1
fi

if ! grep -q '"status"[[:space:]]*:[[:space:]]*"ok"' "$TMP_FILE"; then
  echo "[synthetic_worker_check] FAIL malformed_response url=$HEALTH_URL" >&2
  rm -f "$TMP_FILE"
  exit 1
fi

echo "[synthetic_worker_check] PASS url=$HEALTH_URL"
rm -f "$TMP_FILE"
