#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env.local"
INGEST_KEY=""
REGION="us"
SKIP_SCHEMA_CHECK=0
SKIP_SMOKE=0
SKIP_SECRETS=0
SKIP_TYPECHECK=0
DRY_RUN=0

usage() {
  cat <<'EOF'
Usage: scripts/deploy_phase3_cloud.sh [options]

One-command flow for Worker-first Phase 3 cloud deploy.

Steps:
  1) Check Supabase data-plane schema tables
  2) Deploy Cloudflare worker with current config/secrets
  3) Run ingest smoke tests

Options:
  --env-file PATH         Path to env file (default: .env.local)
  --ingest-key KEY        Ingest key for smoke tests (or set in env)
  --region REGION         us|eu for smoke test metadata (default: us)
  --skip-schema-check     Skip schema table checks
  --skip-smoke            Skip smoke test
  --skip-secrets          Skip pushing worker secrets during deploy
  --skip-typecheck        Skip worker typecheck during deploy
  --dry-run               Print deploy command without executing
  -h, --help              Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      ENV_FILE="$2"
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
    --skip-schema-check)
      SKIP_SCHEMA_CHECK=1
      shift
      ;;
    --skip-smoke)
      SKIP_SMOKE=1
      shift
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

if [[ "$SKIP_SCHEMA_CHECK" -eq 0 ]]; then
  "${ROOT_DIR}/scripts/check_data_plane_schema.sh" --env-file "$ENV_FILE"
fi

deploy_args=(--env-file "$ENV_FILE")
if [[ "$SKIP_SECRETS" -eq 1 ]]; then
  deploy_args+=(--skip-secrets)
fi
if [[ "$SKIP_TYPECHECK" -eq 1 ]]; then
  deploy_args+=(--skip-typecheck)
fi
if [[ "$DRY_RUN" -eq 1 ]]; then
  deploy_args+=(--dry-run)
fi

"${ROOT_DIR}/scripts/deploy_cloud_worker.sh" "${deploy_args[@]}"

if [[ "$SKIP_SMOKE" -eq 0 ]]; then
  smoke_args=(--env-file "$ENV_FILE" --region "$REGION")
  if [[ -n "$INGEST_KEY" ]]; then
    smoke_args+=(--ingest-key "$INGEST_KEY")
  fi
  "${ROOT_DIR}/scripts/smoke_test_worker_ingest.sh" "${smoke_args[@]}"
fi

echo "[deploy_phase3_cloud] Completed."
