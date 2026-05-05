import { listReports } from "../../lib/data-plane";
import { firstValue, resolveDashboardScope, type DashboardSearchParams } from "../../lib/env";
import { formatRelativeTime } from "../../lib/ui/format";
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

  const fingerprints = groupReportsByFingerprint(reports);

  return (
    <section style={{ display: "grid", gap: "var(--space-6)" }}>
      {/* Back Button */}
      <div style={{ marginBottom: "-8px" }}>
        <a href={`/app/projects/${projectId}`} className="btn btn-sm" style={{ padding: "6px 12px", display: "inline-flex", gap: "6px", alignItems: "center", background: "transparent", border: "1px solid var(--c-border)", color: "var(--c-ink-soft)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to Dashboard
        </a>
      </div>

      {/* Filters Card */}
      <Card>
        <div style={{ padding: "var(--space-5)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)", flexWrap: "wrap", gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: "1rem" }}>Filters</h3>
                <div style={{ fontSize: "0.82rem", color: "var(--c-ink-soft)", fontFamily: "var(--font-mono)" }}>
                    {scope.region.toUpperCase()} · {projectId.substring(0, 8)}…
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
                    placeholder="Filter by fingerprint…"
                    style={{ width: "100%" }}
                />
            </div>
            <div style={{ width: "90px" }}>
                <label>Limit</label>
                <input name="limit" type="number" defaultValue={String(Number.isFinite(limit) ? limit : 100)} min="1" max="500" style={{ width: "100%" }} />
            </div>
            <button className="btn btn-primary" type="submit" style={{ height: "42px" }}>Apply</button>
            {(platform || crashFingerprint) && (
              <a href={`?project_id=${projectId}&region=${scope.region}`} className="btn" style={{ height: "42px" }}>Clear</a>
            )}
          </form>
        </div>
      </Card>

      {dataError && (
        <div style={{ padding: "var(--space-4)", background: "var(--c-danger-bg)", color: "var(--c-danger)", borderRadius: "var(--radius-md)", fontSize: "0.9rem" }}>
          Query failed: <code>{dataError}</code>
        </div>
      )}

      {!dataError && reports.length === 0 && (
        <Card>
          <div style={{ textAlign: "center", padding: "var(--space-12)", color: "var(--c-ink-soft)" }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3, marginBottom: 12 }}>
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <p style={{ margin: 0, fontWeight: 500 }}>No crash reports found</p>
            <p style={{ margin: "6px 0 0", fontSize: "0.875rem" }}>
              {platform || crashFingerprint ? "Try adjusting your filters." : "Integrate the SDK and upload your first crash report to see it here."}
            </p>
          </div>
        </Card>
      )}

      {/* Grouped Fingerprints Table */}
      {!dataError && fingerprints.length > 0 && (
        <Card>
          <div style={{ padding: "var(--space-5)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
              <h3 style={{ marginTop: 0, marginBottom: 0, fontSize: "1.1rem" }}>Top Issues</h3>
              <span style={{ fontSize: "0.82rem", color: "var(--c-ink-soft)" }}>
                {fingerprints.length} unique crash signature{fingerprints.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fingerprint</th>
                    <th style={{ width: "100px" }}>Occurrences</th>
                    <th style={{ width: "130px" }}>First Seen</th>
                    <th style={{ width: "130px" }}>Last Seen</th>
                    <th style={{ width: "140px" }}>Platforms</th>
                  </tr>
                </thead>
                <tbody>
                  {fingerprints.map((group) => {
                    const impactPct = Math.min(100, (group.count / reports.length) * 300);
                    return (
                      <tr key={group.key}>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>
                          <a
                            href={`?project_id=${projectId}&region=${scope.region}&crash_fingerprint=${encodeURIComponent(group.fingerprint)}`}
                            style={{ fontWeight: 600 }}
                          >
                            {group.fingerprint === "(none)"
                              ? <span style={{ color: "var(--c-ink-faint)", fontStyle: "italic" }}>no fingerprint</span>
                              : <>{group.fingerprint.substring(0, 28)}{group.fingerprint.length > 28 ? "…" : ""}</>
                            }
                          </a>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontWeight: 700, minWidth: "24px" }}>{group.count}</span>
                            <div style={{ height: "4px", flex: 1, background: "var(--c-bg)", borderRadius: "2px", overflow: "hidden", minWidth: "40px" }}>
                              <div style={{ height: "100%", width: `${impactPct}%`, background: "var(--c-danger)", borderRadius: "2px" }} />
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: "0.82rem", color: "var(--c-ink-soft)" }} title={new Date(group.firstSeenUnixMs).toLocaleString()}>
                          {formatRelativeTime(group.firstSeenUnixMs)}
                        </td>
                        <td style={{ fontSize: "0.82rem", color: "var(--c-ink-soft)" }} title={new Date(group.lastSeenUnixMs).toLocaleString()}>
                          {formatRelativeTime(group.lastSeenUnixMs)}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "3px", flexWrap: "wrap" }}>
                            {group.platforms.map(p => (
                              <span key={p} className="badge" style={{ fontSize: "0.68rem", padding: "1px 6px" }}>
                                {p}
                              </span>
                            ))}
                          </div>
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

      {/* Recent Reports Table */}
      {!dataError && reports.length > 0 && (
        <Card>
          <div style={{ padding: "var(--space-5)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
              <h3 style={{ marginTop: 0, marginBottom: 0, fontSize: "1.1rem" }}>Recent Reports</h3>
              <span style={{ fontSize: "0.82rem", color: "var(--c-ink-soft)" }}>{reports.length} report{reports.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Report ID</th>
                    <th>Platform</th>
                    <th>App Version</th>
                    <th>Fingerprint</th>
                    <th style={{ textAlign: "right" }}>Events</th>
                    <th>When</th>
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
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>
                          <a href={`${basePath}/${report.id}?${detailQuery.toString()}`} style={{ fontWeight: 600 }}>
                              {report.id.substring(0, 8)}…
                          </a>
                        </td>
                        <td>
                          <span className="badge" style={{ textTransform: "capitalize", fontSize: "0.72rem" }}>{report.platform}</span>
                        </td>
                        <td style={{ fontSize: "0.875rem" }}>
                          {report.app_version}
                          {report.build_number && <span style={{ color: "var(--c-ink-faint)", fontSize: "0.8rem" }}> ({report.build_number})</span>}
                        </td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--c-ink-soft)", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {report.crash_fingerprint ? report.crash_fingerprint.substring(0, 16) + "…" : <span style={{ color: "var(--c-ink-faint)" }}>—</span>}
                        </td>
                        <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{report.event_count}</td>
                        <td
                          style={{ fontSize: "0.82rem", color: "var(--c-ink-soft)", whiteSpace: "nowrap" }}
                          title={new Date(report.generated_at_unix_ms).toLocaleString()}
                        >
                          {formatRelativeTime(report.generated_at_unix_ms)}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <a href={`${basePath}/${report.id}?${detailQuery.toString()}`} className="btn btn-sm" style={{ padding: "4px 10px", fontSize: "0.78rem" }}>
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
    firstSeenUnixMs: number;
    lastSeenUnixMs: number;
    platforms: Set<string>;
  }>();

  for (const report of reports) {
    const key = report.crash_fingerprint ?? `no-fingerprint:${report.id}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.count += 1;
      existing.firstSeenUnixMs = Math.min(existing.firstSeenUnixMs, report.generated_at_unix_ms);
      existing.lastSeenUnixMs = Math.max(existing.lastSeenUnixMs, report.generated_at_unix_ms);
      existing.platforms.add(report.platform);
      continue;
    }
    grouped.set(key, {
      key,
      fingerprint: report.crash_fingerprint ?? "(none)",
      count: 1,
      firstSeenUnixMs: report.generated_at_unix_ms,
      lastSeenUnixMs: report.generated_at_unix_ms,
      platforms: new Set([report.platform]),
    });
  }

  return Array.from(grouped.values())
    .map((group) => ({
      key: group.key,
      fingerprint: group.fingerprint,
      count: group.count,
      firstSeenUnixMs: group.firstSeenUnixMs,
      lastSeenUnixMs: group.lastSeenUnixMs,
      platforms: Array.from(group.platforms).sort(),
    }))
    .sort((a, b) => b.count - a.count || b.lastSeenUnixMs - a.lastSeenUnixMs);
}
