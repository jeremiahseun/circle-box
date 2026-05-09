import { notFound } from "next/navigation";
import { Card } from "../../../../../components/ui/card";
import { SectionTitle } from "../../../../../components/ui/section-title";
import { getProjectForUser, listUsageForProject } from "../../../../../lib/control-plane";
import { requireSession } from "../../../../../lib/session";

type ProjectUsagePageProps = {
  params: { projectId: string };
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function InlineBarChart({ data, maxValue }: { data: { label: string; value: number; tooltip: string }[]; maxValue: number }) {
  if (data.length === 0) return null;
  const chartHeight = 80;
  const barWidth = Math.max(8, Math.floor(Math.min(40, 560 / data.length)));
  const gap = Math.max(2, Math.floor(barWidth * 0.25));
  const totalWidth = data.length * (barWidth + gap);

  return (
    <div style={{ overflowX: "auto", paddingBottom: 8 }}>
      <svg
        width={Math.max(totalWidth, 300)}
        height={chartHeight + 24}
        style={{ display: "block" }}
      >
        {data.map((d, i) => {
          const barH = maxValue > 0 ? Math.max(2, (d.value / maxValue) * chartHeight) : 2;
          const x = i * (barWidth + gap);
          const y = chartHeight - barH;
          return (
            <g key={d.label}>
              <title>{d.tooltip}</title>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx={2}
                fill="var(--c-accent)"
                opacity={0.85}
              />
              {data.length <= 14 && (
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 16}
                  textAnchor="middle"
                  fontSize={9}
                  fill="var(--c-ink-faint)"
                >
                  {d.label.slice(5)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
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

  const totalReports = usageRows.reduce((acc, r) => acc + r.reports_count, 0);
  const totalEvents = usageRows.reduce((acc, r) => acc + r.events_count, 0);
  const totalBytes = usageRows.reduce((acc, r) => acc + r.bytes_count, 0);
  const maxReports = Math.max(...usageRows.map((r) => r.reports_count), 1);

  const chartData = [...usageRows]
    .sort((a, b) => a.usage_date.localeCompare(b.usage_date))
    .map((r) => ({
      label: r.usage_date,
      value: r.reports_count,
      tooltip: `${r.usage_date}: ${r.reports_count} reports, ${r.events_count} events`,
    }));

  return (
    <section style={{ display: "grid", gap: 20 }}>
      {/* Back Button */}
      <div style={{ marginBottom: "-8px" }}>
        <a
          href={`/app/projects/${project.id}`}
          className="btn btn-sm"
          style={{ padding: "6px 12px", display: "inline-flex", gap: "6px", alignItems: "center", background: "transparent", border: "1px solid var(--c-border)", color: "var(--c-ink-soft)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Dashboard
        </a>
      </div>

      {/* Header */}
      <Card>
        <div style={{ padding: "20px 24px" }}>
          <h1 style={{ marginBottom: 4, fontSize: "1.5rem" }}>{project.name} — Usage</h1>
          <p style={{ margin: 0, color: "var(--c-ink-soft)", fontSize: "0.9rem" }}>
            Billing meter: reports + storage over the last 30 days.
            Usage beacon telemetry is optional and off by default.
          </p>
        </div>
      </Card>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {[
          { label: "Total Reports (30d)", value: totalReports.toLocaleString(), sub: "ingested" },
          { label: "Total Events (30d)", value: totalEvents.toLocaleString(), sub: "indexed" },
          { label: "Storage Used (30d)", value: formatBytes(totalBytes), sub: "raw payload" },
        ].map(({ label, value, sub }) => (
          <Card key={label}>
            <div style={{ padding: "20px 24px" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--c-ink-soft)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--c-ink)", lineHeight: 1.1 }}>{value}</div>
              <div style={{ fontSize: "0.8rem", color: "var(--c-ink-faint)", marginTop: 4 }}>{sub}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Daily ingest chart + table */}
      <Card>
        <div style={{ padding: "20px 24px" }}>
          <SectionTitle title="Daily Ingest" eyebrow="30-day window" />
          {usageRows.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--c-ink-soft)" }}>
              <p style={{ margin: 0 }}>No usage data yet. Reports will appear here once your app ingests its first crash.</p>
            </div>
          )}
          {usageRows.length > 0 && (
            <>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: "0.75rem", color: "var(--c-ink-faint)", marginBottom: 6 }}>
                  Reports per day (hover for details)
                </div>
                <InlineBarChart data={chartData} maxValue={maxReports} />
              </div>
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
                    {[...usageRows]
                      .sort((a, b) => b.usage_date.localeCompare(a.usage_date))
                      .map((row) => (
                        <tr key={row.usage_date}>
                          <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}>{row.usage_date}</td>
                          <td style={{ textAlign: "right", fontWeight: 600 }}>{row.reports_count.toLocaleString()}</td>
                          <td style={{ textAlign: "right", color: "var(--c-ink-soft)" }}>{row.events_count.toLocaleString()}</td>
                          <td style={{ textAlign: "right", color: "var(--c-ink-soft)", fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>{formatBytes(row.bytes_count)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Usage beacon */}
      <Card>
        <div style={{ padding: "20px 24px" }}>
          <SectionTitle title="SDK Usage Beacons" eyebrow="Optional telemetry" />
          {beaconRows.length === 0 && (
            <div style={{ textAlign: "center", padding: "32px 0", color: "var(--c-ink-soft)" }}>
              <p style={{ margin: 0 }}>No beacon rows found. Enable <code>enableUsageBeacon</code> in your SDK config to see aggregate SDK telemetry here.</p>
            </div>
          )}
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
                      <td>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>
                          {row.sdk_family}
                          <span style={{ color: "var(--c-ink-faint)" }}>@{row.sdk_version}</span>
                        </span>
                      </td>
                      <td>
                        <span style={{
                          padding: "2px 8px",
                          borderRadius: 999,
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          background: "var(--c-bg)",
                          border: "1px solid var(--c-border)",
                          color: "var(--c-ink-soft)",
                        }}>
                          {row.mode}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>{row.active_apps.toLocaleString()}</td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>{row.crash_reports.toLocaleString()}</td>
                      <td style={{ textAlign: "right", color: "var(--c-ink-soft)" }}>{row.events_emitted.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      <style>{`
        @media (max-width: 640px) {
          .usage-stats-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
