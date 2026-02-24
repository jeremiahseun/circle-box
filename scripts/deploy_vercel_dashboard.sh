#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DASHBOARD_DIR="${ROOT_DIR}/cloud/dashboard"
ENV_FILE="${DASHBOARD_DIR}/.env.local"
TOKEN="${VERCEL_TOKEN:-}"
TARGET="production"

usage() {
  cat <<'EOF'
Usage: scripts/deploy_vercel_dashboard.sh [options]

Deploy CircleBox dashboard to Vercel.

Options:
  --token TOKEN         Vercel token (or set VERCEL_TOKEN env var)
  --env-file PATH       Env file path (default: cloud/dashboard/.env.local)
  --target TARGET       Vercel deploy target: production|preview (default: production)
  -h, --help            Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --token)
      TOKEN="${2:-}"
      shift 2
      ;;
    --env-file)
      ENV_FILE="${2:-}"
      shift 2
      ;;
    --target)
      TARGET="${2:-}"
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

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Env file not found: ${ENV_FILE}" >&2
  exit 1
fi

required_keys=(
  DASHBOARD_DEFAULT_PROJECT_ID
  DASHBOARD_DEFAULT_REGION
  DASHBOARD_US_SUPABASE_URL
  DASHBOARD_US_SUPABASE_SERVICE_ROLE_KEY
  DASHBOARD_EU_SUPABASE_URL
  DASHBOARD_EU_SUPABASE_SERVICE_ROLE_KEY
  DASHBOARD_WORKER_BASE_URL
  DASHBOARD_WORKER_TOKEN
)

optional_keys=(
  DASHBOARD_ADMIN_USERNAME
  DASHBOARD_ADMIN_PASSWORD
)

env_value() {
  local key="$1"
  local line
  line="$(grep -E "^${key}=" "${ENV_FILE}" | tail -n 1 || true)"
  if [[ -z "${line}" ]]; then
    echo ""
    return
  fi
  echo "${line#*=}" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//'
}

for key in "${required_keys[@]}"; do
  if [[ -z "$(env_value "${key}")" ]]; then
    echo "Missing required key in env file: ${key}" >&2
    exit 1
  fi
done

deploy_args=()
for key in "${required_keys[@]}"; do
  value="$(env_value "${key}")"
  deploy_args+=(--env "${key}=${value}")
  deploy_args+=(--build-env "${key}=${value}")
done

for key in "${optional_keys[@]}"; do
  value="$(env_value "${key}")"
  if [[ -n "${value}" ]]; then
    deploy_args+=(--env "${key}=${value}")
    deploy_args+=(--build-env "${key}=${value}")
  fi
done

echo "Deploying dashboard from ${DASHBOARD_DIR} (target=${TARGET})..."
cd "${DASHBOARD_DIR}"
deploy_cmd=(vercel deploy --yes "${deploy_args[@]}")
if [[ "${TARGET}" == "production" ]]; then
  deploy_cmd+=(--prod)
else
  deploy_cmd+=(--target "${TARGET}")
fi
if [[ -n "${TOKEN}" ]]; then
  deploy_cmd+=(--token "${TOKEN}")
fi
"${deploy_cmd[@]}"
