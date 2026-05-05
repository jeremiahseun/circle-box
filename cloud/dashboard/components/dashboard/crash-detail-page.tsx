import { getReportDetail, type DashboardEvent } from "../../lib/data-plane";
import { resolveDashboardScope, type DashboardSearchParams } from "../../lib/env";
import { formatRelativeTime } from "../../lib/ui/format";
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

const SEVERITY_STYLES: Record<string, { background: string; color: string }> = {
  fatal:   { background: "#fee2e2", color: "#b91c1c" },
  error:   { background: "#ffedd5", color: "#c2410c" },
  warn:    { background: "#fef9c3", color: "#a16207" },
  info:    { background: "#dbeafe", color: "#1e40af" },
  debug:   { background: "#f1f5f9", color: "#475569" },
};

function SeverityBadge({ severity }: { severity: string }) {
  const style = SEVERITY_STYLES[severity] ?? { background: "#f1f5f9", color: "#475569" };
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "2px 8px",
      borderRadius: "999px",
      fontSize: "0.72rem",
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.04em",
      ...style,
    }}>
      {severity}
    </span>
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
  const generatedAt = new Date(detail.report.generated_at_unix_ms);

  return (
    <section style={{ display: "grid", gap: 14 }}>
      {/* Header */}
      <Card>
        <div style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ marginBottom: 8 }}>
                <a href={`${basePath}?project_id=${projectId}&region=${scope.region}`} style={{ fontSize: "0.85rem", color: "var(--c-ink-soft)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Back to Crashes
                </a>
              </div>
              <h2 style={{ margin: "0 0 6px", fontSize: "1.25rem" }}>
                <code style={{ fontSize: "1rem", background: "var(--c-bg)", padding: "2px 8px", borderRadius: "var(--radius-sm)" }}>
                  {detail.report.id.substring(0, 16)}…
                </code>
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span className="badge" style={{ textTransform: "capitalize", fontSize: "0.75rem" }}>{detail.report.platform}</span>
                {crashMarker && <SeverityBadge severity="fatal" />}
                <span style={{ fontSize: "0.82rem", color: "var(--c-ink-soft)" }} title={generatedAt.toLocaleString()}>
                  {formatRelativeTime(detail.report.generated_at_unix_ms)}
                </span>
              </div>
            </div>
            <CrashDetailActions reportId={detail.report.id} projectId={projectId} region={scope.region} />
          </div>
        </div>
      </Card>

      {/* Crash Marker Banner */}
      {crashMarker && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          background: "#fee2e2",
          border: "1px solid #fca5a5",
          borderRadius: "var(--radius-md)",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div style={{ flex: 1 }}>
            <strong style={{ color: "#b91c1c", fontSize: "0.9rem" }}>Crash Marker</strong>
            <span style={{ color: "#b91c1c", fontSize: "0.85rem", marginLeft: 8 }}>
              seq {crashMarker.seq} · {crashMarker.type} · {new Date(crashMarker.timestamp_unix_ms).toLocaleTimeString()}
            </span>
          </div>
          <a
            href={`/api/reports/${detail.report.id}/download?${downloadQuery.toString()}`}
            className="btn btn-sm"
            style={{ fontSize: "0.78rem", padding: "4px 10px", flexShrink: 0 }}
          >
            Download Raw
          </a>
        </div>
      )}

      {/* Metadata Grid */}
      <Card>
        <div style={{ padding: "16px 24px" }}>
          <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: "1rem" }}>Report Metadata</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px 24px" }}>
            {[
              { label: "Platform", value: <span style={{ textTransform: "capitalize" }}>{detail.report.platform}</span> },
              { label: "App Version", value: `${detail.report.app_version} (${detail.report.build_number})` },
              { label: "Region", value: <code style={{ fontSize: "0.85rem" }}>{scope.region.toUpperCase()}</code> },
              { label: "Export Source", value: <code style={{ fontSize: "0.85rem" }}>{detail.report.export_source}</code> },
              { label: "Capture Reason", value: <code style={{ fontSize: "0.85rem" }}>{detail.report.capture_reason}</code> },
              { label: "Event Count", value: detail.report.event_count },
              { label: "Generated", value: <span title={generatedAt.toLocaleString()}>{generatedAt.toLocaleDateString()}</span> },
              {
                label: "Fingerprint",
                value: detail.report.crash_fingerprint
                  ? <code style={{ fontSize: "0.78rem", wordBreak: "break-all" }}>{detail.report.crash_fingerprint}</code>
                  : <span style={{ color: "var(--c-ink-faint)" }}>—</span>
              },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--c-ink-soft)", marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: "0.9rem", color: "var(--c-ink)" }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Event Summary */}
      <Card>
        <div style={{ padding: "16px 24px" }}>
          <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: "1rem" }}>Event Summary</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {Object.entries(severityCounts).map(([severity, count]) => (
              <div key={severity} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <SeverityBadge severity={severity} />
                <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>×{count}</span>
              </div>
            ))}
            {preCrashWindow.length > 0 && (
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 10px",
                borderRadius: "999px",
                background: "#fef9c3",
                color: "#a16207",
                fontSize: "0.75rem",
                fontWeight: 600,
              }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
                {preCrashWindow.length} pre-crash events
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Event Groups */}
      <Card>
        <div style={{ padding: "16px 24px" }}>
          <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: "1rem" }}>Grouped by Type</h3>
          {eventGroups.length === 0 && <p style={{ color: "var(--c-ink-soft)" }}>No indexed events available for this report.</p>}
          {eventGroups.length > 0 && (
            <div style={{ display: "grid", gap: 6 }}>
              {eventGroups.map((group) => (
                <details key={group.type} style={{ borderRadius: "var(--radius-md)", border: "1px solid var(--c-border)", overflow: "hidden" }}>
                  <summary style={{
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    padding: "10px 14px",
                    background: "var(--c-bg)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    listStyle: "none",
                  }}>
                    <code style={{ fontSize: "0.82rem", color: "var(--c-primary)" }}>{group.type}</code>
                    <span style={{ fontSize: "0.78rem", color: "var(--c-ink-soft)", fontWeight: 400 }}>({group.events.length} event{group.events.length !== 1 ? "s" : ""})</span>
                  </summary>
                  <div style={{ borderTop: "1px solid var(--c-border)", background: "var(--c-surface)" }}>
                    <table style={{ margin: 0 }}>
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
                            <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>{event.seq}</td>
                            <td style={{ fontSize: "0.82rem", color: "var(--c-ink-soft)" }}>{new Date(event.timestamp_unix_ms).toLocaleTimeString()}</td>
                            <td style={{ fontSize: "0.82rem", color: "var(--c-ink-soft)" }}>{event.thread}</td>
                            <td><SeverityBadge severity={event.severity} /></td>
                          </tr>
                        ))}
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
        <div style={{ padding: "6px 24px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "10px 0 14px" }}>
            <h3 style={{ margin: 0, fontSize: "1rem" }}>Full Timeline</h3>
            <div style={{ display: "flex", gap: 10, fontSize: "0.78rem", color: "var(--c-ink-soft)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 10, height: 10, background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 2, display: "inline-block" }} /> crash
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 10, height: 10, background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 2, display: "inline-block" }} /> pre-crash window
              </span>
            </div>
          </div>
          {detail.events.length === 0 && <p style={{ color: "var(--c-ink-soft)" }}>No indexed events available for this report.</p>}
          {detail.events.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "48px" }}>Seq</th>
                    <th style={{ width: "100px" }}>Time</th>
                    <th>Type</th>
                    <th style={{ width: "80px" }}>Thread</th>
                    <th style={{ width: "90px" }}>Severity</th>
                    <th>Attributes</th>
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
                          ? { background: "#fee2e2" }
                          : (inPreCrashWindow ? { background: "#fffbeb" } : undefined)}
                      >
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem", color: "var(--c-ink-soft)" }}>{event.seq}</td>
                        <td style={{ fontSize: "0.78rem", color: "var(--c-ink-soft)", whiteSpace: "nowrap" }}>
                          {new Date(event.timestamp_unix_ms).toLocaleTimeString()}
                        </td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>
                          {event.type}
                          {crashMarkerRow && <span style={{ marginLeft: 6, fontSize: "0.7rem", color: "#b91c1c", fontWeight: 700 }}>[crash]</span>}
                        </td>
                        <td style={{ fontSize: "0.78rem", color: "var(--c-ink-soft)" }}>{event.thread}</td>
                        <td><SeverityBadge severity={event.severity} /></td>
                        <td style={{ maxWidth: "280px" }}>
                          {event.attrs && Object.keys(event.attrs).length > 0 ? (
                            <code style={{ fontSize: "0.75rem", color: "var(--c-ink-soft)", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                              {JSON.stringify(event.attrs, null, 0)}
                            </code>
                          ) : <span style={{ color: "var(--c-ink-faint)", fontSize: "0.78rem" }}>—</span>}
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
