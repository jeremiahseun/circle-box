import { listReports } from "../../lib/data-plane";
import { firstValue, resolveDashboardScope, type DashboardSearchParams } from "../../lib/env";
import { Card } from "../ui/card";

type CrashesPageProps = {
  searchParams?: DashboardSearchParams;
  basePath?: string;
};

export default async function CrashesPage({ searchParams = {}, basePath = "/dashboard/crashes" }: CrashesPageProps) {
  const scope = resolveDashboardScope(searchParams);
  if (!scope.projectId) {
    return (
      <section style={{ display: "grid", gap: 16 }}>
        <Card>
          <div style={{ padding: 20 }}>
            <h2 style={{ marginTop: 0 }}>Crash Timeline Explorer</h2>
            <p style={{ marginBottom: 0 }}>
              No project selected. Use <code>project_id</code> query param or set <code>DASHBOARD_DEFAULT_PROJECT_ID</code>.
            </p>
          </div>
        </Card>
      </section>
    );
  }
  const projectId = scope.projectId;
  const platform = firstValue(searchParams.platform)?.trim();
  const crashFingerprint = firstValue(searchParams.crash_fingerprint)?.trim();
  const limit = Number(firstValue(searchParams.limit) ?? "100");

  let reports = [] as Awaited<ReturnType<typeof listReports>>;
  let dataError: string | null = null;
  try {
    reports = await listReports({
      projectId,
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
            Project: <code>{projectId}</code> | Region: <code>{scope.region}</code>
          </p>
        </div>
      </Card>

      <Card>
        <div style={{ padding: 18 }}>
          <form method="GET" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <input type="hidden" name="project_id" value={projectId} />
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
            <h3>Grouped Fingerprints</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fingerprint</th>
                    <th>Impact Count</th>
                    <th>Last Seen</th>
                    <th>Platform Mix</th>
                  </tr>
                </thead>
                <tbody>
                  {groupReportsByFingerprint(reports).map((group) => (
                    <tr key={group.key}>
                      <td>{group.fingerprint}</td>
                      <td>{group.count}</td>
                      <td>{new Date(group.lastSeenUnixMs).toLocaleString()}</td>
                      <td>{group.platforms.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

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
                      project_id: projectId,
                      region: scope.region,
                    });
                    return (
                      <tr key={report.id}>
                        <td>
                          <a href={`${basePath}/${report.id}?${detailQuery.toString()}`}>{report.id}</a>
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

function groupReportsByFingerprint(reports: Awaited<ReturnType<typeof listReports>>) {
  const grouped = new Map<string, {
    key: string;
    fingerprint: string;
    count: number;
    lastSeenUnixMs: number;
    platforms: Set<string>;
  }>();

  for (const report of reports) {
    const key = report.crash_fingerprint ?? `no-fingerprint:${report.id}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.count += 1;
      existing.lastSeenUnixMs = Math.max(existing.lastSeenUnixMs, report.generated_at_unix_ms);
      existing.platforms.add(report.platform);
      continue;
    }
    grouped.set(key, {
      key,
      fingerprint: report.crash_fingerprint ?? "(none)",
      count: 1,
      lastSeenUnixMs: report.generated_at_unix_ms,
      platforms: new Set([report.platform]),
    });
  }

  return Array.from(grouped.values())
    .map((group) => ({
      key: group.key,
      fingerprint: group.fingerprint,
      count: group.count,
      lastSeenUnixMs: group.lastSeenUnixMs,
      platforms: Array.from(group.platforms).sort(),
    }))
    .sort((a, b) => b.count - a.count || b.lastSeenUnixMs - a.lastSeenUnixMs);
}
