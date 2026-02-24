-- CircleBox Cloud control plane schema (Phase 3A)

create extension if not exists pgcrypto;

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists organization_members (
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  region text not null check (region in ('us', 'eu')),
  plan_tier text not null default 'free' check (plan_tier in ('free', 'pro', 'enterprise')),
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  created_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists project_ingest_keys (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  key_prefix text not null,
  hashed_key text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  unique (key_prefix)
);

create table if not exists quotas (
  plan_tier text primary key check (plan_tier in ('free', 'pro', 'enterprise')),
  max_reports_per_day integer not null,
  max_events_per_day integer not null,
  max_bytes_per_day bigint not null,
  hard_enforced boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into quotas (plan_tier, max_reports_per_day, max_events_per_day, max_bytes_per_day, hard_enforced)
values
  ('free', 500, 50000, 1073741824, false),
  ('pro', 20000, 2000000, 21474836480, false),
  ('enterprise', 500000, 50000000, 536870912000, true)
on conflict (plan_tier) do nothing;

create table if not exists usage_daily (
  project_id uuid not null references projects(id) on delete cascade,
  usage_date date not null,
  reports_count integer not null default 0,
  events_count bigint not null default 0,
  bytes_count bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, usage_date)
);

create table if not exists alert_policies (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  rule text not null,
  destination_type text not null check (destination_type in ('slack', 'webhook', 'email')),
  destination_value text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists alert_deliveries (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references alert_policies(id) on delete cascade,
  delivered_at timestamptz not null default now(),
  status text not null check (status in ('success', 'failed')),
  response_code integer,
  response_body text
);

create table if not exists billing_accounts (
  project_id uuid primary key references projects(id) on delete cascade,
  provider text not null default 'stripe',
  external_customer_id text,
  external_subscription_id text,
  status text not null default 'trial' check (status in ('trial', 'active', 'past_due', 'canceled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_projects_org on projects(organization_id);
create index if not exists idx_ingest_keys_project on project_ingest_keys(project_id) where active;
create index if not exists idx_usage_daily_date on usage_daily(usage_date);
