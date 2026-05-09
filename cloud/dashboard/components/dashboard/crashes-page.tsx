import { listReports } from "../../lib/data-plane";
import { firstValue, resolveDashboardScope, type DashboardSearchParams } from "../../lib/env";
import { Card } from "../ui/card";

type CrashesPageProps = {
  searchParams?: DashboardSearchParams;
  basePath?: string;
};

function relativeTime(unixMs: number): string {
  const diffMs = Date.now() - unixMs;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(unixMs).toLocaleDateString();
}

const PLATFORM_COLORS: Record<string, { bg: string; color: string }> = {
  ios:           { bg: "#eff6ff", color: "#1d4ed8" },
  android:       { bg: "#f0fdf4", color: "#15803d" },
  flutter:       { bg: "#fdf4ff", color: "#7e22ce" },
  "react-native": { bg: "#fff7ed", color: "#c2410c" },
};

function PlatformChip({ platform }: { platform: string }) {
  const style = PLATFORM_COLORS[platform.toLowerCase()] ?? { bg: "var(--c-bg)", color: "var(--c-ink-soft)" };
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "2px 8px",
      borderRadius: 999,
      fontSize: "0.75rem",
      fontWeight: 600,
      background: style.bg,
      color: style.color,
      textTransform: "capitalize",
    }}>
      {platform}
    </span>
  );
}

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
  const maxCount = fingerprints.length > 0 ? fingerprints[0].count : 1;

  return (
    <section style={{ display: "grid", gap: "var(--space-5)" }}>
      {/* Back Button */}
      <div style={{ marginBottom: "-4px" }}>
        <a
          href={`/app/projects/${projectId}`}
          className="btn btn-sm"
          style={{ padding: "6px 12px", display: "inline-flex", gap: "6px", alignItems: "center", background: "transparent", border: "1px solid var(--c-border)", color: "var(--c-ink-soft)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Dashboard
        </a>
      </div>

      {/* Active fingerprint filter banner */}
      {crashFingerprint && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 16px",
          background: "var(--c-accent-subtle)",
          border: "1px solid var(--c-accent)",
          borderRadius: "var(--radius-md)",
          fontSize: "0.875rem",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--c-accent)" strokeWidth="2">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
          <span style={{ color: "var(--c-primary)" }}>
            Filtered by fingerprint: <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>{crashFingerprint.substring(0, 40)}</code>
          </span>
          <a
            href={`${basePath}?project_id=${projectId}&region=${scope.region}`}
            style={{ marginLeft: "auto", fontSize: "0.8rem", color: "var(--c-ink-soft)" }}
          >
            Clear filter ×
          </a>
        </div>
      )}

      {/* Filters Card */}
      <Card>
        <div style={{ padding: "var(--space-5)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
            <h3 style={{ margin: 0, fontSize: "1rem" }}>Filters</h3>
            <div style={{ fontSize: "0.8rem", color: "var(--c-ink-soft)" }}>
              <code style={{ color: "var(--c-primary)" }}>{projectId}</code>
              <span style={{ margin: "0 6px" }}>·</span>
              <code>{scope.region.toUpperCase()}</code>
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
        <div style={{ padding: "var(--space-4)", background: "var(--c-danger-bg)", color: "var(--c-danger)", borderRadius: "var(--radius-md)", display: "flex", gap: 8, alignItems: "center" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Query failed: <code>{dataError}</code>
        </div>
      )}

      {!dataError && reports.length === 0 && (
        <div style={{ textAlign: "center", padding: "64px 24px", color: "var(--c-ink-soft)" }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3, marginBottom: 16 }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <p style={{ margin: 0, fontWeight: 600 }}>No crash reports found</p>
          <p style={{ margin: "8px 0 0", fontSize: "0.875rem" }}>
            {crashFingerprint || platform
              ? "Try broadening your filters."
              : "Your app hasn't ingested any crash reports yet."}
          </p>
        </div>
      )}

      {/* Top Issues by fingerprint */}
      {!dataError && reports.length > 0 && (
        <Card>
          <div style={{ padding: "var(--space-5)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Top Issues</h3>
              <span style={{ fontSize: "0.8rem", color: "var(--c-ink-soft)" }}>Click a row to filter</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fingerprint</th>
                    <th style={{ width: "140px" }}>Impact</th>
                    <th style={{ width: "130px" }}>Last Seen</th>
                    <th style={{ width: "160px" }}>Platforms</th>
                  </tr>
                </thead>
                <tbody>
                  {fingerprints.map((group) => {
                    const filterUrl = `${basePath}?project_id=${projectId}&region=${scope.region}&crash_fingerprint=${encodeURIComponent(group.key)}`;
                    const isActive = crashFingerprint === group.key;
                    return (
                      <tr
                        key={group.key}
                        style={{
                          background: isActive ? "var(--c-accent-subtle)" : undefined,
                          cursor: "pointer",
                        }}
                        className="fingerprint-row"
                      >
                        <td>
                          <a
                            href={filterUrl}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              fontFamily: "var(--font-mono)",
                              fontSize: "0.82rem",
                              color: isActive ? "var(--c-primary)" : "var(--c-ink)",
                              fontWeight: isActive ? 700 : undefined,
                              textDecoration: "none",
                            }}
                          >
                            {isActive && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                              </svg>
                            )}
                            <span style={{
                              display: "inline-block",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              background: isActive ? "var(--c-accent-subtle)" : "var(--c-bg)",
                              border: `1px solid ${isActive ? "var(--c-accent)" : "var(--c-border)"}`,
                            }}>
                              {group.fingerprint.substring(0, 36)}{group.fingerprint.length > 36 ? "…" : ""}
                            </span>
                          </a>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontWeight: 700, minWidth: 24 }}>{group.count}</span>
                            <div style={{ height: "6px", flex: 1, background: "var(--c-bg)", borderRadius: "3px", overflow: "hidden", border: "1px solid var(--c-border)" }}>
                              <div style={{
                                height: "100%",
                                width: `${Math.min(100, (group.count / maxCount) * 100)}%`,
                                background: group.count === maxCount ? "var(--c-danger)" : "var(--c-warning)",
                                transition: "width 0.3s",
                              }} />
                            </div>
                          </div>
                        </td>
                        <td style={{ color: "var(--c-ink-soft)", fontSize: "0.82rem" }}>
                          <span title={new Date(group.lastSeenUnixMs).toLocaleString()}>
                            {relativeTime(group.lastSeenUnixMs)}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                            {group.platforms.map(p => (
                              <PlatformChip key={p} platform={p} />
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
          <style dangerouslySetInnerHTML={{__html: `
            .fingerprint-row:hover td { background: var(--c-surface-hover); }
          `}} />
        </Card>
      )}

      {/* Recent Reports Table */}
      {!dataError && reports.length > 0 && (
        <Card>
          <div style={{ padding: "var(--space-5)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Recent Reports</h3>
              <span style={{ fontSize: "0.8rem", color: "var(--c-ink-soft)" }}>{reports.length} report{reports.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Report ID</th>
                    <th>Platform</th>
                    <th>Version</th>
                    <th>Fingerprint</th>
                    <th style={{ width: 60, textAlign: "right" }}>Events</th>
                    <th style={{ width: 120 }}>Generated</th>
                    <th style={{ width: 60 }}></th>
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
                            {report.id.substring(0, 8)}…
                          </a>
                        </td>
                        <td>
                          <PlatformChip platform={report.platform} />
                        </td>
                        <td style={{ fontSize: "0.875rem" }}>
                          {report.app_version}
                          <span style={{ color: "var(--c-ink-faint)", marginLeft: 4 }}>({report.build_number})</span>
                        </td>
                        <td>
                          {report.crash_fingerprint ? (
                            <a
                              href={`${basePath}?project_id=${projectId}&region=${scope.region}&crash_fingerprint=${encodeURIComponent(report.crash_fingerprint)}`}
                              style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: "0.78rem",
                                color: "var(--c-ink-soft)",
                                padding: "1px 5px",
                                borderRadius: 4,
                                background: "var(--c-bg)",
                                border: "1px solid var(--c-border)",
                                textDecoration: "none",
                              }}
                              title={report.crash_fingerprint}
                            >
                              {report.crash_fingerprint.substring(0, 12)}…
                            </a>
                          ) : (
                            <span style={{ color: "var(--c-ink-faint)", fontSize: "0.85rem" }}>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 600 }}>{report.event_count}</td>
                        <td style={{ fontSize: "0.82rem", color: "var(--c-ink-soft)" }}>
                          <span title={new Date(report.generated_at_unix_ms).toLocaleString()}>
                            {relativeTime(report.generated_at_unix_ms)}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <a
                            href={`${basePath}/${report.id}?${detailQuery.toString()}`}
                            className="btn btn-sm"
                            style={{ padding: "4px 10px", fontSize: "0.8rem" }}
                          >
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
