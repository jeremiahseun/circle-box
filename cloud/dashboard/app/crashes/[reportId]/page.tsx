import Link from "next/link";
import { getReportDetail, type DashboardEvent } from "../../../lib/data-plane";
import { resolveDashboardScope, type DashboardSearchParams } from "../../../lib/env";
import CrashDetailActions from "./crash-detail-actions";

type CrashDetailProps = {
  params: { reportId: string };
  searchParams?: DashboardSearchParams;
};

type EventGroup = {
  type: string;
  events: DashboardEvent[];
};

export default async function CrashDetailPage({ params, searchParams = {} }: CrashDetailProps) {
  const scope = resolveDashboardScope(searchParams);
  const detail = await getReportDetail({
    projectId: scope.projectId,
    region: scope.region,
    reportId: params.reportId,
  });

  if (!detail) {
    return (
      <section>
        <h2>Crash Detail: {params.reportId}</h2>
        <p>
          No report found for project <code>{scope.projectId}</code> in region <code>{scope.region}</code>.
        </p>
      </section>
    );
  }

  const downloadQuery = new URLSearchParams({
    project_id: scope.projectId,
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

  return (
    <section>
      <h2>Crash Detail: {detail.report.id}</h2>
      <p>
        <Link href={`/crashes?project_id=${scope.projectId}&region=${scope.region}`}>Back to Crashes</Link>
      </p>

      <CrashDetailActions reportId={detail.report.id} projectId={scope.projectId} region={scope.region} />

      <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 16 }}>
        <tbody>
          <tr>
            <td style={{ fontWeight: 600, width: 220 }}>Project</td>
            <td>{scope.projectId}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 600 }}>Region</td>
            <td>{scope.region}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 600 }}>Platform</td>
            <td>{detail.report.platform}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 600 }}>App / Build</td>
            <td>
              {detail.report.app_version} ({detail.report.build_number})
            </td>
          </tr>
          <tr>
            <td style={{ fontWeight: 600 }}>Fingerprint</td>
            <td>{detail.report.crash_fingerprint ?? "-"}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 600 }}>Export Source</td>
            <td>{detail.report.export_source}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 600 }}>Capture Reason</td>
            <td>{detail.report.capture_reason}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 600 }}>Event Count</td>
            <td>{detail.report.event_count}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 600 }}>Generated</td>
            <td>{new Date(detail.report.generated_at_unix_ms).toLocaleString()}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 600 }}>Download</td>
            <td>
              <a href={`/api/reports/${detail.report.id}/download?${downloadQuery.toString()}`}>Download raw report</a>
            </td>
          </tr>
        </tbody>
      </table>

      {crashMarker && (
        <div
          style={{
            border: "1px solid #fecaca",
            background: "#fff1f2",
            padding: 12,
            marginBottom: 16,
          }}
        >
          <strong>Crash Marker</strong>: seq {crashMarker.seq} | {crashMarker.type} | {crashMarker.severity} |{" "}
          {new Date(crashMarker.timestamp_unix_ms).toLocaleString()}
        </div>
      )}

      <h3>Event Summary</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        {Object.entries(severityCounts).map(([severity, count]) => (
          <span
            key={severity}
            style={{
              border: "1px solid #cbd5e1",
              borderRadius: 6,
              padding: "6px 10px",
              background: severity === "fatal" ? "#fff1f2" : "#f8fafc",
            }}
          >
            {severity}: <strong>{count}</strong>
          </span>
        ))}
        {preCrashWindow.length > 0 && (
          <span style={{ border: "1px solid #facc15", borderRadius: 6, padding: "6px 10px", background: "#fefce8" }}>
            pre-crash window events: <strong>{preCrashWindow.length}</strong>
          </span>
        )}
      </div>

      <h3>Grouped by Event Type</h3>
      {eventGroups.length === 0 && <p>No indexed events available for this report.</p>}
      {eventGroups.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {eventGroups.map((group) => (
            <details key={group.type} style={{ marginBottom: 8 }}>
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                {group.type} ({group.events.length})
              </summary>
              <table style={{ borderCollapse: "collapse", width: "100%", marginTop: 8 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", borderBottom: "1px solid #cbd5e1" }}>Seq</th>
                    <th style={{ textAlign: "left", borderBottom: "1px solid #cbd5e1" }}>Time</th>
                    <th style={{ textAlign: "left", borderBottom: "1px solid #cbd5e1" }}>Thread</th>
                    <th style={{ textAlign: "left", borderBottom: "1px solid #cbd5e1" }}>Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {group.events.map((event) => (
                    <tr key={`${group.type}-${event.seq}`}>
                      <td>{event.seq}</td>
                      <td>{new Date(event.timestamp_unix_ms).toLocaleString()}</td>
                      <td>{event.thread}</td>
                      <td>{event.severity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          ))}
        </div>
      )}

      <h3>Timeline</h3>
      {detail.events.length === 0 && <p>No indexed events available for this report.</p>}
      {detail.events.length > 0 && (
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", borderBottom: "1px solid #cbd5e1" }}>Seq</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #cbd5e1" }}>Time</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #cbd5e1" }}>Type</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #cbd5e1" }}>Thread</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #cbd5e1" }}>Severity</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #cbd5e1" }}>Attrs</th>
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
                    ? { background: "#fff1f2" }
                    : (inPreCrashWindow ? { background: "#fefce8" } : undefined)}
                >
                  <td style={{ verticalAlign: "top", padding: "8px 0" }}>{event.seq}</td>
                  <td style={{ verticalAlign: "top" }}>{new Date(event.timestamp_unix_ms).toLocaleString()}</td>
                  <td style={{ verticalAlign: "top" }}>
                    {event.type} {crashMarkerRow ? <strong>(crash-marker)</strong> : null}
                  </td>
                  <td style={{ verticalAlign: "top" }}>{event.thread}</td>
                  <td style={{ verticalAlign: "top" }}>{event.severity}</td>
                  <td style={{ verticalAlign: "top" }}>
                    <code style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(event.attrs)}</code>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
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
