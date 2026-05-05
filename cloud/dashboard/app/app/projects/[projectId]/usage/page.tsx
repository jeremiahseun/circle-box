import { notFound } from "next/navigation";
import { Card } from "../../../../../components/ui/card";
import { getProjectForUser, listUsageForProject } from "../../../../../lib/control-plane";
import { requireSession } from "../../../../../lib/session";
import { formatBytes, formatNumber } from "../../../../../lib/ui/format";

type ProjectUsagePageProps = {
  params: { projectId: string };
};

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

  const totalReports = usageRows.reduce((sum, row) => sum + row.reports_count, 0);
  const totalEvents = usageRows.reduce((sum, row) => sum + row.events_count, 0);
  const totalBytes = usageRows.reduce((sum, row) => sum + row.bytes_count, 0);

  return (
    <section style={{ display: "grid", gap: 14 }}>
      {/* Back Button */}
      <div style={{ marginBottom: "-8px" }}>
        <a href={`/app/projects/${project.id}`} className="btn btn-sm" style={{ padding: "6px 12px", display: "inline-flex", gap: "6px", alignItems: "center", background: "transparent", border: "1px solid var(--c-border)", color: "var(--c-ink-soft)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to Dashboard
        </a>
      </div>

      <Card>
        <div style={{ padding: 20 }}>
          <h1 style={{ marginBottom: 8 }}>{project.name} — Usage</h1>
          <p style={{ margin: 0, color: "var(--c-ink-soft)" }}>
            Billing meter: reports + storage. Usage beacon telemetry is optional and off by default.
          </p>
          <p style={{ marginTop: 10, marginBottom: 0 }}>
            <a href={`/app/projects/${project.id}/crashes`}>Crashes</a> |{" "}
            <a href={`/app/projects/${project.id}/keys`}>Keys</a> |{" "}
            <a href={`/app/projects/${project.id}/members`}>Members</a> |{" "}
            <a href={`/app/projects/${project.id}/invites`}>Invites</a>
          </p>
        </div>
      </Card>

      {/* 30-Day Summary */}
      {usageRows.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          <Card>
            <div style={{ padding: "16px 20px" }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--c-ink-soft)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Reports (30d)</div>
              <div style={{ fontSize: "26px", fontWeight: 700, color: "var(--c-ink)" }}>{formatNumber(totalReports)}</div>
            </div>
          </Card>
          <Card>
            <div style={{ padding: "16px 20px" }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--c-ink-soft)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Events (30d)</div>
              <div style={{ fontSize: "26px", fontWeight: 700, color: "var(--c-ink)" }}>{formatNumber(totalEvents)}</div>
            </div>
          </Card>
          <Card>
            <div style={{ padding: "16px 20px" }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--c-ink-soft)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Storage (30d)</div>
              <div style={{ fontSize: "26px", fontWeight: 700, color: "var(--c-ink)" }}>{formatBytes(totalBytes)}</div>
            </div>
          </Card>
        </div>
      )}

      <Card>
        <div style={{ padding: "6px 16px 14px" }}>
          <h3>Daily Ingest Usage</h3>
          {usageRows.length === 0 && (
            <p style={{ color: "var(--c-ink-soft)" }}>No usage data yet. Integrate the SDK and upload your first crash report to see data here.</p>
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
                  {usageRows.map((row) => (
                    <tr key={row.usage_date}>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}>{row.usage_date}</td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{row.reports_count.toLocaleString()}</td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{row.events_count.toLocaleString()}</td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}>{formatBytes(row.bytes_count)}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: "2px solid var(--c-border)", background: "var(--c-bg)" }}>
                    <td style={{ fontWeight: 700, fontSize: "0.875rem" }}>30-Day Total</td>
                    <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{totalReports.toLocaleString()}</td>
                    <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{totalEvents.toLocaleString()}</td>
                    <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}>{formatBytes(totalBytes)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <div style={{ padding: "6px 16px 14px" }}>
          <h3>Usage Beacon Rows</h3>
          <p style={{ marginBottom: 12, color: "var(--c-ink-soft)", fontSize: "0.875rem" }}>
            Aggregate SDK telemetry. Requires <code>usage_beacon</code> key and opt-in in SDK config.
          </p>
          {beaconRows.length === 0 && <p style={{ color: "var(--c-ink-soft)" }}>No usage beacon rows found. Enable <code>usageBeaconKey</code> in SDK config to collect aggregate telemetry.</p>}
          {beaconRows.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>SDK</th>
                    <th>Mode</th>
                    <th style={{ textAlign: "right" }}>Active Apps</th>
                    <th style={{ textAlign: "right" }}>Crash Reports</th>
                    <th style={{ textAlign: "right" }}>Events Emitted</th>
                  </tr>
                </thead>
                <tbody>
                  {beaconRows.map((row) => (
                    <tr key={`${row.usage_date}-${row.sdk_family}-${row.sdk_version}-${row.mode}`}>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}>{row.usage_date}</td>
                      <td><code style={{ fontSize: "0.8rem" }}>{row.sdk_family}@{row.sdk_version}</code></td>
                      <td><span className="badge" style={{ fontSize: "0.7rem" }}>{row.mode}</span></td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{row.active_apps.toLocaleString()}</td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{row.crash_reports.toLocaleString()}</td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{row.events_emitted.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </section>
  );
}
