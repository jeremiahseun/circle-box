import { redirect } from "next/navigation";
import type { DashboardSearchParams } from "../../lib/env";

type LegacyCrashesRedirectProps = {
  searchParams?: DashboardSearchParams;
};

export default function LegacyCrashesRedirect({ searchParams = {} }: LegacyCrashesRedirectProps) {
  redirect(`/dashboard/crashes${toQueryString(searchParams)}`);
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
