# CircleBox Cloud Dashboard

Next.js dashboard for timeline-first crash investigation backed by CircleBox Cloud data planes.

## Environment

Copy `.env.local.example` to `.env.local` and fill all values:

- `DASHBOARD_DEFAULT_PROJECT_ID`
- `DASHBOARD_DEFAULT_REGION` (`us` or `eu`)
- `DASHBOARD_US_SUPABASE_URL`
- `DASHBOARD_US_SUPABASE_SERVICE_ROLE_KEY`
- `DASHBOARD_EU_SUPABASE_URL`
- `DASHBOARD_EU_SUPABASE_SERVICE_ROLE_KEY`
- `DASHBOARD_WORKER_BASE_URL`
- `DASHBOARD_WORKER_TOKEN`

## Run

```bash
npm install
npm run typecheck
```

## Behavior

- `/crashes` queries live `reports` rows from selected region/project.
- `/crashes/[reportId]` shows report metadata plus ordered `report_event_index` timeline.
- `project_id` and `region` can be overridden via query params for testing.
- Raw report download uses a server-side route that requests a short-lived download token from the worker, then redirects to the signed download URL.
