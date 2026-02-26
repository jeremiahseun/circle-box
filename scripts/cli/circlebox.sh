#!/usr/bin/env bash
set -euo pipefail

CONFIG_DIR="${CIRCLEBOX_CLI_HOME:-$HOME/.circlebox}"
CONFIG_FILE="${CONFIG_DIR}/config.env"

usage() {
  cat <<'EOF'
CircleBox CLI

Usage:
  circlebox.sh auth login --control-url <url> --service-role <key>
  circlebox.sh project create --organization-id <uuid> --name <text> --region <us|eu>
  circlebox.sh key create --project-id <uuid> --type <ingest|usage_beacon>
  circlebox.sh key rotate --project-id <uuid> --key-id <uuid>
  circlebox.sh key revoke --project-id <uuid> --key-id <uuid>
EOF
}

log() {
  printf '%s\n' "$1"
}

die() {
  printf 'error: %s\n' "$1" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"
}

require_cmd curl
require_cmd openssl
require_cmd python3

slugify() {
  python3 - "$1" <<'PY'
import re, sys
value = (sys.argv[1] if len(sys.argv) > 1 else "").strip().lower()
value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
print((value[:48] or "project"))
PY
}

uuidgen_lower() {
  python3 - <<'PY'
import uuid
print(str(uuid.uuid4()))
PY
}

sha256_hex() {
  printf '%s' "$1" | shasum -a 256 | awk '{print $1}'
}

now_iso() {
  python3 - <<'PY'
from datetime import datetime, timezone
print(datetime.now(timezone.utc).isoformat())
PY
}

save_auth_config() {
  local control_url="$1"
  local service_role="$2"
  mkdir -p "$CONFIG_DIR"
  cat >"$CONFIG_FILE" <<EOF
CONTROL_SUPABASE_URL=${control_url}
CONTROL_SUPABASE_SERVICE_ROLE_KEY=${service_role}
EOF
  chmod 600 "$CONFIG_FILE"
}

load_auth_config() {
  if [[ ! -f "$CONFIG_FILE" ]]; then
    die "missing CLI auth config. Run: circlebox.sh auth login ..."
  fi
  # shellcheck disable=SC1090
  source "$CONFIG_FILE"
  [[ -n "${CONTROL_SUPABASE_URL:-}" ]] || die "CONTROL_SUPABASE_URL missing in config"
  [[ -n "${CONTROL_SUPABASE_SERVICE_ROLE_KEY:-}" ]] || die "CONTROL_SUPABASE_SERVICE_ROLE_KEY missing in config"
}

rest_get() {
  local resource="$1"
  local query="$2"
  local url="${CONTROL_SUPABASE_URL%/}/rest/v1/${resource}?${query}"
  local body_file
  body_file="$(mktemp)"
  local status
  status="$(curl -sS -o "$body_file" -w "%{http_code}" \
    -H "Authorization: Bearer ${CONTROL_SUPABASE_SERVICE_ROLE_KEY}" \
    -H "apikey: ${CONTROL_SUPABASE_SERVICE_ROLE_KEY}" \
    -H "accept: application/json" \
    "$url")"
  if [[ ! "$status" =~ ^2 ]]; then
    cat "$body_file" >&2
    rm -f "$body_file"
    die "GET ${resource} failed with HTTP ${status}"
  fi
  cat "$body_file"
  rm -f "$body_file"
}

rest_post() {
  local resource="$1"
  local payload="$2"
  local prefer="${3:-return=minimal}"
  local url="${CONTROL_SUPABASE_URL%/}/rest/v1/${resource}"
  local body_file
  body_file="$(mktemp)"
  local status
  status="$(curl -sS -o "$body_file" -w "%{http_code}" \
    -X POST \
    -H "Authorization: Bearer ${CONTROL_SUPABASE_SERVICE_ROLE_KEY}" \
    -H "apikey: ${CONTROL_SUPABASE_SERVICE_ROLE_KEY}" \
    -H "content-type: application/json" \
    -H "prefer: ${prefer}" \
    --data "$payload" \
    "$url")"
  if [[ ! "$status" =~ ^2 ]]; then
    cat "$body_file" >&2
    rm -f "$body_file"
    die "POST ${resource} failed with HTTP ${status}"
  fi
  cat "$body_file"
  rm -f "$body_file"
}

