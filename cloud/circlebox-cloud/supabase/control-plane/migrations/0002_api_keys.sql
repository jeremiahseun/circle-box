-- CircleBox Cloud control plane key management (Phase 3 productionization)

create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  key_type text not null check (key_type in ('ingest', 'usage_beacon')),
  key_prefix text not null unique,
  hashed_secret text not null,
  region_scope text not null check (region_scope in ('us', 'eu', 'auto')),
  active boolean not null default true,
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create table if not exists api_key_audit_log (
  id uuid primary key default gen_random_uuid(),
  api_key_id uuid references api_keys(id) on delete set null,
  project_id uuid not null references projects(id) on delete cascade,
  actor_user_id uuid,
  action text not null check (action in ('create', 'rotate', 'revoke')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists personal_access_tokens (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null,
  token_prefix text not null unique,
  hashed_token text not null,
  scopes text[] not null default '{}',
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create table if not exists usage_beacon_daily (
  project_id uuid not null references projects(id) on delete cascade,
  usage_date date not null,
  sdk_family text not null,
  sdk_version text not null,
  mode text not null check (mode in ('offline_only', 'core_cloud', 'core_adapters', 'core_cloud_adapters', 'self_host')),
  active_apps integer not null default 0,
  crash_reports bigint not null default 0,
  events_emitted bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, usage_date, sdk_family, sdk_version, mode)
);

create index if not exists idx_api_keys_project on api_keys(project_id) where active;
create index if not exists idx_api_keys_type on api_keys(key_type) where active;
create index if not exists idx_pat_org on personal_access_tokens(organization_id) where active;
