# CircleBox Cloud Website

Single Next.js app for:

- Product landing page (`/`)
- Developer docs (`/docs`)
- Admin dashboard (`/dashboard/crashes`)
- Control plane onboarding (`/signup`, `/login`, `/app/*`)

The dashboard reads crash data from regional Supabase data planes and requests signed raw-download URLs from the worker.

## Brand Guidelines

We aim for a "Psychology Premium" aesthetic—trustworthy, clean, and cognitively fluent.

### Colors

- **Primary**: `#0f4c3a` (Deep Forest) - Used for headers, primary actions (hover), and strong branding.
- **Accent**: `#10b981` (Emerald) - Used for success states, highlights, and primary buttons.
- **Background**: `#f8fafc` (Ice White) - A very subtle cool gray/white for the main background.
- **Surface**: `#ffffff` (Pure White) - Used for cards and panels.
- **Ink**: `#1e293b` (Slate 800) - Primary text.
- **Ink Soft**: `#64748b` (Slate 500) - Secondary text.
- **Border**: `#e2e8f0` (Slate 200) - Subtle separation.

### Typography

- **Sans**: `Inter`, system-ui, -apple-system, sans-serif.
- **Mono**: `JetBrains Mono`, `SFMono-Regular`, monospace.

### Principles

1.  **The Halo Effect**: First impressions matter. High-quality visuals and clean layout.
2.  **Cognitive Fluency**: Easy to read, standard patterns, generous whitespace.
3.  **Micro-Interactions**: Subtle feedbacks on hover/focus to delight the user.
4.  **White Space Strategy**: Use space to group related content and separate distinct sections.
5.  **Clarity**: Data density should be high but decipherable.

## Environment

Copy `.env.local.example` to `.env.local` and fill all values:

- `DASHBOARD_DEFAULT_PROJECT_ID` (optional; used for legacy `/dashboard/crashes` without query params)
- `DASHBOARD_DEFAULT_REGION` (`us` or `eu`)
- `DASHBOARD_US_SUPABASE_URL`
- `DASHBOARD_US_SUPABASE_SERVICE_ROLE_KEY`
- `DASHBOARD_EU_SUPABASE_URL`
- `DASHBOARD_EU_SUPABASE_SERVICE_ROLE_KEY`
- `DASHBOARD_WORKER_BASE_URL`
- `DASHBOARD_WORKER_TOKEN`
- `DASHBOARD_PUBLIC_BASE_URL` (used for canonical/SEO metadata)
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
- `/signup` creates account only, then routes to `/app/onboarding` for create-project vs join-project choice.
- `/app/projects/[projectId]/crashes` provides member-scoped crash list/detail for the selected project.
- `/app/projects/[projectId]/keys` supports create/rotate/revoke (owner-only) and one-time key preview.
- `/app/projects/[projectId]/members` lists owner/member workspace access.
- `/app/projects/[projectId]/invites` supports token invite creation + revoke flow (owner-only, emailless token sharing).
- `/app/invites/accept` lets authenticated users accept invite tokens.
- `/app/projects/[projectId]/usage` shows ingest usage and optional usage beacon aggregates.

Legacy routes `/crashes` and `/crashes/[reportId]` redirect to `/dashboard/*`.
