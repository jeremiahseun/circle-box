import { notFound } from "next/navigation";
import { Card } from "../../../../../components/ui/card";
import { getProjectForUser, listUsageForProject } from "../../../../../lib/control-plane";
import { requireSession } from "../../../../../lib/session";

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

  return (
    <section style={{ display: "grid", gap: 14 }}>
      <Card>
        <div style={{ padding: 20 }}>
          <h1 style={{ marginBottom: 8 }}>{project.name} Usage</h1>
          <p style={{ margin: 0, color: "var(--ink-soft)" }}>
            Billing meter: reports + storage. Usage beacon telemetry is optional and off by default.
          </p>
          <p style={{ marginTop: 10, marginBottom: 0 }}>
            <a href={`/app/projects/${project.id}/keys`}>Back to keys</a>
          </p>
        </div>
      </Card>

      <Card>
        <div style={{ padding: "6px 16px 14px" }}>
          <h3>Daily Ingest Usage</h3>
          {usageRows.length === 0 && <p>No usage rows found yet.</p>}
          {usageRows.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Reports</th>
                    <th>Events</th>
                    <th>Bytes</th>
                  </tr>
                </thead>
                <tbody>
                  {usageRows.map((row) => (
                    <tr key={row.usage_date}>
                      <td>{row.usage_date}</td>
                      <td>{row.reports_count}</td>
                      <td>{row.events_count}</td>
                      <td>{row.bytes_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <div style={{ padding: "6px 16px 14px" }}>
          <h3>Usage Beacon Rows</h3>
          {beaconRows.length === 0 && <p>No usage beacon rows found.</p>}
          {beaconRows.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>SDK</th>
                    <th>Mode</th>
                    <th>Active Apps</th>
                    <th>Crash Reports</th>
                    <th>Events Emitted</th>
                  </tr>
                </thead>
                <tbody>
                  {beaconRows.map((row) => (
                    <tr key={`${row.usage_date}-${row.sdk_family}-${row.sdk_version}-${row.mode}`}>
                      <td>{row.usage_date}</td>
                      <td>{row.sdk_family}@{row.sdk_version}</td>
                      <td>{row.mode}</td>
                      <td>{row.active_apps}</td>
                      <td>{row.crash_reports}</td>
                      <td>{row.events_emitted}</td>
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
