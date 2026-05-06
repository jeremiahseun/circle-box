import { listReports } from "../../lib/data-plane";
import { firstValue, resolveDashboardScope, type DashboardSearchParams } from "../../lib/env";
import { Card } from "../ui/card";

type CrashesPageProps = {
  searchParams?: DashboardSearchParams;
  basePath?: string;
};

function NoReportsGuide({ projectId }: { projectId: string }) {
  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{
          width: 64, height: 64, margin: "0 auto 16px",
          background: "var(--c-accent-subtle)", borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--c-accent)" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h2 style={{ margin: "0 0 8px", fontSize: "1.4rem" }}>No crash reports yet</h2>
        <p style={{ margin: 0, color: "var(--c-ink-soft)" }}>
          Integrate the CircleBox SDK into your app to start capturing crashes and events.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Step 1 */}
        <Card>
          <div style={{ padding: "20px 24px" }}>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{
                width: 28, height: 28, flexShrink: 0,
                background: "var(--c-primary)", color: "white", borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: "0.85rem",
              }}>1</div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: "0 0 6px", fontSize: "1rem" }}>Generate an API Key</h3>
                <p style={{ margin: "0 0 12px", fontSize: "0.9rem", color: "var(--c-ink-soft)" }}>
                  Create an <code>ingest</code> key for your project to authenticate SDK uploads.
                </p>
                <a href={`/app/projects/${projectId}/keys`} className="btn btn-sm btn-primary">
                  Go to API Keys &rarr;
                </a>
              </div>
            </div>
          </div>
        </Card>

        {/* Step 2 */}
        <Card>
          <div style={{ padding: "20px 24px" }}>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{
                width: 28, height: 28, flexShrink: 0,
                background: "var(--c-primary)", color: "white", borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: "0.85rem",
              }}>2</div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: "0 0 6px", fontSize: "1rem" }}>Add the SDK to your app</h3>
                <p style={{ margin: "0 0 14px", fontSize: "0.9rem", color: "var(--c-ink-soft)" }}>
                  Install the platform SDK and initialize with your ingest key.
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[
                    { label: "iOS (Swift)", href: "/docs/ios-quickstart" },
                    { label: "Android (Kotlin)", href: "/docs/android-quickstart" },
                    { label: "Flutter", href: "/docs/flutter-quickstart" },
                    { label: "React Native", href: "/docs/react-native-quickstart" },
                  ].map(({ label, href }) => (
                    <a key={href} href={href} className="btn btn-sm" style={{ fontSize: "0.82rem" }}>
                      {label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Step 3 */}
        <Card>
          <div style={{ padding: "20px 24px" }}>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{
                width: 28, height: 28, flexShrink: 0,
                background: "var(--c-primary)", color: "white", borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: "0.85rem",
              }}>3</div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: "0 0 6px", fontSize: "1rem" }}>Enable cloud upload</h3>
                <p style={{ margin: "0 0 12px", fontSize: "0.9rem", color: "var(--c-ink-soft)" }}>
                  Attach <code>CircleBoxCloud</code> to your SDK instance to auto-upload on next app launch after a crash.
                </p>
                <pre style={{
                  margin: 0, padding: "12px 16px",
                  background: "var(--c-bg)", border: "1px solid var(--c-border)",
                  borderRadius: "var(--radius-md)", fontSize: "0.82rem",
                  fontFamily: "var(--font-mono)", overflowX: "auto", color: "var(--c-ink)",
                }}>
                  <code>{`// Swift / iOS
CircleBoxCloud.attach(
  to: CircleBox.shared,
  config: .init(ingestKey: "cbk_...")
)

// Kotlin / Android
CircleBoxCloud.attach(
  sdk = CircleBox.instance,
  config = CircleBoxCloudConfig(ingestKey = "cbk_...")
)`}</code>
                </pre>
              </div>
            </div>
          </div>
        </Card>

        <div style={{ textAlign: "center", paddingTop: 8 }}>
          <a href="/docs/cloud-quickstart" style={{ fontSize: "0.9rem", color: "var(--c-accent)" }}>
            Read the full cloud quickstart guide &rarr;
          </a>
        </div>
      </div>
    </div>
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

  const hasActiveFilters = (platform && platform.length > 0) || (crashFingerprint && crashFingerprint.length > 0);

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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
                <h3 style={{ margin: 0, fontSize: "1rem" }}>Filters</h3>
                <div style={{ fontSize: "0.85rem", color: "var(--c-ink-soft)" }}>
                    Project: <code style={{ color: "var(--c-primary)" }}>{projectId}</code> &middot; Region: <code>{scope.region.toUpperCase()}</code>
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
                    placeholder="Filter by crash fingerprint..."
                    style={{ width: "100%" }}
                />
            </div>
            <div style={{ width: "80px" }}>
                <label>Limit</label>
                <input name="limit" type="number" min="1" max="200" defaultValue={String(Number.isFinite(limit) ? limit : 100)} style={{ width: "100%" }} />
            </div>
            <button className="btn btn-primary" type="submit" style={{ height: "42px" }}>Apply</button>
            {hasActiveFilters && (
              <a href={`?project_id=${projectId}&region=${scope.region}`} className="btn" style={{ height: "42px" }}>Clear</a>
            )}
          </form>
        </div>
      </Card>

      {dataError && (
        <div style={{ padding: "var(--space-4)", background: "var(--c-danger-bg)", color: "var(--c-danger)", borderRadius: "var(--radius-md)", border: "1px solid #fca5a5" }}>
          <strong>Query error:</strong> <code>{dataError}</code>
          <span style={{ marginLeft: 12, fontSize: "0.85rem" }}>Check your project region settings.</span>
        </div>
      )}

      {/* Empty state — no reports at all and no filters active */}
      {!dataError && reports.length === 0 && !hasActiveFilters && (
        <NoReportsGuide projectId={projectId} />
      )}

      {/* Empty state — active filters but no results */}
      {!dataError && reports.length === 0 && hasActiveFilters && (
        <div style={{ textAlign: "center", padding: "var(--space-12)", color: "var(--c-ink-soft)" }}>
          <p style={{ fontSize: "1rem", marginBottom: 12 }}>No crash reports match your filters.</p>
          <a href={`?project_id=${projectId}&region=${scope.region}`} className="btn btn-sm">Clear filters</a>
        </div>
      )}

      {/* Grouped Fingerprints Table */}
      {!dataError && reports.length > 0 && (
        <Card>
          <div style={{ padding: "var(--space-5)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Top Issues</h3>
              <span style={{ fontSize: "0.85rem", color: "var(--c-ink-faint)" }}>{groupReportsByFingerprint(reports).length} unique fingerprint{groupReportsByFingerprint(reports).length !== 1 ? "s" : ""}</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fingerprint</th>
                    <th style={{ width: "140px" }}>Impact</th>
                    <th style={{ width: "180px" }}>Last Seen</th>
                    <th style={{ width: "180px" }}>Platforms</th>
                  </tr>
                </thead>
                <tbody>
                  {groupReportsByFingerprint(reports).map((group) => (
                    <tr
                      key={group.key}
                      style={{ cursor: "pointer" }}
                      onClick={undefined}
                    >
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>
                          <a
                            href={`?project_id=${projectId}&region=${scope.region}&crash_fingerprint=${encodeURIComponent(group.fingerprint)}`}
                            style={{ fontWeight: 600, color: "var(--c-primary)" }}
                          >
                            {group.fingerprint.substring(0, 40)}{group.fingerprint.length > 40 ? "…" : ""}
                          </a>
                      </td>
                      <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontWeight: 700, minWidth: 24 }}>{group.count}</span>
                              <div style={{ height: "6px", flex: 1, background: "var(--c-bg)", borderRadius: "3px", overflow: "hidden", border: "1px solid var(--c-border)" }}>
                                  <div style={{
                                      height: "100%",
                                      width: `${Math.min(100, (group.count / reports.length) * 100)}%`,
                                      background: "var(--c-danger)",
                                      borderRadius: "3px",
                                  }} />
                              </div>
                          </div>
                      </td>
                      <td style={{ color: "var(--c-ink-soft)", fontSize: "0.85rem" }}>
                          {new Date(group.lastSeenUnixMs).toLocaleString()}
                      </td>
                      <td>
                          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Recent Reports</h3>
              <span style={{ fontSize: "0.85rem", color: "var(--c-ink-faint)" }}>{reports.length} report{reports.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Report ID</th>
                    <th>Platform</th>
                    <th>Version</th>
                    <th>Fingerprint</th>
                    <th style={{ textAlign: "right" }}>Events</th>
                    <th style={{ width: "160px" }}>Generated</th>
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
                              {report.id.substring(0, 8)}&hellip;
                          </a>
                        </td>
                        <td>
                            <span className="badge" style={{ textTransform: "capitalize", fontSize: "0.7rem" }}>{report.platform}</span>
                        </td>
                        <td style={{ fontSize: "0.9rem" }}>
                          {report.app_version} <span style={{ color: "var(--c-ink-faint)" }}>({report.build_number})</span>
                        </td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--c-ink-soft)" }}>
                            {report.crash_fingerprint ? report.crash_fingerprint.substring(0, 16) + "…" : <span style={{ color: "var(--c-ink-faint)" }}>none</span>}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 600 }}>{report.event_count}</td>
                        <td style={{ fontSize: "0.82rem", color: "var(--c-ink-soft)" }}>
                            {new Date(report.generated_at_unix_ms).toLocaleString()}
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
      fingerprint: report.crash_fingerprint ?? "(no fingerprint)",
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
