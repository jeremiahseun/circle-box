import { getReportDetail, type DashboardEvent } from "../../lib/data-plane";
import { resolveDashboardScope, type DashboardSearchParams } from "../../lib/env";
import { Card } from "../ui/card";
import CrashDetailActions from "./crash-detail-actions";

type CrashDetailProps = {
  reportId: string;
  searchParams?: DashboardSearchParams;
  basePath?: string;
};

type EventGroup = {
  type: string;
  events: DashboardEvent[];
};

const SEVERITY_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  fatal:    { bg: "#fee2e2", color: "#b91c1c", border: "#fecaca" },
  error:    { bg: "#ffedd5", color: "#c2410c", border: "#fed7aa" },
  warn:     { bg: "#fef9c3", color: "#92400e", border: "#fde68a" },
  serious:  { bg: "#fef3c7", color: "#92400e", border: "#fde68a" },
  info:     { bg: "#dbeafe", color: "#1d4ed8", border: "#bfdbfe" },
  debug:    { bg: "#f1f5f9", color: "#64748b", border: "#e2e8f0" },
};

function SeverityBadge({ severity }: { severity: string }) {
  const s = SEVERITY_STYLES[severity.toLowerCase()] ?? SEVERITY_STYLES.debug;
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "2px 8px",
      borderRadius: 999,
      fontSize: "0.75rem",
      fontWeight: 600,
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
      whiteSpace: "nowrap",
    }}>
      {severity}
    </span>
  );
}

function PlatformBadge({ platform }: { platform: string }) {
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "2px 10px",
      borderRadius: 999,
      fontSize: "0.75rem",
      fontWeight: 600,
      background: "var(--c-accent-subtle)",
      color: "var(--c-primary)",
      border: "1px solid var(--c-accent)",
      textTransform: "capitalize",
    }}>
      {platform}
    </span>
  );
}

function AttrsCell({ attrs }: { attrs: Record<string, unknown> }) {
  const entries = Object.entries(attrs);
  if (entries.length === 0) return <span style={{ color: "var(--c-ink-faint)", fontSize: "0.8rem" }}>—</span>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {entries.map(([k, v]) => (
        <div key={k} style={{ fontSize: "0.78rem", fontFamily: "var(--font-mono)" }}>
          <span style={{ color: "var(--c-primary)", fontWeight: 600 }}>{k}</span>
          <span style={{ color: "var(--c-ink-faint)" }}>: </span>
          <span style={{ color: "var(--c-ink)" }}>{JSON.stringify(v)}</span>
        </div>
      ))}
    </div>
  );
}

