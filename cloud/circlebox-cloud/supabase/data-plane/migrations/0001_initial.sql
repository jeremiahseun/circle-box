-- CircleBox Cloud data plane schema (Phase 3A)

create extension if not exists pgcrypto;

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  schema_version integer not null,
  session_id text not null,
  platform text not null,
  app_version text not null,
  build_number text not null,
  os_version text not null,
  device_model text not null,
  export_source text not null,
  capture_reason text not null,
  generated_at_unix_ms bigint not null,
  event_count integer not null,
  has_crash_marker boolean not null default false,
  crash_fingerprint text,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists report_event_index (
  report_id uuid not null references reports(id) on delete cascade,
  seq bigint not null,
  timestamp_unix_ms bigint not null,
  type text not null,
  thread text not null,
  severity text not null,
  attrs jsonb not null,
  created_at timestamptz not null default now(),
  primary key (report_id, seq)
);

create table if not exists fragments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  report_id uuid,
  session_id text not null,
  platform text not null,
  crash_fingerprint text,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists crash_fingerprint_daily (
  project_id uuid not null,
  usage_date date not null,
  crash_fingerprint text not null,
  crash_count bigint not null default 0,
  unique_sessions bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, usage_date, crash_fingerprint)
);

create table if not exists ingest_dead_letter (
  id uuid primary key default gen_random_uuid(),
  project_id uuid,
  ingest_type text not null check (ingest_type in ('report', 'fragment')),
  reason text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists ingest_idempotency (
  project_id uuid not null,
  ingest_type text not null check (ingest_type in ('report', 'fragment')),
  idempotency_key text not null,
  response jsonb not null,
  reference_id uuid,
  created_at timestamptz not null default now(),
  primary key (project_id, ingest_type, idempotency_key)
);

create index if not exists idx_reports_project_created on reports(project_id, created_at desc);
create index if not exists idx_reports_platform on reports(platform);
create index if not exists idx_reports_crash_fp on reports(crash_fingerprint) where crash_fingerprint is not null;
create index if not exists idx_event_index_type on report_event_index(type);
create index if not exists idx_event_index_severity on report_event_index(severity);
create index if not exists idx_fragments_project_created on fragments(project_id, created_at desc);
create index if not exists idx_ingest_idempotency_created on ingest_idempotency(created_at desc);

create or replace function increment_crash_fingerprint_daily(
  p_project_id uuid,
  p_usage_date date,
  p_crash_fingerprint text
)
returns void
language plpgsql
as $$
begin
  insert into crash_fingerprint_daily (
    project_id,
    usage_date,
    crash_fingerprint,
    crash_count,
    unique_sessions
  ) values (
    p_project_id,
    p_usage_date,
    p_crash_fingerprint,
    1,
    1
  )
  on conflict (project_id, usage_date, crash_fingerprint)
  do update
  set crash_count = crash_fingerprint_daily.crash_count + 1,
      unique_sessions = crash_fingerprint_daily.unique_sessions + 1,
      updated_at = now();
end;
$$;
