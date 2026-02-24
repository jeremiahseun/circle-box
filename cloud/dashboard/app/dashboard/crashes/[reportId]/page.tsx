import type { DashboardSearchParams } from "../../../../lib/env";
import CrashDetailPage from "../../../../components/dashboard/crash-detail-page";

type PageProps = {
  params: { reportId: string };
  searchParams?: DashboardSearchParams;
};

export default async function DashboardCrashDetailRoute({ params, searchParams = {} }: PageProps) {
  return <CrashDetailPage reportId={params.reportId} searchParams={searchParams} />;
}