rest_patch() {
  local resource="$1"
  local query="$2"
  local payload="$3"
  local prefer="${4:-return=minimal}"
  local url="${CONTROL_SUPABASE_URL%/}/rest/v1/${resource}?${query}"
  local body_file
  body_file="$(mktemp)"
  local status
  status="$(curl -sS -o "$body_file" -w "%{http_code}" \
    -X PATCH \
    -H "Authorization: Bearer ${CONTROL_SUPABASE_SERVICE_ROLE_KEY}" \
    -H "apikey: ${CONTROL_SUPABASE_SERVICE_ROLE_KEY}" \
    -H "content-type: application/json" \
    -H "prefer: ${prefer}" \
    --data "$payload" \
    "$url")"
  if [[ ! "$status" =~ ^2 ]]; then
    cat "$body_file" >&2
    rm -f "$body_file"
    die "PATCH ${resource} failed with HTTP ${status}"
  fi
  cat "$body_file"
  rm -f "$body_file"
}

json_value() {
  local json="$1"
  local path="$2"
  python3 - "$json" "$path" <<'PY'
import json, sys
payload = json.loads(sys.argv[1])
path = sys.argv[2].split(".")
cursor = payload
for part in path:
    if isinstance(cursor, list):
        cursor = cursor[int(part)]
    else:
        cursor = cursor.get(part)
if cursor is None:
    sys.exit(1)
if isinstance(cursor, (dict, list)):
    print(json.dumps(cursor))
else:
    print(str(cursor))
PY
}

project_region() {
  local project_id="$1"
  local rows
  rows="$(rest_get "projects" "id=eq.${project_id}&select=region&limit=1")"
  python3 - "$rows" <<'PY'
import json, sys
rows = json.loads(sys.argv[1])
if not rows:
    raise SystemExit(1)
print(rows[0].get("region", "us"))
PY
}

create_key_material() {
  local project_id="$1"
  local key_type="$2"
  local region="$3"
  local project_token
  project_token="$(printf '%s' "$project_id" | tr -d '-' | cut -c1-12)"
  [[ -n "$project_token" ]] || project_token="projectdemo"
  local label
  label="$(openssl rand -hex 3)"
  local secret_part
  secret_part="$(openssl rand -hex 16)"

  if [[ "$key_type" == "ingest" ]]; then
    local region_token="us"
    if [[ "$region" == "eu" ]]; then
      region_token="eu"
    fi
    local prefix="cb_live_${project_token}_${region_token}_${label}"
    printf '%s|%s|%s|%s\n' "$prefix" "${prefix}_${secret_part}" "$region_token" "$key_type"
    return
  fi

  local prefix="cb_usage_${project_token}_${label}"
  printf '%s|%s|auto|%s\n' "$prefix" "${prefix}_${secret_part}" "$key_type"
}

cmd_auth_login() {
  local control_url=""
  local service_role=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --control-url)
        control_url="${2:-}"; shift 2 ;;
      --service-role)
        service_role="${2:-}"; shift 2 ;;
      *)
        die "unknown option for auth login: $1" ;;
    esac
  done
  [[ -n "$control_url" ]] || die "--control-url is required"
  [[ -n "$service_role" ]] || die "--service-role is required"

  save_auth_config "$control_url" "$service_role"
  log "saved auth config to ${CONFIG_FILE}"
}

cmd_project_create() {
  load_auth_config
  local org_id=""
  local name=""
  local region="us"
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --organization-id)
        org_id="${2:-}"; shift 2 ;;
      --name)
        name="${2:-}"; shift 2 ;;
      --region)
        region="${2:-}"; shift 2 ;;
      *)
        die "unknown option for project create: $1" ;;
    esac
  done

  [[ -n "$org_id" ]] || die "--organization-id is required"
  [[ -n "$name" ]] || die "--name is required"
  [[ "$region" == "us" || "$region" == "eu" ]] || die "--region must be us or eu"

  local project_id slug payload
  project_id="$(uuidgen_lower)"
  slug="$(slugify "$name")-$(openssl rand -hex 2)"
  payload="$(cat <<EOF
[{
  "id":"${project_id}",
  "organization_id":"${org_id}",
  "name":"${name}",
  "slug":"${slug}",
  "region":"${region}",
  "plan_tier":"free",
  "status":"active"
}]
EOF
)"
  rest_post "projects" "$payload" >/dev/null
  log "project_created id=${project_id} slug=${slug} region=${region}"
}

