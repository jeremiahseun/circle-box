import { redirect } from "next/navigation";
import { requireSession } from "../../../lib/session";
import { listProjectsForUser } from "../../../lib/control-plane";
import type { DashboardSearchParams } from "../../../lib/env";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: DashboardSearchParams;
};

export default async function DashboardCrashesRoute({ searchParams = {} }: PageProps) {
    // This route /dashboard/crashes is legacy and seems to require project_id query param.
    // Instead of showing "Scope Required", let's auto-select a project.

    if (searchParams.project_id) {
        // If ID is present, redirect to the new scoped path for consistency
        redirect(`/app/projects/${searchParams.project_id}/crashes`);
    }

    const session = await requireSession();
    const projects = await listProjectsForUser(session.userId);

    if (projects.length > 0) {
        redirect(`/app/projects/${projects[0].id}/crashes`);
    }

    redirect("/app/onboarding");
}
