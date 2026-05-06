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

const SEVERITY_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  fatal:   { bg: "#fee2e2", color: "#b91c1c", label: "FATAL" },
  error:   { bg: "#fff7ed", color: "#c2410c", label: "ERROR" },
  warning: { bg: "#fefce8", color: "#92400e", label: "WARN" },
  info:    { bg: "#eff6ff", color: "#1e40af", label: "INFO" },
  debug:   { bg: "#f8fafc", color: "#64748b", label: "DEBUG" },
};

function getSeverityStyle(severity: string) {
  return SEVERITY_STYLES[severity.toLowerCase()] ?? { bg: "transparent", color: "var(--c-ink-soft)", label: severity.toUpperCase() };
}

function SeverityBadge({ severity }: { severity: string }) {
  const style = getSeverityStyle(severity);
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 7px",
      borderRadius: "4px",
      fontSize: "0.7rem",
      fontWeight: 700,
      fontFamily: "var(--font-mono)",
      background: style.bg,
      color: style.color,
      letterSpacing: "0.03em",
    }}>
      {style.label}
    </span>
  );
}

function AttrsDisplay({ type, attrs }: { type: string; attrs: Record<string, unknown> }) {
  const keys = Object.keys(attrs);
  if (keys.length === 0) return <span style={{ color: "var(--c-ink-faint)", fontSize: "0.8rem" }}>—</span>;

  // Render known structured attrs more readably
  if ((type === "native_exception_prehook" || type === "crash" || type === "exception") && attrs.exception_type) {
    return (
      <div style={{ fontSize: "0.82rem", fontFamily: "var(--font-mono)" }}>
        <div style={{ fontWeight: 700, color: "var(--c-danger)", marginBottom: 2 }}>{String(attrs.exception_type)}</div>
        {!!attrs.exception_reason && <div style={{ color: "var(--c-ink-soft)", marginBottom: 4, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{String(attrs.exception_reason)}</div>}
        {Array.isArray(attrs.stack_frames) && attrs.stack_frames.length > 0 && (
          <div style={{ marginTop: 4 }}>
            {(attrs.stack_frames as unknown[]).slice(0, 6).map((frame, i) => (
              <div key={i} style={{ color: i === 0 ? "var(--c-ink)" : "var(--c-ink-soft)", paddingLeft: i === 0 ? 0 : 8, fontSize: "0.78rem" }}>
                {typeof frame === "string" ? frame : typeof frame === "object" && frame !== null ? (
                  `${(frame as Record<string,unknown>).symbol ?? (frame as Record<string,unknown>).method ?? JSON.stringify(frame)}`
                ) : String(frame)}
              </div>
            ))}
            {(attrs.stack_frames as unknown[]).length > 6 && (
              <div style={{ color: "var(--c-ink-faint)", fontSize: "0.75rem" }}>+{(attrs.stack_frames as unknown[]).length - 6} more frames</div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (type === "memory" && (attrs.memory_used_bytes !== undefined || attrs.memory_total_bytes !== undefined)) {
    const used = typeof attrs.memory_used_bytes === "number" ? attrs.memory_used_bytes : null;
    const total = typeof attrs.memory_total_bytes === "number" ? attrs.memory_total_bytes : null;
    const toMB = (b: number) => `${(b / (1024 * 1024)).toFixed(1)} MB`;
    return (
      <div style={{ fontSize: "0.82rem", fontFamily: "var(--font-mono)", color: "var(--c-ink-soft)" }}>
        {used !== null && <span style={{ marginRight: 12 }}>Used: <strong style={{ color: "var(--c-ink)" }}>{toMB(used)}</strong></span>}
        {total !== null && <span>Total: <strong style={{ color: "var(--c-ink)" }}>{toMB(total)}</strong></span>}
        {!!attrs.pressure && <span style={{ marginLeft: 12 }}>Pressure: <strong style={{ color: attrs.pressure === "critical" ? "var(--c-danger)" : "var(--c-ink)" }}>{String(attrs.pressure)}</strong></span>}
      </div>
    );
  }

  if ((type === "network" || type === "http") && attrs.http_url) {
    const status = typeof attrs.http_status_code === "number" ? attrs.http_status_code : null;
    const statusColor = status !== null ? (status >= 500 ? "var(--c-danger)" : status >= 400 ? "var(--c-warning)" : "var(--c-success)") : "var(--c-ink-soft)";
    return (
      <div style={{ fontSize: "0.82rem", fontFamily: "var(--font-mono)" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 2 }}>
          {!!attrs.http_method && <span style={{ fontWeight: 700, color: "var(--c-primary)" }}>{String(attrs.http_method)}</span>}
          {status !== null && <span style={{ fontWeight: 700, color: statusColor }}>{status}</span>}
          {typeof attrs.duration_ms === "number" && <span style={{ color: "var(--c-ink-faint)" }}>{attrs.duration_ms}ms</span>}
        </div>
        <div style={{ color: "var(--c-ink-soft)", wordBreak: "break-all" }}>{String(attrs.http_url)}</div>
      </div>
    );
  }

  if ((type === "log" || type === "log_message") && attrs.log_message) {
    return (
      <div style={{ fontSize: "0.82rem", fontFamily: "var(--font-mono)", color: "var(--c-ink-soft)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        {!!attrs.level && <span style={{ fontWeight: 700, marginRight: 8, color: "var(--c-ink)" }}>[{String(attrs.level).toUpperCase()}]</span>}
        {String(attrs.log_message)}
      </div>
    );
  }

  // Generic fallback: render as key-value pairs (more readable than raw JSON)
  return (
    <div style={{ fontSize: "0.8rem", fontFamily: "var(--font-mono)" }}>
      {keys.slice(0, 8).map(k => (
        <div key={k} style={{ display: "flex", gap: 6, marginBottom: 2 }}>
          <span style={{ color: "var(--c-primary)", flexShrink: 0 }}>{k}:</span>
          <span style={{ color: "var(--c-ink-soft)", wordBreak: "break-all" }}>
            {typeof attrs[k] === "object" ? JSON.stringify(attrs[k]) : String(attrs[k])}
          </span>
        </div>
      ))}
      {keys.length > 8 && <div style={{ color: "var(--c-ink-faint)" }}>+{keys.length - 8} more fields</div>}
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
          <a href={`${basePath}?project_id=${projectId}&region=${scope.region}`} className="btn btn-sm">
            &larr; Back to Crashes
          </a>
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
  const preCrashWindow = crashMarkerIndex >= 0
    ? detail.events.slice(Math.max(0, crashMarkerIndex - 7), crashMarkerIndex + 1)
    : [];
  const preCrashSeq = new Set(preCrashWindow.map((event) => event.seq));
  const crashMarker = crashMarkerIndex >= 0 ? detail.events[crashMarkerIndex] : null;

  const severityOrder = ["fatal", "error", "warning", "info", "debug"];
  const sortedSeverities = Object.entries(severityCounts).sort(
    (a, b) => severityOrder.indexOf(a[0]) - severityOrder.indexOf(b[0]),
  );

  return (
    <section style={{ display: "grid", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div>
          <a
            href={`${basePath}?project_id=${projectId}&region=${scope.region}`}
            className="btn btn-sm"
            style={{ padding: "6px 12px", display: "inline-flex", gap: "6px", alignItems: "center", background: "transparent", border: "1px solid var(--c-border)", color: "var(--c-ink-soft)", marginBottom: 12 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to Crashes
          </a>
          <h1 style={{ margin: 0, fontSize: "1.4rem", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
            {detail.report.id.substring(0, 8)}<span style={{ color: "var(--c-ink-faint)" }}>...{detail.report.id.slice(-4)}</span>
          </h1>
          <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <span className="badge" style={{ textTransform: "capitalize" }}>{detail.report.platform}</span>
            <span style={{ color: "var(--c-ink-soft)", fontSize: "0.9rem" }}>v{detail.report.app_version} ({detail.report.build_number})</span>
            <span style={{ color: "var(--c-ink-faint)", fontSize: "0.85rem" }}>
              {new Date(detail.report.generated_at_unix_ms).toLocaleString()}
            </span>
          </div>
        </div>
        <CrashDetailActions reportId={detail.report.id} projectId={projectId} region={scope.region} />
      </div>

      {/* Crash Marker Banner */}
      {crashMarker && (
        <div style={{
          background: "#fee2e2",
          border: "1px solid #fca5a5",
          borderLeft: "4px solid #ef4444",
          borderRadius: "var(--radius-md)",
          padding: "14px 16px",
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <div>
            <div style={{ fontWeight: 700, color: "#b91c1c", marginBottom: 4, fontSize: "0.95rem" }}>
              Crash Detected — {crashMarker.type}
            </div>
            <div style={{ fontSize: "0.85rem", color: "#991b1b", fontFamily: "var(--font-mono)" }}>
              seq {crashMarker.seq} &middot; thread {crashMarker.thread} &middot; {new Date(crashMarker.timestamp_unix_ms).toLocaleString()}
            </div>
          </div>
          <a
            href={`/api/reports/${detail.report.id}/download?${downloadQuery.toString()}`}
            className="btn btn-sm"
            style={{ marginLeft: "auto", flexShrink: 0, fontSize: "0.8rem" }}
          >
            Download Raw Report
          </a>
        </div>
      )}

      {/* Two-column metadata + summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <div style={{ padding: "16px 20px" }}>
            <h3 style={{ marginTop: 0, marginBottom: 14, fontSize: "0.95rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--c-ink-soft)" }}>Report Metadata</h3>
            <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "auto 1fr", rowGap: 8, columnGap: 12, fontSize: "0.9rem" }}>
              <dt style={{ fontWeight: 600, color: "var(--c-ink)", whiteSpace: "nowrap" }}>Fingerprint</dt>
              <dd style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--c-primary)", wordBreak: "break-all" }}>{detail.report.crash_fingerprint ?? "—"}</dd>
              <dt style={{ fontWeight: 600, color: "var(--c-ink)" }}>Source</dt>
              <dd style={{ margin: 0, color: "var(--c-ink-soft)" }}>{detail.report.export_source}</dd>
              <dt style={{ fontWeight: 600, color: "var(--c-ink)" }}>Capture</dt>
              <dd style={{ margin: 0, color: "var(--c-ink-soft)" }}>{detail.report.capture_reason}</dd>
              <dt style={{ fontWeight: 600, color: "var(--c-ink)" }}>Events</dt>
              <dd style={{ margin: 0, color: "var(--c-ink-soft)" }}>{detail.report.event_count} indexed</dd>
              <dt style={{ fontWeight: 600, color: "var(--c-ink)" }}>Region</dt>
              <dd style={{ margin: 0, color: "var(--c-ink-soft)" }}>{scope.region.toUpperCase()}</dd>
            </dl>
          </div>
        </Card>

        <Card>
          <div style={{ padding: "16px 20px" }}>
            <h3 style={{ marginTop: 0, marginBottom: 14, fontSize: "0.95rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--c-ink-soft)" }}>Event Summary</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sortedSeverities.map(([severity, count]) => {
                const style = getSeverityStyle(severity);
                const pct = Math.round((count / detail.events.length) * 100);
                return (
                  <div key={severity} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <SeverityBadge severity={severity} />
                    <div style={{ flex: 1, height: 6, background: "var(--c-bg)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: style.color, borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--c-ink)", minWidth: 28, textAlign: "right" }}>{count}</span>
                  </div>
                );
              })}
              {preCrashWindow.length > 0 && (
                <div style={{ marginTop: 4, paddingTop: 8, borderTop: "1px solid var(--c-border)", fontSize: "0.85rem", color: "var(--c-ink-soft)" }}>
                  <span style={{ background: "#fefce8", border: "1px solid #fef08a", borderRadius: 4, padding: "2px 6px", fontWeight: 600, color: "#92400e" }}>
                    {preCrashWindow.length} events
                  </span>{" "}in pre-crash window
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Grouped by Event Type */}
      <Card>
        <div style={{ padding: "16px 20px" }}>
          <h3 style={{ marginTop: 0, marginBottom: 14, fontSize: "1rem" }}>Events by Type</h3>
          {eventGroups.length === 0 && <p style={{ color: "var(--c-ink-soft)" }}>No indexed events for this report.</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {eventGroups.map((group) => (
              <details key={group.type} style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--c-border)", overflow: "hidden" }}>
                <summary style={{
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  padding: "10px 14px",
                  background: "var(--c-bg)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  userSelect: "none",
                }}>
                  <span style={{ fontFamily: "var(--font-mono)", color: "var(--c-primary)" }}>{group.type}</span>
                  <span className="badge" style={{ fontSize: "0.7rem", padding: "1px 8px" }}>{group.events.length}</span>
                </summary>
                <div className="table-wrap" style={{ margin: 0, borderRadius: 0, border: "none", borderTop: "1px solid var(--c-border)" }}>
                  <table style={{ minWidth: "unset" }}>
                    <thead>
                      <tr>
                        <th style={{ width: 60 }}>Seq</th>
                        <th>Time</th>
                        <th>Thread</th>
                        <th style={{ width: 80 }}>Severity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.events.map((event) => (
                        <tr key={`${group.type}-${event.seq}`} style={isCrashMarkerEvent(event) ? { background: "#fee2e2" } : undefined}>
                          <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{event.seq}</td>
                          <td style={{ fontSize: "0.82rem", color: "var(--c-ink-soft)" }}>{new Date(event.timestamp_unix_ms).toLocaleString()}</td>
                          <td style={{ fontSize: "0.82rem", fontFamily: "var(--font-mono)", color: "var(--c-ink-soft)" }}>{event.thread}</td>
                          <td><SeverityBadge severity={event.severity} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            ))}
          </div>
        </div>
      </Card>

      {/* Full Timeline */}
      <Card>
        <div style={{ padding: "16px 20px 4px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: "1rem" }}>Full Timeline</h3>
            <span style={{ fontSize: "0.85rem", color: "var(--c-ink-faint)" }}>{detail.events.length} events</span>
          </div>
        </div>
        {detail.events.length === 0 && (
          <div style={{ padding: "0 20px 20px", color: "var(--c-ink-soft)" }}>No indexed events for this report.</div>
        )}
        {detail.events.length > 0 && (
          <div className="table-wrap" style={{ marginBottom: 0, borderRadius: "0 0 var(--radius-md) var(--radius-md)", border: "none", borderTop: "1px solid var(--c-border)" }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 56 }}>Seq</th>
                  <th style={{ width: 170 }}>Time</th>
                  <th style={{ width: 80 }}>Severity</th>
                  <th>Type</th>
                  <th style={{ width: 110 }}>Thread</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {detail.events.map((event) => {
                  const isCrash = isCrashMarkerEvent(event);
                  const inWindow = preCrashSeq.has(event.seq) && !isCrash;
                  const rowBg = isCrash ? "#fee2e2" : inWindow ? "#fefce8" : undefined;
                  return (
                    <tr key={event.seq} style={rowBg ? { background: rowBg } : undefined}>
                      <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "0.85rem" }}>{event.seq}</td>
                      <td style={{ fontSize: "0.78rem", color: "var(--c-ink-soft)", whiteSpace: "nowrap" }}>
                        {new Date(event.timestamp_unix_ms).toLocaleString()}
                      </td>
                      <td><SeverityBadge severity={event.severity} /></td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem", color: "var(--c-primary)" }}>
                        {event.type}{isCrash ? <strong style={{ color: "var(--c-danger)", marginLeft: 4 }}>★</strong> : null}
                      </td>
                      <td style={{ fontSize: "0.82rem", fontFamily: "var(--font-mono)", color: "var(--c-ink-soft)" }}>{event.thread}</td>
                      <td><AttrsDisplay type={event.type} attrs={event.attrs} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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
    if (predicate(items[index])) return index;
  }
  return -1;
}
