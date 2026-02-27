import { notFound } from "next/navigation";
import CrashDetailPage from "../../../../../../components/dashboard/crash-detail-page";
import { getProjectForUser } from "../../../../../../lib/control-plane";
import { requireSession } from "../../../../../../lib/session";

type ProjectCrashDetailPageProps = {
  params: {
    projectId: string;
    reportId: string;
  };
};

export default async function ProjectCrashDetailPage({ params }: ProjectCrashDetailPageProps) {
  const session = await requireSession();
  const project = await getProjectForUser({
    userId: session.userId,
    projectId: params.projectId,
  });
  if (!project) {
    notFound();
  }

  return (
    <CrashDetailPage
      basePath={`/app/projects/${project.id}/crashes`}
      reportId={params.reportId}
      searchParams={{
        project_id: project.id,
        region: project.region,
      }}
    />
  );
}
