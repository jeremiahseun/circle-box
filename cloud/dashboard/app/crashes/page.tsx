import { redirect } from "next/navigation";
import { requireSession } from "../../lib/session";
import { listProjectsForUser } from "../../lib/control-plane";
import type { DashboardSearchParams } from "../../lib/env";

type LegacyCrashesRedirectProps = {
  searchParams?: DashboardSearchParams;
};

export default async function LegacyCrashesRedirect({ searchParams = {} }: LegacyCrashesRedirectProps) {
  // If we already have a project_id, we might want to redirect to the new scoped path
  // or just let the legacy /dashboard/crashes handle it (which we saw also requires scope).

  // Best practice: Try to find a default project for the user and redirect to that project's crash view.
  const session = await requireSession();
  const projects = await listProjectsForUser(session.userId);

  if (projects.length > 0) {
      redirect(`/app/projects/${projects[0].id}/crashes`);
  }

  // If no projects, go to onboarding or new project
  redirect("/app/onboarding");
}
