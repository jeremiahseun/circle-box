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

const SEVERITY_COLORS: Record<string, { bg: string; fg: string; dot: string }> = {
  fatal:      { bg: "#fee2e2", fg: "#991b1b", dot: "#ef4444" },
  error:      { bg: "#ffedd5", fg: "#9a3412", dot: "#f97316" },
  warn:       { bg: "#fef9c3", fg: "#854d0e", dot: "#eab308" },
  info:       { bg: "#f0fdf4", fg: "#166534", dot: "#22c55e" },
};

function severityStyle(sev: string) {
  return SEVERITY_COLORS[sev] ?? { bg: "#f1f5f9", fg: "#475569", dot: "#94a3b8" };
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

  const screenViews = detail.events.filter(e => e.type === "screen_view");
  const userActions = detail.events.filter(e => e.type === "user_action");
  const lastScreenView = screenViews[screenViews.length - 1];
  const lastUserAction = userActions[userActions.length - 1];

  return (
    <section style={{ display: "grid", gap: 16 }}>
      {/* Header / Back nav */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
        <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700 }}>
          Crash Report
          <code style={{ marginLeft: "10px", fontSize: "0.85rem", fontWeight: 500, opacity: 0.6 }}>
            {detail.report.id.substring(0, 8)}…
          </code>
        </h1>
      </div>

      {/* Crash Highlight Banner */}
      {crashMarker && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "14px 20px",
          background: "#fee2e2",
          border: "1px solid #fca5a5",
          borderRadius: "var(--radius-md)",
          color: "#991b1b",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <div>
            <strong>Crash Detected</strong>{" "}
            <span style={{ opacity: 0.8 }}>seq #{crashMarker.seq} · {crashMarker.type} · {new Date(crashMarker.timestamp_unix_ms).toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Pre-crash Context Strip */}
      {(lastScreenView || lastUserAction) && (
        <Card>
          <div style={{ padding: "16px 20px" }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: "0.95rem", color: "var(--c-ink-soft)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Last Known Context Before Crash</h3>
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              {lastScreenView && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px", background: "var(--c-bg)", border: "1px solid var(--c-border)", borderRadius: "var(--radius-md)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--c-primary)" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/>
                  </svg>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--c-ink-soft)" }}>Last Screen</div>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{lastScreenView.attrs?.screen ?? "unknown"}</div>
                  </div>
                </div>
              )}
              {lastUserAction && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px", background: "var(--c-bg)", border: "1px solid var(--c-border)", borderRadius: "var(--radius-md)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--c-primary)" strokeWidth="2">
                    <path d="M5 3l14 9-14 9V3z"/>
                  </svg>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--c-ink-soft)" }}>Last User Action</div>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                      {lastUserAction.attrs?.action_type ?? "tap"} → {lastUserAction.attrs?.target ?? "unknown"}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Report Metadata */}
      <Card>
        <div style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
            <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Report Details</h2>
            <CrashDetailActions reportId={detail.report.id} projectId={projectId} region={scope.region} />
          </div>
          <div className="detail-grid">
            <MetaRow label="Report ID" value={detail.report.id} mono copyable />
            <MetaRow label="Project" value={projectId} mono />
            <MetaRow label="Region" value={scope.region} />
            <MetaRow label="Platform" value={detail.report.platform} badge />
            <MetaRow label="App Version" value={`${detail.report.app_version} (${detail.report.build_number})`} />
            <MetaRow label="Fingerprint" value={detail.report.crash_fingerprint ?? "—"} mono copyable={!!detail.report.crash_fingerprint} />
            <MetaRow label="Export Source" value={detail.report.export_source} />
            <MetaRow label="Capture Reason" value={detail.report.capture_reason} />
            <MetaRow label="Event Count" value={String(detail.report.event_count)} />
            <MetaRow label="Generated" value={new Date(detail.report.generated_at_unix_ms).toLocaleString()} />
            <MetaRow label="Download" value="raw" link={`/api/reports/${detail.report.id}/download?${downloadQuery.toString()}`} />
          </div>
        </div>
      </Card>

      {/* Event Summary */}
      <Card>
        <div style={{ padding: "16px 20px" }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: "1rem" }}>Event Summary</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {Object.entries(severityCounts).sort((a, b) => {
              const order = ["fatal", "error", "warn", "info"];
              return order.indexOf(a[0]) - order.indexOf(b[0]);
            }).map(([severity, count]) => {
              const style = severityStyle(severity);
              return (
                <div key={severity} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  background: style.bg,
                  color: style.fg,
                  borderRadius: "var(--radius-full)",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                }}>
                  <span style={{ width: "8px", height: "8px", background: style.dot, borderRadius: "50%", display: "inline-block" }} />
                  {severity}: {count}
                </div>
              );
            })}
            {preCrashWindow.length > 0 && (
              <div style={{
                padding: "6px 12px",
                background: "#fef9c3",
                color: "#854d0e",
                borderRadius: "var(--radius-full)",
                fontSize: "0.85rem",
                fontWeight: 500,
              }}>
                {preCrashWindow.length} pre-crash window events
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Grouped by Event Type */}
      <Card>
        <div style={{ padding: "16px 20px" }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: "1rem" }}>Events by Type</h3>
          {eventGroups.length === 0 && <p style={{ color: "var(--c-ink-soft)" }}>No indexed events available for this report.</p>}
          {eventGroups.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {eventGroups.map((group) => (
                <details key={group.type} style={{ flex: "1 1 340px", border: "1px solid var(--c-border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                  <summary style={{
                    cursor: "pointer",
                    fontWeight: 600,
                    padding: "10px 14px",
                    background: "var(--c-bg)",
                    fontSize: "0.9rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    listStyle: "none",
                    userSelect: "none",
                  }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>{group.type}</span>
                    <span className="badge" style={{ fontSize: "0.7rem" }}>{group.events.length}</span>
                  </summary>
                  <div style={{ padding: "4px 0" }}>
                    <table style={{ margin: 0 }}>
                      <thead>
                        <tr>
                          <th style={{ width: "50px" }}>Seq</th>
                          <th>Time</th>
                          <th style={{ width: "80px" }}>Thread</th>
                          <th style={{ width: "70px" }}>Severity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.events.map((event) => {
                          const sStyle = severityStyle(event.severity);
                          return (
                            <tr key={`${group.type}-${event.seq}`}>
                              <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>{event.seq}</td>
                              <td style={{ fontSize: "0.8rem" }}>{new Date(event.timestamp_unix_ms).toLocaleTimeString()}</td>
                              <td style={{ fontSize: "0.8rem", color: "var(--c-ink-soft)" }}>{event.thread}</td>
                              <td>
                                <span style={{ fontSize: "0.7rem", padding: "1px 6px", borderRadius: "999px", background: sStyle.bg, color: sStyle.fg, fontWeight: 600 }}>
                                  {event.severity}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Full Timeline */}
      <Card>
        <div style={{ padding: "16px 20px 6px" }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: "1rem" }}>Full Event Timeline</h3>
          {detail.events.length === 0 && <p style={{ color: "var(--c-ink-soft)" }}>No indexed events available for this report.</p>}
          {detail.events.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "50px" }}>Seq</th>
                    <th style={{ width: "160px" }}>Time</th>
                    <th>Type</th>
                    <th style={{ width: "90px" }}>Thread</th>
                    <th style={{ width: "80px" }}>Severity</th>
                    <th>Attributes</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.events.map((event) => {
                    const isCrash = isCrashMarkerEvent(event);
                    const isPreCrash = preCrashSeq.has(event.seq) && !isCrash;
                    const isScreenView = event.type === "screen_view";
                    const isUserAction = event.type === "user_action";
                    const sStyle = severityStyle(event.severity);

                    let rowBg: string | undefined;
                    if (isCrash) rowBg = "#fee2e2";
                    else if (isPreCrash) rowBg = "#fefce8";
                    else if (isScreenView) rowBg = "#f0fdf4";
                    else if (isUserAction) rowBg = "#eff6ff";

                    return (
                      <tr key={event.seq} style={rowBg ? { background: rowBg } : undefined}>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>{event.seq}</td>
                        <td style={{ fontSize: "0.8rem", color: "var(--c-ink-soft)", whiteSpace: "nowrap" }}>
                          {new Date(event.timestamp_unix_ms).toLocaleTimeString()}
                        </td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>
                          {event.type}
                          {isCrash && (
                            <span style={{ marginLeft: "6px", fontSize: "0.7rem", padding: "1px 6px", background: "#fee2e2", color: "#991b1b", borderRadius: "999px", fontFamily: "var(--font-sans)", fontWeight: 700 }}>
                              CRASH
                            </span>
                          )}
                          {isPreCrash && (
                            <span style={{ marginLeft: "6px", fontSize: "0.7rem", padding: "1px 6px", background: "#fef9c3", color: "#854d0e", borderRadius: "999px", fontFamily: "var(--font-sans)" }}>
                              pre-crash
                            </span>
                          )}
                          {isScreenView && event.attrs?.screen && (
                            <span style={{ marginLeft: "6px", fontSize: "0.7rem", padding: "1px 6px", background: "#dcfce7", color: "#166534", borderRadius: "999px", fontFamily: "var(--font-sans)" }}>
                              {event.attrs.screen}
                            </span>
                          )}
                          {isUserAction && event.attrs?.target && (
                            <span style={{ marginLeft: "6px", fontSize: "0.7rem", padding: "1px 6px", background: "#dbeafe", color: "#1e40af", borderRadius: "999px", fontFamily: "var(--font-sans)" }}>
                              {event.attrs.action_type ?? "tap"} → {event.attrs.target}
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: "0.8rem", color: "var(--c-ink-soft)" }}>{event.thread}</td>
                        <td>
                          <span style={{ fontSize: "0.7rem", padding: "1px 6px", borderRadius: "999px", background: sStyle.bg, color: sStyle.fg, fontWeight: 600, fontFamily: "var(--font-mono)" }}>
                            {event.severity}
                          </span>
                        </td>
                        <td>
                          <AttrsCell attrs={event.attrs} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      <style>{`
        .detail-grid {
          display: grid;
          grid-template-columns: 180px 1fr;
          gap: 0;
          border: 1px solid var(--c-border);
          border-radius: var(--radius-md);
          overflow: hidden;
        }
        .detail-grid > * {
          padding: 10px 14px;
          border-bottom: 1px solid var(--c-border);
          font-size: 0.9rem;
        }
        .detail-grid > *:nth-last-child(-n+2) {
          border-bottom: none;
        }
        .detail-label {
          font-weight: 600;
          color: var(--c-ink-soft);
          background: var(--c-bg);
          font-size: 0.82rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .detail-value { color: var(--c-ink); }
      `}</style>
    </section>
  );
}

type MetaRowProps = {
  label: string;
  value: string;
  mono?: boolean;
  copyable?: boolean;
  badge?: boolean;
  link?: string;
};

function MetaRow({ label, value, mono, copyable, badge, link }: MetaRowProps) {
  return (
    <>
      <div className="detail-label">{label}</div>
      <div className="detail-value">
        {link ? (
          <a href={link} download style={{ textDecoration: "underline" }}>
            {value}
          </a>
        ) : badge ? (
          <span className="badge" style={{ textTransform: "capitalize" }}>{value}</span>
        ) : mono ? (
          <code style={{ fontSize: "0.85em" }}>{value}</code>
        ) : (
          value
        )}
        {copyable && value && value !== "—" && (
          <CopyButton value={value} />
        )}
      </div>
    </>
  );
}

function CopyButton({ value }: { value: string }) {
  return (
    <button
      data-copy={value}
      aria-label="Copy to clipboard"
      style={{
        marginLeft: "8px",
        background: "none",
        border: "1px solid var(--c-border)",
        borderRadius: "4px",
        cursor: "pointer",
        padding: "2px 6px",
        fontSize: "0.7rem",
        color: "var(--c-ink-soft)",
        verticalAlign: "middle",
      }}
      className="copy-btn"
    >
      copy
    </button>
  );
}

function AttrsCell({ attrs }: { attrs: Record<string, unknown> }) {
  const entries = Object.entries(attrs);
  if (entries.length === 0) return <span style={{ color: "var(--c-ink-faint)", fontSize: "0.8rem" }}>—</span>;

  const important = ["screen", "target", "action_type", "message", "error"];
  const shown = entries
    .sort(([a], [b]) => {
      const ai = important.indexOf(a);
      const bi = important.indexOf(b);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b);
    })
    .slice(0, 4);

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
      {shown.map(([k, v]) => (
        <span key={k} style={{
          fontSize: "0.7rem",
          padding: "1px 6px",
          background: "var(--c-bg)",
          border: "1px solid var(--c-border)",
          borderRadius: "4px",
          fontFamily: "var(--font-mono)",
          maxWidth: "200px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          <span style={{ color: "var(--c-ink-soft)" }}>{k}=</span>
          <span style={{ color: "var(--c-ink)" }}>{String(v).substring(0, 40)}{String(v).length > 40 ? "…" : ""}</span>
        </span>
      ))}
      {entries.length > 4 && (
        <span style={{ fontSize: "0.7rem", color: "var(--c-ink-faint)", padding: "1px 4px" }}>+{entries.length - 4} more</span>
      )}
    </div>
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
