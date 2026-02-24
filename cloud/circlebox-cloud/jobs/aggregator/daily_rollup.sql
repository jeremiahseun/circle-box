-- Daily aggregate materialization for crash fingerprint trend cards.

insert into crash_fingerprint_daily (
  project_id,
  usage_date,
  crash_fingerprint,
  crash_count,
  unique_sessions,
  created_at,
  updated_at
)
select
  reports.project_id,
  date(reports.created_at) as usage_date,
  coalesce(reports.crash_fingerprint, 'unknown') as crash_fingerprint,
  count(*) as crash_count,
  count(distinct reports.session_id) as unique_sessions,
  now(),
  now()
from reports
where reports.created_at >= now() - interval '2 days'
  and reports.has_crash_marker = true
group by reports.project_id, date(reports.created_at), coalesce(reports.crash_fingerprint, 'unknown')
on conflict (project_id, usage_date, crash_fingerprint)
do update set
  crash_count = excluded.crash_count,
  unique_sessions = excluded.unique_sessions,
  updated_at = now();
