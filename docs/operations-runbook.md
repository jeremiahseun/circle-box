# CircleBox Operations Runbook (MVP)

## SLO Targets

- Ingest availability: `99.5%` monthly
- Ingest latency: `p95 < 800ms`
- Dashboard availability: `99.0%` monthly

## Synthetic Health Check

Worker health endpoint:

- `GET /v1/health` returns `{ "status": "ok", ... }`

Cloudflare cron:

- Worker has hourly cron trigger (`0 * * * *`) configured in `wrangler.toml`.
- It calls `${WORKER_PUBLIC_BASE_URL}/v1/health`.
- If unhealthy, it posts alert payload to `SYNTHETIC_ALERT_WEBHOOK_URL` (if configured as worker secret).

Run manual check:

```bash
scripts/synthetic_worker_check.sh --env-file .env.local
```

Optional webhook alert:

```bash
scripts/synthetic_worker_check.sh \
  --env-file .env.local \
  --alert-webhook-url "https://example.com/webhook"
```

Recommended cadence:

- Hourly cron for health check (Cloudflare trigger already configured)
- Alert on 2 consecutive failures

## Retention Policy Defaults

Control-plane defaults per project (`project_retention_policies`):

- `raw_retention_days = 30`
- `aggregate_retention_days = 180`

Data cleanup should run daily:

1. Delete stale data-plane rows older than retention.
2. Delete corresponding R2 objects older than retention.
3. Keep aggregates for `aggregate_retention_days`.

## Backup Procedure (Weekly)

1. Export control-plane tables (`organizations`, `organization_members`, `projects`, `api_keys`, `audit_events`, invites, retention policies).
2. Export data-plane metadata tables (`reports`, `report_event_index`, aggregates).
3. Snapshot list of R2 report object keys.
4. Store encrypted backup artifacts in separate storage location.

## Restore Drill (Monthly)

1. Provision empty staging Supabase projects and staging R2 bucket.
2. Restore control-plane dump.
3. Restore data-plane dumps.
4. Replay a sample set of R2 objects.
5. Validate:
   - login/signup
   - key auth
   - ingest path
   - dashboard list/detail
   - raw report download

## Security Gate Before Public Registry Publish

1. Dependency audit passes for worker/dashboard/mobile bridges.
2. API key hashing and validation checks pass.
3. Tenant-isolation tests pass (cross-org and cross-project denied).
4. Dashboard download endpoint confirms membership checks.
5. Rotated/revoked keys are rejected by worker auth.
