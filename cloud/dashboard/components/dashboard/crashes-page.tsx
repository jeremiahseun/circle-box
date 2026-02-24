import { listReports } from "../../lib/data-plane";
import { firstValue, resolveDashboardScope, type DashboardSearchParams } from "../../lib/env";
import { Card } from "../ui/card";

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
    <section style={{ display: "grid", gap: 16 }}>
      <Card>
        <div style={{ padding: 20 }}>
          <h2 style={{ marginTop: 0 }}>Crash Timeline Explorer</h2>
          <p style={{ marginBottom: 0 }}>
            Project: <code>{scope.projectId}</code> | Region: <code>{scope.region}</code>
          </p>
        </div>
      </Card>

      <Card>
        <div style={{ padding: 18 }}>
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
              Limit{" "}
              <input name="limit" defaultValue={String(Number.isFinite(limit) ? limit : 100)} style={{ width: 80 }} />
            </label>
            <button className="btn" type="submit">Apply Filters</button>
          </form>
        </div>
      </Card>

      {dataError && (
        <p style={{ color: "var(--danger)" }}>
          Query failed: <code>{dataError}</code>
        </p>
      )}

      {!dataError && reports.length === 0 && <p>No reports found for current filter scope.</p>}

      {!dataError && reports.length > 0 && (
        <Card>
          <div style={{ padding: "6px 16px 12px" }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Report</th>
                    <th>Platform</th>
                    <th>Version</th>
                    <th>Fingerprint</th>
                    <th>Events</th>
                    <th>Generated</th>
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
                        <td>
                          <a href={`/dashboard/crashes/${report.id}?${detailQuery.toString()}`}>{report.id}</a>
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
            </div>
          </div>
        </Card>
      )}
    </section>
  );
}
