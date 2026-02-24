#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env.local"
SKIP_SECRETS=0
SKIP_TYPECHECK=0
DRY_RUN=0

usage() {
  cat <<'EOF'
Usage: scripts/deploy_cloud_worker.sh [options]

Deploy CircleBox Cloud worker-first ingest to Cloudflare Workers.

Options:
  --env-file PATH      Path to env file (default: .env.local)
  --skip-secrets       Do not push Wrangler secrets
  --skip-typecheck     Skip npm typecheck
  --dry-run            Print actions without executing
  -h, --help           Show this help
EOF
}

log() {
  printf '[deploy_cloud_worker] %s\n' "$1"
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      ENV_FILE="$2"
      shift 2
      ;;
    --skip-secrets)
      SKIP_SECRETS=1
      shift
      ;;
    --skip-typecheck)
      SKIP_TYPECHECK=1
      shift
      ;;
    --dry-run)
      DRY_RUN=1
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

require_command wrangler
require_command npm

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Env file not found: $ENV_FILE" >&2
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

required_vars=(
  CLOUDFLARE_ACCOUNT_ID
  CLOUDFLARE_API_TOKEN
  US_SUPABASE_URL
  EU_SUPABASE_URL
  US_SUPABASE_SERVICE_ROLE_KEY
  EU_SUPABASE_SERVICE_ROLE_KEY
)

for key in "${required_vars[@]}"; do
  if [[ -z "${!key:-}" ]]; then
    echo "Missing required env var: $key" >&2
    exit 1
  fi
done

R2_BUCKET_NAME="${CIRCLEBOX_R2_BUCKET_RAW:-cb-reports-raw}"
WORKER_PUBLIC_URL="${WORKER_PUBLIC_BASE_URL:-}"
WORKER_DIR="${ROOT_DIR}/cloud/circlebox-cloud/edge/worker"

if [[ ! -d "$WORKER_DIR" ]]; then
  echo "Worker directory not found: $WORKER_DIR" >&2
  exit 1
fi

export CLOUDFLARE_ACCOUNT_ID
export CLOUDFLARE_API_TOKEN

run_cmd() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[dry-run] $*"
    return 0
  fi
  "$@"
}

cd "$WORKER_DIR"

if [[ -f package-lock.json ]]; then
  log "Installing worker dependencies with npm ci"
  run_cmd npm ci
else
  log "Installing worker dependencies with npm install"
  run_cmd npm install
fi

if [[ "$SKIP_TYPECHECK" -eq 0 ]]; then
  log "Running worker typecheck"
  run_cmd npm run typecheck
fi

if [[ "$SKIP_SECRETS" -eq 0 ]]; then
  log "Pushing worker secrets"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[dry-run] wrangler secret put US_SUPABASE_SERVICE_ROLE_KEY"
    echo "[dry-run] wrangler secret put EU_SUPABASE_SERVICE_ROLE_KEY"
    if [[ -n "${DASHBOARD_WORKER_TOKEN:-}" ]]; then
      echo "[dry-run] wrangler secret put DASHBOARD_WORKER_TOKEN"
    fi
    if [[ -n "${DASHBOARD_SHARED_SECRET:-}" ]]; then
      echo "[dry-run] wrangler secret put DASHBOARD_SHARED_SECRET"
    fi
  else
    printf '%s' "$US_SUPABASE_SERVICE_ROLE_KEY" | wrangler secret put US_SUPABASE_SERVICE_ROLE_KEY >/dev/null
    printf '%s' "$EU_SUPABASE_SERVICE_ROLE_KEY" | wrangler secret put EU_SUPABASE_SERVICE_ROLE_KEY >/dev/null
    if [[ -n "${DASHBOARD_WORKER_TOKEN:-}" ]]; then
      printf '%s' "$DASHBOARD_WORKER_TOKEN" | wrangler secret put DASHBOARD_WORKER_TOKEN >/dev/null
    fi
    if [[ -n "${DASHBOARD_SHARED_SECRET:-}" ]]; then
      printf '%s' "$DASHBOARD_SHARED_SECRET" | wrangler secret put DASHBOARD_SHARED_SECRET >/dev/null
    fi
  fi
fi

log "Deploying worker"
run_cmd wrangler deploy \
  --var "US_SUPABASE_URL=${US_SUPABASE_URL}" \
  --var "EU_SUPABASE_URL=${EU_SUPABASE_URL}" \
  --var "CIRCLEBOX_R2_BUCKET_RAW_NAME=${R2_BUCKET_NAME}"

if [[ -n "$WORKER_PUBLIC_URL" ]]; then
  log "Deployed. Worker base URL: $WORKER_PUBLIC_URL"
else
  log "Deployed. Check wrangler output for workers.dev URL."
fi
