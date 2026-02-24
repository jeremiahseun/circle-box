import { getReportDetail, type DashboardEvent } from "../../lib/data-plane";
import { resolveDashboardScope, type DashboardSearchParams } from "../../lib/env";
import { Card } from "../ui/card";
import CrashDetailActions from "./crash-detail-actions";

type CrashDetailProps = {
  reportId: string;
  searchParams?: DashboardSearchParams;
};

type EventGroup = {
  type: string;
  events: DashboardEvent[];
};

export default async function CrashDetailPage({ reportId, searchParams = {} }: CrashDetailProps) {
  const scope = resolveDashboardScope(searchParams);
  const detail = await getReportDetail({
    projectId: scope.projectId,
    region: scope.region,
    reportId,
  });

  if (!detail) {
    return (
      <Card>
        <div style={{ padding: 20 }}>
          <h2 style={{ marginTop: 0 }}>Crash Detail: {reportId}</h2>
          <p>
            No report found for project <code>{scope.projectId}</code> in region <code>{scope.region}</code>.
          </p>
        </div>
      </Card>
    );
  }

  const downloadQuery = new URLSearchParams({
    project_id: scope.projectId,
    region: scope.region,
  });

  const severityCounts = countBy(detail.events, (event) => event.severity);
  const eventGroups = groupByType(detail.events);
  const crashMarkerIndex = findLastIndex(detail.events, isCrashMarkerEvent);
  const preCrashWindow = crashMarkerIndex >= 0 ? detail.events.slice(Math.max(0, crashMarkerIndex - 7), crashMarkerIndex + 1) : [];
  const preCrashSeq = new Set(preCrashWindow.map((event) => event.seq));
  const crashMarker = crashMarkerIndex >= 0 ? detail.events[crashMarkerIndex] : null;

  return (
    <section style={{ display: "grid", gap: 14 }}>
      <Card>
        <div style={{ padding: 20 }}>
          <h2 style={{ marginTop: 0 }}>Crash Detail: {detail.report.id}</h2>
          <p>
            <a href={`/dashboard/crashes?project_id=${scope.projectId}&region=${scope.region}`}>Back to Crashes</a>
          </p>
          <CrashDetailActions reportId={detail.report.id} projectId={scope.projectId} region={scope.region} />
          <table>
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
        </div>
      </Card>

      {crashMarker && (
        <Card>
          <div style={{ borderLeft: "4px solid #e34f4f", padding: 12 }}>
            <strong>Crash Marker</strong>: seq {crashMarker.seq} | {crashMarker.type} | {crashMarker.severity} |{" "}
            {new Date(crashMarker.timestamp_unix_ms).toLocaleString()}
          </div>
        </Card>
      )}

      <Card>
        <div style={{ padding: 16 }}>
          <h3>Event Summary</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {Object.entries(severityCounts).map(([severity, count]) => (
              <span key={severity} className="badge">
                {severity}: <strong>{count}</strong>
              </span>
            ))}
            {preCrashWindow.length > 0 && (
              <span className="badge">
                pre-crash window events: <strong>{preCrashWindow.length}</strong>
              </span>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <div style={{ padding: 16 }}>
          <h3>Grouped by Event Type</h3>
          {eventGroups.length === 0 && <p>No indexed events available for this report.</p>}
          {eventGroups.length > 0 && (
            <div>
              {eventGroups.map((group) => (
                <details key={group.type} style={{ marginBottom: 8 }}>
                  <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                    {group.type} ({group.events.length})
                  </summary>
                  <table style={{ marginTop: 8 }}>
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
        </div>
      </Card>

      <Card>
        <div style={{ padding: "6px 16px 14px" }}>
          <h3>Timeline</h3>
          {detail.events.length === 0 && <p>No indexed events available for this report.</p>}
          {detail.events.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Seq</th>
                    <th>Time</th>
                    <th>Type</th>
                    <th>Thread</th>
                    <th>Severity</th>
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
                          ? { background: "#ffe8e8" }
                          : (inPreCrashWindow ? { background: "#fffadc" } : undefined)}
                      >
                        <td>{event.seq}</td>
                        <td>{new Date(event.timestamp_unix_ms).toLocaleString()}</td>
                        <td>
                          {event.type} {crashMarkerRow ? <strong>(crash-marker)</strong> : null}
                        </td>
                        <td>{event.thread}</td>
                        <td>{event.severity}</td>
                        <td>
                          <code style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(event.attrs)}</code>
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
