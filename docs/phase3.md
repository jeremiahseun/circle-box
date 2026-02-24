# Phase 3 Plan: CircleBox Cloud (World-Class, Supabase-First, Sub-$1k Launch)

## Summary
Build Phase 3 in two stages:

1. **Phase 3A (Cloud Core, GA-ready)**  
   Managed ingestion, regional data residency (US+EU), crash timeline dashboard, low-bandwidth fragment sync, usage-based billing meter, and alerting.
2. **Phase 3B (Advanced Intelligence)**  
   AI RCA, richer fleet analytics, and higher-tier enterprise controls.

## Phase 3A Current Status (Implemented)
The following worker-first slice is now implemented:

1. Live dashboard queries against regional data planes (`reports` + `report_event_index`) with server-side service-role access.
2. Secure raw report download flow:
   - worker endpoint issues short-lived signed download tokens behind `x-circlebox-dashboard-token`
   - worker endpoint redeems token and streams report from R2
3. Companion cloud SDK auto behavior:
   - pending-crash check on startup and foreground
   - foreground-only queue auto-drain on interval
   - no periodic live snapshot export in automatic mode

This plan is optimized for:
- **Cost cap:** `<$1k/month` infra at launch
- **Scale target:** up to `10M events/month` first 6 months
- **Product slice first:** ingestion + timeline
- **Model:** multi-tenant SaaS
- **Upload path:** direct SDK upload
- **Retention:** `30d raw + 180d aggregates`
- **UI context capture:** opt-in auto screen capture + manual breadcrumbs

## Locked Decisions
1. Cloud stack: **Supabase-first**
2. Residency: **US + EU**
3. Monetization: **usage-based with free tier**
4. Rollout: **3A/3B staged**
5. Upload strategy: **direct SDK -> CircleBox Cloud**
6. Tenancy: **multi-tenant first**
7. Context depth: **opt-in auto screen capture + manual action breadcrumbs**
8. Budget: **keep launch infra under $1k/mo**

## Architecture

### 1) Deployment Topology
1. **Control Plane (US Supabase project)**
   - org/project management
   - API keys/auth policies
   - billing meter + quota config
   - alert rules + destinations
2. **Data Plane US (US Supabase project)**
   - US project crash data
3. **Data Plane EU (EU Supabase project)**
   - EU project crash data
4. **Edge Ingest Gateway (Cloudflare Worker)**
   - global entrypoint
   - rate limiting, key validation, region routing
   - forwards to correct regional ingest function

### 2) Data Model

#### Control Plane tables
- `organizations`
- `organization_members`
- `projects` (`region`, `plan_tier`, `status`)
- `project_ingest_keys` (`key_prefix`, `hashed_key`, `active`)
- `quotas` (per plan, limits)
- `usage_daily` (`project_id`, `date`, `reports`, `events`, `bytes`)
- `alert_policies`
- `alert_deliveries`
- `billing_accounts`

#### Regional Data Plane tables
- `reports`
  - envelope metadata (`schema_version`, `session_id`, `platform`, `app_version`, etc.)
  - provenance (`export_source`, `capture_reason`)
  - derived fields (`has_crash_marker`, `crash_fingerprint`, `event_count`)
  - `storage_path` (raw blob)
- `report_event_index` (searchable subset, default last 20 events)
- `crash_fingerprint_daily`
- `fragments` (low-bandwidth crash fragments)
- `ingest_dead_letter`

#### Object storage
- bucket `cb-reports-raw` (gzip payloads)
- bucket `cb-fragments` (compact fragment payloads)

### 3) Ingest API Contract (v1)
1. `POST /v1/ingest/report`
   - Body: `application/json+gzip` (schema v2 envelope)
   - Auth: public ingest key (`cb_live_*`) + optional short-lived JWT mode
   - Response: `report_id`, `accepted_region`
2. `POST /v1/ingest/fragment`
   - Body: compact fragment payload
   - Response: `fragment_id`, `accepted`
3. `POST /v1/ingest/batch` (optional in 3A if needed)
   - multiple reports/fragments in one request

Validation:
- strict schema v2 contract
- max payload size
- replay window checks
- per-key rate limits + per-project quota controls

### 4) Storage and Query Strategy (cost-first)
1. Store full raw reports in object storage.
2. Keep query-critical metadata in Postgres.
3. Index only searchable event subset.
4. Nightly aggregate jobs for trend cards/heatmaps.
5. TTL jobs:
   - raw + event index: 30 days
   - aggregates: 180 days

## Phase 3A Implementation Scope

### A) Cloud Backend
1. Create `/cloud/circlebox-cloud/` with:
   - `/supabase/control-plane/migrations`
   - `/supabase/data-plane/migrations`
   - `/supabase/functions/ingest-report`
   - `/supabase/functions/ingest-fragment`
   - `/edge/worker` (Cloudflare)
   - `/jobs/aggregator`
2. Implement region routing via project key metadata.
3. Implement ingest with schema validation, blob write + metadata insert, crash fingerprint extraction, usage metering.
4. Add dead-letter path and replay tooling.

### B) SDK Cloud Uploaders (companion, opt-in)
Add companion modules:
- `ios/CircleBoxCloud`
- `android/circlebox-cloud`
- `flutter/circlebox_cloud_flutter`
- `react-native/circlebox-cloud-react-native`

Uploader behavior:
1. Read pending/live exports from existing SDK APIs.
2. Persist local upload queue.
3. Send **fragment first**, then full report.
4. Retry with exponential backoff + jitter.
5. Respect network/power policy toggles.
6. Keep network OFF unless explicitly enabled by app config.

