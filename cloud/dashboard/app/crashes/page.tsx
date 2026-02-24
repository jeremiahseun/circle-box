import Link from "next/link";
import { listReports } from "../../lib/data-plane";
import { firstValue, resolveDashboardScope, type DashboardSearchParams } from "../../lib/env";

type CrashesPageProps = {
  searchParams?: DashboardSearchParams;
};

export default async function CrashesPage({ searchParams = {} }: CrashesPageProps) {
  const scope = resolveDashboardScope(searchParams);
  const platform = firstValue(searchParams.platform)?.trim();
  const crashFingerprint = firstValue(searchParams.crash_fingerprint)?.trim();
  const limit = Number(firstValue(searchParams.limit) ?? "100");

  let reports = [] as Awaited<ReturnType<typeof listReports>>;
  let dataError: string | null = null;
  try {
    reports = await listReports({
      projectId: scope.projectId,
      region: scope.region,
      platform: platform && platform.length > 0 ? platform : undefined,
      crashFingerprint: crashFingerprint && crashFingerprint.length > 0 ? crashFingerprint : undefined,
      limit: Number.isFinite(limit) ? limit : 100,
    });
  } catch (error) {
    dataError = error instanceof Error ? error.message : "failed_to_load_reports";
  }

  return (
    <section>
      <h2>Crashes</h2>
      <p>
        Project: <code>{scope.projectId}</code> | Region: <code>{scope.region}</code>
      </p>

      <form method="GET" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <input type="hidden" name="project_id" value={scope.projectId} />
        <input type="hidden" name="region" value={scope.region} />
        <label>
          Platform{" "}
          <input
            name="platform"
            defaultValue={platform}
            placeholder="ios | android"
            style={{ minWidth: 160 }}
          />
        </label>
        <label>
          Fingerprint{" "}
          <input
            name="crash_fingerprint"
            defaultValue={crashFingerprint}
            placeholder="fp_..."
            style={{ minWidth: 180 }}
          />
        </label>
        <label>
          Limit <input name="limit" defaultValue={String(Number.isFinite(limit) ? limit : 100)} style={{ width: 80 }} />
        </label>
        <button type="submit">Apply Filters</button>
      </form>

      {dataError && (
        <p style={{ color: "#b91c1c" }}>
          Query failed: <code>{dataError}</code>
        </p>
      )}

      {!dataError && reports.length === 0 && <p>No reports found for current filter scope.</p>}

      {!dataError && reports.length > 0 && (
        <table style={{ borderCollapse: "collapse", width: "100%", marginTop: 16 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", borderBottom: "1px solid #cbd5e1" }}>Report</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #cbd5e1" }}>Platform</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #cbd5e1" }}>Version</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #cbd5e1" }}>Fingerprint</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #cbd5e1" }}>Events</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #cbd5e1" }}>Generated</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => {
              const detailQuery = new URLSearchParams({
                project_id: scope.projectId,
                region: scope.region,
              });
              return (
                <tr key={report.id}>
                  <td style={{ padding: "8px 0" }}>
                    <Link href={`/crashes/${report.id}?${detailQuery.toString()}`}>{report.id}</Link>
                  </td>
                  <td>{report.platform}</td>
                  <td>
                    {report.app_version} ({report.build_number})
                  </td>
                  <td>{report.crash_fingerprint ?? "-"}</td>
                  <td>{report.event_count}</td>
                  <td>{new Date(report.generated_at_unix_ms).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
