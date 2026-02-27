import { notFound } from "next/navigation";
import CrashesPage from "../../../../../components/dashboard/crashes-page";
import { getProjectForUser } from "../../../../../lib/control-plane";
import { requireSession } from "../../../../../lib/session";

type ProjectCrashesPageProps = {
  params: { projectId: string };
};

export default async function ProjectCrashesPage({ params }: ProjectCrashesPageProps) {
  const session = await requireSession();
  const project = await getProjectForUser({
    userId: session.userId,
    projectId: params.projectId,
  });
  if (!project) {
    notFound();
  }

  return (
    <CrashesPage
      basePath={`/app/projects/${project.id}/crashes`}
      searchParams={{
        project_id: project.id,
        region: project.region,
      }}
    />
  );
}
