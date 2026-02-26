# CircleBox Cloud Website

Single Next.js app for:

- Product landing page (`/`)
- Developer docs (`/docs`)
- Admin dashboard (`/dashboard/crashes`)
- Control plane onboarding (`/signup`, `/login`, `/app/*`)

The dashboard reads crash data from regional Supabase data planes and requests signed raw-download URLs from the worker.

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
- `DASHBOARD_CONTROL_SUPABASE_URL`
- `DASHBOARD_CONTROL_SUPABASE_SERVICE_ROLE_KEY`
- `DASHBOARD_APP_SESSION_SECRET`
- Optional admin auth:
  - `DASHBOARD_ADMIN_USERNAME`
  - `DASHBOARD_ADMIN_PASSWORD`

## Run

```bash
npm install
npm run typecheck
npm run check:links
npm run build
npm run dev
```

## Deploy (Vercel)

From repo root:

```bash
scripts/deploy_vercel_dashboard.sh --token "<VERCEL_TOKEN>"
```

Notes:

- The script reads dashboard env vars from `cloud/dashboard/.env.local`.
- Optional dashboard auth vars are forwarded when set:
  - `DASHBOARD_ADMIN_USERNAME`
  - `DASHBOARD_ADMIN_PASSWORD`
- Use `--target preview` for a preview deploy.

## Behavior

- `/` presents product overview + install/documentation CTAs.
- `/docs` serves MDX guides from `content/docs/*`.
- `/dashboard/crashes` queries live `reports` rows from selected region/project.
- `/dashboard/crashes/[reportId]` shows report metadata plus ordered `report_event_index` timeline.
- `project_id` and `region` can be overridden via query params for testing.
- Raw report download uses a server-side route that requests a short-lived download token from the worker, then redirects to the signed download URL.
- `/signup` creates account + org + first project + ingest/usage keys.
- `/app/projects/[projectId]/keys` supports create/rotate/revoke and one-time key preview.
- `/app/projects/[projectId]/usage` shows ingest usage and optional usage beacon aggregates.

Legacy routes `/crashes` and `/crashes/[reportId]` redirect to `/dashboard/*`.
