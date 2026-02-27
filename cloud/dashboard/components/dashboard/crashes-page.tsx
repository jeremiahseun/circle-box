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
            <h2 style={{ marginTop: 0 }}>Project Scope Required</h2>
            <p style={{ marginBottom: 0 }}>
              No project selected. Please select a project from the settings or use <code>project_id</code> query param.
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
    <section style={{ display: "grid", gap: "var(--space-6)" }}>
      {/* Filters Card */}
      <Card>
        <div style={{ padding: "var(--space-5)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--space-4)" }}>
                <h3 style={{ margin: 0, fontSize: "1rem" }}>Filters</h3>
                <div style={{ fontSize: "0.85rem", color: "var(--c-ink-soft)" }}>
                    Project: <code style={{ color: "var(--c-primary)" }}>{projectId}</code> | Region: <code>{scope.region}</code>
                </div>
            </div>
          <form method="GET" style={{ display: "flex", gap: "var(--space-3)", alignItems: "end", flexWrap: "wrap" }}>
            <input type="hidden" name="project_id" value={projectId} />
            <input type="hidden" name="region" value={scope.region} />
            <div style={{ flex: 1, minWidth: "160px" }}>
                <label>Platform</label>
                <select name="platform" defaultValue={platform} style={{ width: "100%" }}>
                    <option value="">All Platforms</option>
                    <option value="ios">iOS</option>
                    <option value="android">Android</option>
                    <option value="flutter">Flutter</option>
                    <option value="react-native">React Native</option>
                </select>
            </div>
            <div style={{ flex: 2, minWidth: "220px" }}>
                <label>Fingerprint</label>
                <input
                    name="crash_fingerprint"
                    defaultValue={crashFingerprint}
                    placeholder="Search fingerprint..."
                    style={{ width: "100%" }}
                />
            </div>
            <div style={{ width: "80px" }}>
                <label>Limit</label>
                <input name="limit" type="number" defaultValue={String(Number.isFinite(limit) ? limit : 100)} style={{ width: "100%" }} />
            </div>
            <button className="btn btn-primary" type="submit" style={{ height: "42px" }}>Apply</button>
          </form>
        </div>
      </Card>

      {dataError && (
        <div style={{ padding: "var(--space-4)", background: "var(--c-danger-bg)", color: "var(--c-danger)", borderRadius: "var(--radius-md)" }}>
          Query failed: <code>{dataError}</code>
        </div>
      )}

      {!dataError && reports.length === 0 && (
          <div style={{ textAlign: "center", padding: "var(--space-12)", color: "var(--c-ink-soft)" }}>
              <p>No crash reports found matching your criteria.</p>
          </div>
      )}

      {/* Grouped Fingerprints Table */}
      {!dataError && reports.length > 0 && (
        <Card>
          <div style={{ padding: "var(--space-5)" }}>
            <h3 style={{ marginTop: 0, marginBottom: "var(--space-4)", fontSize: "1.1rem" }}>Top Issues</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fingerprint</th>
                    <th style={{ width: "120px" }}>Impact</th>
                    <th style={{ width: "180px" }}>Last Seen</th>
                    <th style={{ width: "150px" }}>Platforms</th>
                  </tr>
                </thead>
                <tbody>
                  {groupReportsByFingerprint(reports).map((group) => (
                    <tr key={group.key}>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>
                          <span style={{
                              display: "inline-block",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              background: "var(--c-bg)",
                              border: "1px solid var(--c-border)"
                          }}>
                              {group.fingerprint.substring(0, 32)}{group.fingerprint.length > 32 ? "..." : ""}
                          </span>
                      </td>
                      <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontWeight: 700 }}>{group.count}</span>
                              <div style={{
                                  height: "4px",
                                  flex: 1,
                                  background: "var(--c-bg)",
                                  borderRadius: "2px",
                                  overflow: "hidden"
                              }}>
                                  <div style={{
                                      height: "100%",
                                      width: `${Math.min(100, (group.count / reports.length) * 100)}%`,
                                      background: "var(--c-danger)"
                                  }} />
                              </div>
                          </div>
                      </td>
                      <td style={{ color: "var(--c-ink-soft)", fontSize: "0.85rem" }}>
                          {new Date(group.lastSeenUnixMs).toLocaleString()}
                      </td>
                      <td>
                          <div style={{ display: "flex", gap: "4px" }}>
                            {group.platforms.map(p => (
                                <span key={p} className="badge" style={{ fontSize: "0.7rem", padding: "1px 6px" }}>
                                    {p}
                                </span>
                            ))}
                          </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* Recent Reports Table */}
      {!dataError && reports.length > 0 && (
        <Card>
          <div style={{ padding: "var(--space-5)" }}>
            <h3 style={{ marginTop: 0, marginBottom: "var(--space-4)", fontSize: "1.1rem" }}>Recent Reports</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Report ID</th>
                    <th>Platform</th>
                    <th>Version</th>
                    <th>Fingerprint</th>
                    <th>Events</th>
                    <th>Generated</th>
                    <th></th>
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
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>
                          <a href={`${basePath}/${report.id}?${detailQuery.toString()}`} style={{ fontWeight: 600 }}>
                              {report.id.substring(0, 8)}...
                          </a>
                        </td>
                        <td>
                            <span className="badge" style={{ textTransform: "capitalize" }}>{report.platform}</span>
                        </td>
                        <td style={{ fontSize: "0.9rem" }}>
                          {report.app_version} <span style={{ color: "var(--c-ink-faint)" }}>({report.build_number})</span>
                        </td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--c-ink-soft)" }}>
                            {report.crash_fingerprint ? report.crash_fingerprint.substring(0, 12) + "..." : "-"}
                        </td>
                        <td>{report.event_count}</td>
                        <td style={{ fontSize: "0.85rem", color: "var(--c-ink-soft)" }}>
                            {new Date(report.generated_at_unix_ms).toLocaleString()}
                        </td>
                        <td style={{ textAlign: "right" }}>
                            <a href={`${basePath}/${report.id}?${detailQuery.toString()}`} className="btn btn-sm" style={{ padding: "4px 8px", fontSize: "0.8rem" }}>
                                View
                            </a>
                        </td>
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