### C) Screen + Action Context (opt-in)
1. New event types:
   - `screen_view`
   - `ui_action`
2. Auto-capture scope:
   - iOS: view/controller transition observer
   - Android: activity/fragment lifecycle observer
   - Flutter: navigator observer
   - RN: navigation listener hook
3. Manual action breadcrumbs remain first-class.
4. Privacy defaults:
   - no raw text capture by default
   - label hashing for control names
   - allowlist-based override per app

### D) Dashboard (Phase 3A)
Create `/cloud/dashboard/` (Next.js + Supabase Auth) with:
1. Org/project management
2. Crash list filters:
   - platform, app/build, fingerprint, severity, date
3. Crash detail timeline:
   - pre-crash sequence + marker event
   - raw JSON/CSV download
4. Fragment/full-report linkage status
5. Basic alerts:
   - spike detection by fingerprint
   - Slack/webhook destination

### E) Billing + Quotas
1. Usage meter: events/reports/bytes per day.
2. Free tier + overage thresholds.
3. Soft-limit warnings first; hard throttles configurable.
4. Stripe integration hook with delayed activation flag.

## Phase 3B Scope
1. AI RCA pipeline:
   - deterministic rules first (thermal, memory, connectivity, lifecycle kills)
   - optional LLM summarization on-demand
   - cache RCA by `(fingerprint + app_version + platform)` to control cost
2. Fleet analytics:
   - heatmaps by device/os/network/thermal
   - regression detection by release
3. Enterprise enhancements:
   - advanced RBAC
   - audit exports
   - dedicated tenant option (not default)

## Public APIs / Interfaces / Types

### Core SDKs
No breaking changes to existing Phase 1/2 APIs.

### New companion cloud APIs

#### iOS/Android companion
- `CircleBoxCloud.start(config)`
- `CircleBoxCloud.flush()`
- `CircleBoxCloud.pause()`
- `CircleBoxCloud.resume()`
- `CircleBoxCloud.setUser(id:attrs:)`
- `CircleBoxCloud.captureAction(name:attrs:)`

#### Flutter companion
- `CircleBoxCloud.start(config)`
- `CircleBoxCloud.flush()`
- `CircleBoxCloud.setUser(...)`
- `CircleBoxCloud.captureAction(...)`

#### React Native companion
- `CircleBoxCloud.start(config?)`
- `CircleBoxCloud.flush()`
- `CircleBoxCloud.setUser(...)`
- `CircleBoxCloud.captureAction(...)`

#### Shared config type
`CircleBoxCloudConfig` fields:
- `endpoint`
- `ingest_key`
- `region` (`us|eu|auto`)
- `enable_fragment_sync` (default true)
- `flush_interval_sec` (default 60)
- `max_queue_mb` (default 20)
- `wifi_only` (default false)
- `retry_max_backoff_sec` (default 900)
- `token_provider` (optional hardened auth mode)

## Testing and Acceptance Criteria

### Backend
1. Contract tests for `ingest/report` and `ingest/fragment` with schema v2 fixtures.
2. Region routing tests (US key -> US plane, EU key -> EU plane).
3. Replay/rate-limit/auth abuse tests.
4. Dead-letter/retry correctness tests.
5. Migration tests for control/data plane schemas.

### SDK uploader
1. Offline queue persistence survives app restarts.
2. Fragment-first delivery ordering is enforced.
3. Backoff/retry behavior under intermittent network.
4. Duplicate upload idempotency (same `report_id` hash).
5. Upload-disabled mode has zero network calls.

### UI context
1. Auto screen events fire on navigation transitions.
2. Manual actions enrich timeline correctly.
3. Privacy policy tests (hashing/redaction/allowlist behavior).

### Dashboard
1. Crash list and filters return correct reports.
2. Timeline ordering matches sequence IDs.
3. Raw export download integrity check.
4. Alert trigger and delivery tests.

### Load / cost / reliability
1. Sustained ingest load test at launch target.
2. p95 ingest latency and error-rate SLO checks.
3. Cost simulation validates `<$1k/mo` target under expected traffic.

**Phase 3A Done when all are true:**
1. Dual-region ingest and storage operational.
2. Direct SDK upload works across iOS/Android/Flutter/RN companion SDKs.
3. Dashboard supports timeline-first investigations.
4. Usage metering + quota guardrails active.
5. All test suites and CI gates green.

## Cost Control Plan
1. Raw payloads in object storage only.
2. Keep searchable event index bounded.
3. Enforce 30d raw retention.
4. RCA generation on-demand + cached by fingerprint.
5. Batch alert delivery to reduce webhook churn.
6. Budget alarms at 50%, 75%, 90%.
7. Feature flags for expensive modules (AI, deep indexes).

## Rollout Plan
1. **Week 1-2:** control/data plane schemas + ingest worker + base API.
2. **Week 3-4:** uploader companions + queue + fragment sync.
3. **Week 5-6:** dashboard timeline + filters + alerts.
4. **Week 7:** billing meter + quota enforcement + hardening.
5. **Week 8:** beta with design partners.
6. **Post-beta:** GA for 3A, then start 3B.

## Assumptions and Defaults
1. Launch SLO target for 3A: `99.5%` ingest availability.
2. Core SDK remains network-silent by default; cloud upload is opt-in companion.
3. `schema_version=2` stays canonical in cloud ingest.
4. Multi-tenant SaaS is default; dedicated/self-host deferred.
5. Compliance posture in 3A: regional residency (US/EU) + GDPR baseline controls; HIPAA deferred.
6. Billing starts with usage metering and free tier; hard paywall can activate later.
7. AI RCA in 3B uses hybrid rules + on-demand LLM for cost and quality control.