cmd_key_create() {
  load_auth_config
  local project_id=""
  local key_type="ingest"
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --project-id)
        project_id="${2:-}"; shift 2 ;;
      --type)
        key_type="${2:-}"; shift 2 ;;
      *)
        die "unknown option for key create: $1" ;;
    esac
  done
  [[ -n "$project_id" ]] || die "--project-id is required"
  [[ "$key_type" == "ingest" || "$key_type" == "usage_beacon" ]] || die "--type must be ingest or usage_beacon"

  local region
  region="$(project_region "$project_id")" || die "project not found: ${project_id}"
  local material
  material="$(create_key_material "$project_id" "$key_type" "$region")"
  local prefix secret region_scope kind
  IFS='|' read -r prefix secret region_scope kind <<<"$material"

  local api_key_id created_at payload
  api_key_id="$(uuidgen_lower)"
  created_at="$(now_iso)"
  payload="$(cat <<EOF
[{
  "id":"${api_key_id}",
  "project_id":"${project_id}",
  "key_type":"${kind}",
  "key_prefix":"${prefix}",
  "hashed_secret":"$(sha256_hex "$secret")",
  "region_scope":"${region_scope}",
  "active":true,
  "created_at":"${created_at}"
}]
EOF
)"
  rest_post "api_keys" "$payload" >/dev/null
  rest_post "api_key_audit_log" "[{\"project_id\":\"${project_id}\",\"api_key_id\":\"${api_key_id}\",\"action\":\"create\",\"metadata\":{\"key_prefix\":\"${prefix}\",\"key_type\":\"${kind}\"}}]" >/dev/null

  log "key_created id=${api_key_id} type=${kind} prefix=${prefix}"
  log "secret=${secret}"
}

cmd_key_rotate() {
  load_auth_config
  local project_id=""
  local key_id=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --project-id)
        project_id="${2:-}"; shift 2 ;;
      --key-id)
        key_id="${2:-}"; shift 2 ;;
      *)
        die "unknown option for key rotate: $1" ;;
    esac
  done
  [[ -n "$project_id" ]] || die "--project-id is required"
  [[ -n "$key_id" ]] || die "--key-id is required"

  local rows key_type
  rows="$(rest_get "api_keys" "id=eq.${key_id}&project_id=eq.${project_id}&select=key_type&limit=1")"
  key_type="$(python3 - "$rows" <<'PY'
import json, sys
rows = json.loads(sys.argv[1])
if not rows:
    raise SystemExit(1)
print(rows[0].get("key_type", ""))
PY
)" || die "api key not found"
  [[ "$key_type" == "ingest" || "$key_type" == "usage_beacon" ]] || die "invalid key type on record"

  rest_patch "api_keys" "id=eq.${key_id}&project_id=eq.${project_id}" '{"active":false}' >/dev/null
  rest_post "api_key_audit_log" "[{\"project_id\":\"${project_id}\",\"api_key_id\":\"${key_id}\",\"action\":\"rotate\",\"metadata\":{}}]" >/dev/null
  cmd_key_create --project-id "$project_id" --type "$key_type"
}

cmd_key_revoke() {
  load_auth_config
  local project_id=""
  local key_id=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --project-id)
        project_id="${2:-}"; shift 2 ;;
      --key-id)
        key_id="${2:-}"; shift 2 ;;
      *)
        die "unknown option for key revoke: $1" ;;
    esac
  done
  [[ -n "$project_id" ]] || die "--project-id is required"
  [[ -n "$key_id" ]] || die "--key-id is required"

  rest_patch "api_keys" "id=eq.${key_id}&project_id=eq.${project_id}" '{"active":false}' >/dev/null
  rest_post "api_key_audit_log" "[{\"project_id\":\"${project_id}\",\"api_key_id\":\"${key_id}\",\"action\":\"revoke\",\"metadata\":{}}]" >/dev/null
  log "key_revoked id=${key_id}"
}

main() {
  local group="${1:-}"
  local command="${2:-}"
  if [[ -z "$group" || -z "$command" ]]; then
    usage
    exit 1
  fi
  shift 2

  case "${group}:${command}" in
    auth:login)
      cmd_auth_login "$@" ;;
    project:create)
      cmd_project_create "$@" ;;
    key:create)
      cmd_key_create "$@" ;;
    key:rotate)
      cmd_key_rotate "$@" ;;
    key:revoke)
      cmd_key_revoke "$@" ;;
    *)
      usage
      die "unknown command: ${group} ${command}" ;;
  esac
}

main "$@"
