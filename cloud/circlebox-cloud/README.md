# CircleBox Cloud (Phase 3A Foundation)

This workspace contains the CircleBox Cloud core for Phase 3A:

- Control plane schema (orgs, projects, keys, usage, quotas)
- Data plane schema (reports, fragments, event index, aggregates)
- Cloudflare Worker ingest service for global ingress, validation, persistence, and residency routing
- Aggregation job SQL for trend materialization

## Layout

- `supabase/control-plane/migrations`: control plane schema migrations
- `supabase/data-plane/migrations`: data plane schema migrations
- `supabase/functions`: legacy ingest implementation (kept for migration reference)
- `edge/worker`: primary ingest path (worker-first runtime)
- `jobs/aggregator`: daily aggregation SQL/job logic

## Runtime Notes

- Canonical payload schema: CircleBox `schema_version = 2`
- Expected ingest auth header: `x-circlebox-ingest-key`
- Optional dedupe header: `x-circlebox-idempotency-key`
- Region routing values: `us`, `eu` (derived from ingest key)
- `ingest-report` behavior:
  - accepts JSON and gzip JSON payloads
  - stores raw payload in Cloudflare R2 bucket `cb-reports-raw`
  - writes metadata to `reports`
  - writes searchable last-20 event index to `report_event_index`
  - records dead-letter rows on persistence failures
- `ingest-fragment` behavior:
  - accepts compact JSON fragment payloads
  - writes rows to `fragments`
  - records dead-letter rows on persistence failures
- Idempotency behavior:
  - checks existing responses in `ingest_idempotency`
  - returns cached `202 accepted` payload for duplicate keys
  - stores first accepted response for each `(project_id, ingest_type, idempotency_key)`

### Required Environment Variables

- Worker vars:
  - `US_SUPABASE_URL`
  - `EU_SUPABASE_URL`
  - `CIRCLEBOX_R2_BUCKET_RAW_NAME` (for storage path labels)
- Worker secrets:
  - `US_SUPABASE_SERVICE_ROLE_KEY`
  - `EU_SUPABASE_SERVICE_ROLE_KEY`
  - `DASHBOARD_WORKER_TOKEN` (required for dashboard token issuance endpoint)
  - `DASHBOARD_SHARED_SECRET` (required for signed report download URLs)
- R2 binding:
  - `CB_REPORTS_RAW -> cb-reports-raw`

### Cloudflare Worker Configuration

Set worker secrets:

- `wrangler secret put US_SUPABASE_SERVICE_ROLE_KEY`
- `wrangler secret put EU_SUPABASE_SERVICE_ROLE_KEY`
- `wrangler secret put DASHBOARD_WORKER_TOKEN`
- `wrangler secret put DASHBOARD_SHARED_SECRET`

Worker routes:

- `POST /v1/ingest/report`
- `POST /v1/ingest/fragment`
- `POST /v1/dashboard/reports/:report_id/download-token` (dashboard server-to-worker, token-protected)
- `GET /v1/dashboard/download/:signed_token` (short-lived signed download URL)

### Deploy (Worker-First)

```bash
cd cloud/circlebox-cloud/edge/worker

# Required one-time secrets
wrangler secret put US_SUPABASE_SERVICE_ROLE_KEY
wrangler secret put EU_SUPABASE_SERVICE_ROLE_KEY

# Deploy to workers.dev
wrangler deploy
```

### One-Command Deploy + Smoke

From repo root:

```bash
scripts/deploy_phase3_cloud.sh --ingest-key "cb_live_<project_uuid>_us"
```

Related scripts:

- `scripts/check_data_plane_schema.sh`
- `scripts/deploy_cloud_worker.sh`
- `scripts/smoke_test_worker_ingest.sh`
- `scripts/deploy_phase3_cloud.sh`
