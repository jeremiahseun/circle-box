import { redirect } from "next/navigation";
import { requireSession } from "../../lib/session";
import { listProjectsForUser } from "../../lib/control-plane";

export default async function DashboardHomePage() {
  const session = await requireSession();
  const projects = await listProjectsForUser(session.userId);

  if (projects.length > 0) {
    redirect(`/app/projects/${projects[0].id}`);
  }

  redirect("/app/onboarding");
}
