-- CircleBox MVP guardrails: key throttles, invites, retention defaults, and audit events

alter table if exists api_keys
  add column if not exists max_reports_per_minute integer not null default 120 check (max_reports_per_minute > 0),
  add column if not exists max_fragments_per_minute integer not null default 240 check (max_fragments_per_minute > 0),
  add column if not exists burst_limit integer not null default 40 check (burst_limit >= 0);

create table if not exists organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  role text not null check (role in ('member')),
  invite_token_hash text not null unique,
  invited_by uuid,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_org_invites_org on organization_invites(organization_id);
create index if not exists idx_org_invites_email on organization_invites(email);
create index if not exists idx_org_invites_pending on organization_invites(organization_id, expires_at)
  where accepted_at is null and revoked_at is null;

create table if not exists project_retention_policies (
  project_id uuid primary key references projects(id) on delete cascade,
  raw_retention_days integer not null default 30 check (raw_retention_days between 1 and 3650),
  aggregate_retention_days integer not null default 180 check (aggregate_retention_days between 1 and 3650),
  updated_at timestamptz not null default now()
);

insert into project_retention_policies (project_id, raw_retention_days, aggregate_retention_days)
select id, 30, 180
from projects
on conflict (project_id) do nothing;

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  action_type text not null,
  actor_user_id uuid,
  organization_id uuid references organizations(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  ip_hash text,
  user_agent_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_events_created on audit_events(created_at desc);
create index if not exists idx_audit_events_org on audit_events(organization_id, created_at desc);
create index if not exists idx_audit_events_project on audit_events(project_id, created_at desc);