export default async function CrashDetailPage({
  reportId,
  searchParams = {},
  basePath = "/dashboard/crashes",
}: CrashDetailProps) {
  const scope = resolveDashboardScope(searchParams);
  if (!scope.projectId) {
    return (
      <Card>
        <div style={{ padding: 20 }}>
          <h2 style={{ marginTop: 0 }}>Crash Detail: {reportId}</h2>
          <p>No project selected. Provide <code>project_id</code> or set <code>DASHBOARD_DEFAULT_PROJECT_ID</code>.</p>
        </div>
      </Card>
    );
  }
  const projectId = scope.projectId;
  const detail = await getReportDetail({
    projectId,
    region: scope.region,
    reportId,
  });

  if (!detail) {
    return (
      <Card>
        <div style={{ padding: 20 }}>
          <h2 style={{ marginTop: 0 }}>Crash Detail: {reportId}</h2>
          <p>
            No report found for project <code>{projectId}</code> in region <code>{scope.region}</code>.
          </p>
        </div>
      </Card>
    );
  }

  const downloadQuery = new URLSearchParams({
    project_id: projectId,
    region: scope.region,
  });

  const severityCounts = countBy(detail.events, (event) => event.severity);
  const eventGroups = groupByType(detail.events);
  const crashMarkerIndex = findLastIndex(detail.events, isCrashMarkerEvent);
  const preCrashWindow = crashMarkerIndex >= 0 ? detail.events.slice(Math.max(0, crashMarkerIndex - 7), crashMarkerIndex + 1) : [];
  const preCrashSeq = new Set(preCrashWindow.map((event) => event.seq));
  const crashMarker = crashMarkerIndex >= 0 ? detail.events[crashMarkerIndex] : null;

  return (
    <section style={{ display: "grid", gap: 16 }}>
      {/* Back + header */}
      <div style={{ marginBottom: "-4px" }}>
        <a
          href={`${basePath}?project_id=${projectId}&region=${scope.region}`}
          className="btn btn-sm"
          style={{ padding: "6px 12px", display: "inline-flex", gap: "6px", alignItems: "center", background: "transparent", border: "1px solid var(--c-border)", color: "var(--c-ink-soft)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Crashes
        </a>
      </div>

      {/* Report meta card */}
      <Card>
        <div style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: "0 0 6px 0", fontSize: "1.4rem" }}>
                {detail.report.crash_fingerprint
                  ? <span style={{ fontFamily: "var(--font-mono)", fontSize: "1.1rem" }}>{detail.report.crash_fingerprint.substring(0, 48)}</span>
                  : "Crash Report"}
              </h2>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <PlatformBadge platform={detail.report.platform} />
                <SeverityBadge severity="fatal" />
                <span style={{ fontSize: "0.85rem", color: "var(--c-ink-soft)" }}>
                  {new Date(detail.report.generated_at_unix_ms).toLocaleString()}
                </span>
              </div>
            </div>
            <CrashDetailActions reportId={detail.report.id} projectId={projectId} region={scope.region} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px 32px" }}>
            {[
              { label: "Report ID", value: <code style={{ fontSize: "0.85rem" }}>{detail.report.id}</code> },
              { label: "App Version", value: `${detail.report.app_version} (${detail.report.build_number})` },
              { label: "Platform", value: detail.report.platform },
              { label: "Region", value: scope.region.toUpperCase() },
              { label: "Export Source", value: detail.report.export_source },
              { label: "Capture Reason", value: detail.report.capture_reason },
              { label: "Event Count", value: String(detail.report.event_count) },
              {
                label: "Download",
                value: (
                  <a
                    href={`/api/reports/${detail.report.id}/download?${downloadQuery.toString()}`}
                    style={{ fontSize: "0.875rem" }}
                  >
                    Raw report &darr;
                  </a>
                ),
              },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--c-ink-soft)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: "0.9rem", color: "var(--c-ink)" }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Crash marker banner */}
      {crashMarker && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 20px",
          background: "#fff1f2",
          border: "1px solid #fecdd3",
          borderLeft: "4px solid #e11d48",
          borderRadius: "var(--radius-md)",
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <div>
            <strong style={{ color: "#e11d48" }}>Crash Marker</strong>
            <span style={{ color: "var(--c-ink-soft)", marginLeft: 8, fontSize: "0.875rem" }}>
              seq {crashMarker.seq} &bull; {crashMarker.type} &bull; {new Date(crashMarker.timestamp_unix_ms).toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Event summary */}
      <Card>
        <div style={{ padding: "16px 20px" }}>
          <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: "1rem" }}>Event Summary</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {Object.entries(severityCounts)
              .sort((a, b) => {
                const order = ["fatal", "error", "warn", "serious", "info", "debug"];
                return (order.indexOf(a[0]) ?? 99) - (order.indexOf(b[0]) ?? 99);
              })
              .map(([severity, count]) => (
                <div key={severity} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  background: "var(--c-bg)",
                  border: "1px solid var(--c-border)",
                  borderRadius: "var(--radius-md)",
                }}>
                  <SeverityBadge severity={severity} />
                  <span style={{ fontWeight: 700, fontSize: "1rem" }}>{count}</span>
                </div>
              ))}
            {preCrashWindow.length > 0 && (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                background: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: "var(--radius-md)",
                fontSize: "0.875rem",
                color: "#92400e",
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                {preCrashWindow.length} events in pre-crash window
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Grouped by type */}
      <Card>
        <div style={{ padding: 20 }}>
          <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: "1rem" }}>Grouped by Event Type</h3>
          {eventGroups.length === 0 && <p style={{ color: "var(--c-ink-soft)", margin: 0 }}>No indexed events available for this report.</p>}
          {eventGroups.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {eventGroups.map((group) => (
                <details key={group.type} style={{
                  background: "var(--c-bg)",
                  border: "1px solid var(--c-border)",
                  borderRadius: "var(--radius-md)",
                  overflow: "hidden",
                }}>
                  <summary style={{
                    cursor: "pointer",
                    padding: "10px 16px",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    listStyle: "none",
                  }}>
                    <span style={{ fontFamily: "var(--font-mono)" }}>{group.type}</span>
                    <span style={{
                      background: "var(--c-surface)",
                      border: "1px solid var(--c-border)",
                      borderRadius: 999,
                      padding: "1px 8px",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "var(--c-ink-soft)",
                    }}>{group.events.length}</span>
                  </summary>
                  <div style={{ padding: "0 16px 12px" }}>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Seq</th>
                            <th>Time</th>
                            <th>Thread</th>
                            <th>Severity</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.events.map((event) => (
                            <tr key={`${group.type}-${event.seq}`}>
                              <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>{event.seq}</td>
                              <td style={{ fontSize: "0.85rem", color: "var(--c-ink-soft)" }}>{new Date(event.timestamp_unix_ms).toLocaleString()}</td>
                              <td style={{ fontSize: "0.85rem" }}>{event.thread}</td>
                              <td><SeverityBadge severity={event.severity} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Full timeline */}
      <Card>
        <div style={{ padding: "16px 20px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: "1rem" }}>Full Timeline</h3>
            <div style={{ display: "flex", gap: 12, fontSize: "0.8rem", color: "var(--c-ink-soft)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: "#ffe4e6", border: "1px solid #fecdd3", display: "inline-block" }}/>
                Crash marker
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: "#fef9c3", border: "1px solid #fde68a", display: "inline-block" }}/>
                Pre-crash window
              </span>
            </div>
          </div>
          {detail.events.length === 0 && <p style={{ color: "var(--c-ink-soft)", margin: 0 }}>No indexed events available for this report.</p>}
          {detail.events.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>Seq</th>
                    <th style={{ width: 180 }}>Time</th>
                    <th>Type</th>
                    <th style={{ width: 120 }}>Thread</th>
                    <th style={{ width: 110 }}>Severity</th>
                    <th>Attrs</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.events.map((event) => {
                    const crashMarkerRow = isCrashMarkerEvent(event);
                    const inPreCrashWindow = preCrashSeq.has(event.seq) && !crashMarkerRow;
                    return (
                      <tr
                        key={event.seq}
                        style={crashMarkerRow
                          ? { background: "#ffe4e6" }
                          : (inPreCrashWindow ? { background: "#fef9c3" } : undefined)}
                      >
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "var(--c-ink-soft)" }}>{event.seq}</td>
                        <td style={{ fontSize: "0.82rem", color: "var(--c-ink-soft)", whiteSpace: "nowrap" }}>
                          {new Date(event.timestamp_unix_ms).toLocaleString()}
                        </td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>
                          {event.type}
                          {crashMarkerRow && (
                            <span style={{
                              marginLeft: 8,
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              background: "#e11d48",
                              color: "white",
                              padding: "1px 6px",
                              borderRadius: 999,
                              fontFamily: "var(--font-sans)",
                            }}>
                              CRASH
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: "0.82rem", color: "var(--c-ink-soft)" }}>{event.thread}</td>
                        <td><SeverityBadge severity={event.severity} /></td>
                        <td><AttrsCell attrs={event.attrs} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </section>
  );
}

function isCrashMarkerEvent(event: DashboardEvent): boolean {
  return event.severity === "fatal" || event.type === "native_exception_prehook";
}

function countBy<T>(items: T[], pick: (item: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) {
    const key = pick(item);
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

function groupByType(events: DashboardEvent[]): EventGroup[] {
  const map = new Map<string, DashboardEvent[]>();
  for (const event of events) {
    const existing = map.get(event.type);
    if (existing) {
      existing.push(event);
    } else {
      map.set(event.type, [event]);
    }
  }
  return Array.from(map.entries())
    .map(([type, groupedEvents]) => ({ type, events: groupedEvents }))
    .sort((a, b) => b.events.length - a.events.length);
}

function findLastIndex<T>(items: T[], predicate: (item: T) => boolean): number {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (predicate(items[index])) {
      return index;
    }
  }
  return -1;
}
