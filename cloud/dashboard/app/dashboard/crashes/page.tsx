import type { DashboardSearchParams } from "../../../lib/env";
import CrashesPage from "../../../components/dashboard/crashes-page";

type PageProps = {
  searchParams?: DashboardSearchParams;
};

export default async function DashboardCrashesRoute({ searchParams = {} }: PageProps) {
  return <CrashesPage searchParams={searchParams} />;
}
