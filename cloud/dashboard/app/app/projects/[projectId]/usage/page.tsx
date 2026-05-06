import { notFound } from "next/navigation";
import { Card } from "../../../../../components/ui/card";
import { getProjectForUser, listUsageForProject } from "../../../../../lib/control-plane";
import { requireSession } from "../../../../../lib/session";
import { UsageChart } from "../../../../../components/ui/usage-chart";

type ProjectUsagePageProps = {
  params: { projectId: string };
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default async function ProjectUsagePage({ params }: ProjectUsagePageProps) {
  const session = await requireSession();
  const project = await getProjectForUser({
    userId: session.userId,
    projectId: params.projectId,
  });
  if (!project) {
    notFound();
  }

  const { usageRows, beaconRows } = await listUsageForProject({
    userId: session.userId,
    projectId: project.id,
    days: 30,
  });

  const totalReports = usageRows.reduce((s, r) => s + r.reports_count, 0);
  const totalEvents = usageRows.reduce((s, r) => s + r.events_count, 0);
  const totalBytes = usageRows.reduce((s, r) => s + r.bytes_count, 0);
  const peakDay = usageRows.reduce<{ date: string; count: number } | null>((best, r) => {
    if (!best || r.reports_count > best.count) return { date: r.usage_date, count: r.reports_count };
    return best;
  }, null);

  return (
    <section style={{ display: "grid", gap: 20 }}>
      {/* Back Button */}
      <div style={{ marginBottom: "-4px" }}>
        <a href={`/app/projects/${project.id}`} className="btn btn-sm" style={{ padding: "6px 12px", display: "inline-flex", gap: "6px", alignItems: "center", background: "transparent", border: "1px solid var(--c-border)", color: "var(--c-ink-soft)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to Dashboard
        </a>
      </div>

      <Card>
        <div style={{ padding: 20 }}>
          <h1 style={{ marginBottom: 4 }}>{project.name} — Usage</h1>
          <p style={{ margin: 0, color: "var(--c-ink-soft)", fontSize: "0.95rem" }}>
            Last 30 days of ingest data. Billing is based on reports ingested and raw payload bytes stored.
          </p>
        </div>
      </Card>

      {/* Summary stats */}
      {usageRows.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          <Card>
            <div style={{ padding: "16px 20px" }}>
              <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--c-ink-soft)", marginBottom: 6 }}>Total Reports</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "var(--c-ink)" }}>{totalReports.toLocaleString()}</div>
              <div style={{ fontSize: 12, color: "var(--c-ink-faint)", marginTop: 2 }}>over {usageRows.length} day{usageRows.length !== 1 ? "s" : ""}</div>
            </div>
          </Card>
          <Card>
            <div style={{ padding: "16px 20px" }}>
              <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--c-ink-soft)", marginBottom: 6 }}>Total Events</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "var(--c-ink)" }}>{totalEvents.toLocaleString()}</div>
              <div style={{ fontSize: 12, color: "var(--c-ink-faint)", marginTop: 2 }}>indexed event records</div>
            </div>
          </Card>
          <Card>
            <div style={{ padding: "16px 20px" }}>
              <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--c-ink-soft)", marginBottom: 6 }}>Storage Used</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "var(--c-ink)" }}>{formatBytes(totalBytes)}</div>
              <div style={{ fontSize: 12, color: "var(--c-ink-faint)", marginTop: 2 }}>
                {peakDay ? `peak: ${peakDay.count} reports on ${peakDay.date}` : "payload bytes"}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Chart: Reports per day */}
      <Card>
        <div style={{ padding: "20px 20px 16px" }}>
          <h3 style={{ marginTop: 0, marginBottom: 4, fontSize: "1rem" }}>Reports per Day</h3>
          <p style={{ margin: "0 0 16px 0", fontSize: "0.85rem", color: "var(--c-ink-soft)" }}>
            Crash reports ingested daily over the past 30 days.
          </p>
          <UsageChart rows={usageRows} metric="reports_count" label="Reports per day" color="#ef4444" />
        </div>
      </Card>

      {/* Chart: Events per day */}
      <Card>
        <div style={{ padding: "20px 20px 16px" }}>
          <h3 style={{ marginTop: 0, marginBottom: 4, fontSize: "1rem" }}>Events per Day</h3>
          <p style={{ margin: "0 0 16px 0", fontSize: "0.85rem", color: "var(--c-ink-soft)" }}>
            Individual events indexed across all reports.
          </p>
          <UsageChart rows={usageRows} metric="events_count" label="Events per day" color="#10b981" />
        </div>
      </Card>

      {/* Chart: Bytes per day */}
      <Card>
        <div style={{ padding: "20px 20px 16px" }}>
          <h3 style={{ marginTop: 0, marginBottom: 4, fontSize: "1rem" }}>Storage per Day</h3>
          <p style={{ margin: "0 0 16px 0", fontSize: "0.85rem", color: "var(--c-ink-soft)" }}>
            Raw payload bytes stored per day.
          </p>
          <UsageChart rows={usageRows} metric="bytes_count" label="Bytes per day" color="#6366f1" />
        </div>
      </Card>

      {/* Raw Data Table */}
      <Card>
        <div style={{ padding: "6px 20px 16px" }}>
          <h3>Daily Breakdown</h3>
          {usageRows.length === 0 && (
            <div style={{ padding: "24px 0", textAlign: "center", color: "var(--c-ink-soft)" }}>
              <p style={{ margin: 0 }}>No usage data yet. Integrate the SDK and send your first crash report to see data here.</p>
            </div>
          )}
          {usageRows.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th style={{ textAlign: "right" }}>Reports</th>
                    <th style={{ textAlign: "right" }}>Events</th>
                    <th style={{ textAlign: "right" }}>Storage</th>
                  </tr>
                </thead>
                <tbody>
                  {[...usageRows].sort((a, b) => b.usage_date.localeCompare(a.usage_date)).map((row) => (
                    <tr key={row.usage_date}>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.9rem" }}>{row.usage_date}</td>
                      <td style={{ textAlign: "right", fontWeight: row.reports_count > 0 ? 600 : undefined }}>{row.reports_count.toLocaleString()}</td>
                      <td style={{ textAlign: "right" }}>{row.events_count.toLocaleString()}</td>
                      <td style={{ textAlign: "right", color: "var(--c-ink-soft)" }}>{formatBytes(row.bytes_count)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: "var(--c-bg)" }}>
                    <td style={{ fontWeight: 700, fontSize: "0.9rem" }}>Total</td>
                    <td style={{ textAlign: "right", fontWeight: 700 }}>{totalReports.toLocaleString()}</td>
                    <td style={{ textAlign: "right", fontWeight: 700 }}>{totalEvents.toLocaleString()}</td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: "var(--c-ink-soft)" }}>{formatBytes(totalBytes)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* Beacon Data */}
      {beaconRows.length > 0 && (
        <Card>
          <div style={{ padding: "6px 20px 16px" }}>
            <h3>SDK Usage Beacon</h3>
            <p style={{ color: "var(--c-ink-soft)", fontSize: "0.9rem", marginBottom: 16 }}>
              Optional telemetry emitted by the SDK when <code>usage_beacon</code> mode is enabled.
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>SDK</th>
                    <th>Mode</th>
                    <th style={{ textAlign: "right" }}>Active Apps</th>
                    <th style={{ textAlign: "right" }}>Crashes</th>
                    <th style={{ textAlign: "right" }}>Events</th>
                  </tr>
                </thead>
                <tbody>
                  {beaconRows.map((row) => (
                    <tr key={`${row.usage_date}-${row.sdk_family}-${row.sdk_version}-${row.mode}`}>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.9rem" }}>{row.usage_date}</td>
                      <td><code style={{ fontSize: "0.8rem" }}>{row.sdk_family}@{row.sdk_version}</code></td>
                      <td><span className="badge" style={{ fontSize: "0.7rem" }}>{row.mode}</span></td>
                      <td style={{ textAlign: "right" }}>{row.active_apps}</td>
                      <td style={{ textAlign: "right" }}>{row.crash_reports}</td>
                      <td style={{ textAlign: "right" }}>{row.events_emitted.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}
    </section>
  );
}
