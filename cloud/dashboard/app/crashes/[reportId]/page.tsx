import { redirect } from "next/navigation";
import type { DashboardSearchParams } from "../../../lib/env";

type LegacyCrashDetailRedirectProps = {
  params: { reportId: string };
  searchParams?: DashboardSearchParams;
};

export default function LegacyCrashDetailRedirect({ params, searchParams = {} }: LegacyCrashDetailRedirectProps) {
  redirect(`/dashboard/crashes/${params.reportId}${toQueryString(searchParams)}`);
}

function toQueryString(searchParams: DashboardSearchParams): string {
  const query = new URLSearchParams();
  for (const [key, rawValue] of Object.entries(searchParams)) {
    if (typeof rawValue === "string") {
      query.set(key, rawValue);
      continue;
    }
    if (Array.isArray(rawValue)) {
      for (const value of rawValue) {
        query.append(key, value);
      }
    }
  }
  const encoded = query.toString();
  return encoded.length > 0 ? `?${encoded}` : "";
}
