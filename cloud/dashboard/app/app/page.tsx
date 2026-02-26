import { redirect } from "next/navigation";
import { listProjectsForUser } from "../../lib/control-plane";
import { requireSession } from "../../lib/session";

export default async function AppHomePage() {
  const session = await requireSession();
  const projects = await listProjectsForUser(session.userId);
  if (projects.length === 0) {
    redirect("/app/projects/new");
  }
  redirect(`/app/projects/${projects[0].id}/keys`);
}
