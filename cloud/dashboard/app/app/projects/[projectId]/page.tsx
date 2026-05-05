import { notFound } from "next/navigation";
import { Card } from "../../../../components/ui/card";
import { getProjectForUser, listApiKeysForProject, listUsageForProject } from "../../../../lib/control-plane";
import { requireSession } from "../../../../lib/session";
import { SectionTitle } from "../../../../components/ui/section-title";
import { formatBytes, formatNumber } from "../../../../lib/ui/format";

type ProjectOverviewPageProps = {
  params: { projectId: string };
};

export default async function ProjectOverviewPage({ params }: ProjectOverviewPageProps) {
  const session = await requireSession();
  const project = await getProjectForUser({
    userId: session.userId,
    projectId: params.projectId,
  });

  if (!project) {
    notFound();
  }

  const [keys, { usageRows }] = await Promise.all([
    listApiKeysForProject({ userId: session.userId, projectId: project.id }),
    listUsageForProject({ userId: session.userId, projectId: project.id, days: 30 }),
  ]);

  const totalReports = usageRows.reduce((sum, row) => sum + row.reports_count, 0);
  const totalBytes = usageRows.reduce((sum, row) => sum + row.bytes_count, 0);
  const activeKeys = keys.filter(k => k.active).length;
  const hasUsageData = usageRows.length > 0;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
            <h1 style={{ margin: "0 0 8px 0", fontSize: "1.75rem" }}>{project.name}</h1>
            <div className="page-meta">
                <span className={`status-badge ${project.status === 'active' ? 'active' : ''}`}>{project.status}</span>
                <span className="meta-item">Region: {project.region.toUpperCase()}</span>
                <span className="meta-item">Plan: {project.plan_tier}</span>
            </div>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
            <a href={`/app/projects/${project.id}/crashes`} className="btn btn-primary">
                Explore Crashes
            </a>
            <a href="/docs/getting-started" className="btn">
                Integration Docs
            </a>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <Card className="stat-card">
            <div className="stat-label">Crash Reports (30d)</div>
            <div className="stat-value">{hasUsageData ? formatNumber(totalReports) : "--"}</div>
            <div className="stat-delta">
              {hasUsageData
                ? `across ${usageRows.length} days`
                : <span style={{ color: "var(--c-ink-faint)" }}>No data yet</span>
              }
            </div>
        </Card>
        <Card className="stat-card">
            <div className="stat-label">Active API Keys</div>
            <div className="stat-value">{activeKeys}</div>
            <div className="stat-delta text-neutral">
                {keys.length} total key{keys.length !== 1 ? "s" : ""}
            </div>
        </Card>
        <Card className="stat-card">
            <div className="stat-label">Storage Used (30d)</div>
            <div className="stat-value">{hasUsageData ? formatBytes(totalBytes) : "--"}</div>
            <div className="stat-delta">
              {hasUsageData
                ? "raw report data"
                : <span style={{ color: "var(--c-ink-faint)" }}>No data yet</span>
              }
            </div>
        </Card>
        <Card className="stat-card">
            <div className="stat-label">Region</div>
            <div className="stat-value" style={{ fontSize: "22px", textTransform: "uppercase" }}>{project.region}</div>
            <div className="stat-delta text-neutral">data residency</div>
        </Card>
      </div>

      {!hasUsageData && (
        <Card>
          <div style={{ padding: "20px 24px", display: "flex", gap: "16px", alignItems: "center" }}>
            <div style={{ fontSize: "28px" }}>🚀</div>
            <div>
              <strong style={{ display: "block", marginBottom: "4px" }}>No crash data yet</strong>
              <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--c-ink-soft)" }}>
                Integrate the CircleBox SDK into your app and generate an ingest key to start capturing crash context.{" "}
                <a href="/docs/getting-started">View the integration guide →</a>
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="dashboard-section">
        <SectionTitle title="Quick Actions" />
        <div className="action-grid">
            <Card>
                <div style={{ padding: "24px", display: "flex", flexDirection: "column", height: "100%" }}>
                    <h3 style={{ margin: "0 0 8px 0", fontSize: "1.1rem" }}>Get Credentials</h3>
                    <p style={{ margin: "0 0 16px 0", fontSize: "0.9rem", color: "var(--c-ink-soft)", flex: 1 }}>Manage API keys for ingestion and usage reporting.</p>
                    <a href={`/app/projects/${project.id}/keys`} className="btn btn-sm">Manage Keys →</a>
                </div>
            </Card>
            <Card>
                <div style={{ padding: "24px", display: "flex", flexDirection: "column", height: "100%" }}>
                    <h3 style={{ margin: "0 0 8px 0", fontSize: "1.1rem" }}>Invite Team</h3>
                    <p style={{ margin: "0 0 16px 0", fontSize: "0.9rem", color: "var(--c-ink-soft)", flex: 1 }}>Add members to your project to collaborate on crash analysis.</p>
                    <a href={`/app/projects/${project.id}/invites`} className="btn btn-sm">Send Invites →</a>
                </div>
            </Card>
            <Card>
                <div style={{ padding: "24px", display: "flex", flexDirection: "column", height: "100%" }}>
                    <h3 style={{ margin: "0 0 8px 0", fontSize: "1.1rem" }}>Check Usage</h3>
                    <p style={{ margin: "0 0 16px 0", fontSize: "0.9rem", color: "var(--c-ink-soft)", flex: 1 }}>Monitor your data consumption and plan limits.</p>
                    <a href={`/app/projects/${project.id}/usage`} className="btn btn-sm">View Usage →</a>
                </div>
            </Card>
        </div>
      </div>

      <style>{`
        .dashboard-container {
            display: flex;
            flex-direction: column;
            gap: 32px;
        }

        .dashboard-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 1px solid var(--c-border);
            padding-bottom: 24px;
        }

        .page-meta {
            display: flex;
            align-items: center;
            gap: 12px;
            color: var(--c-ink-soft);
            font-size: 14px;
        }

        .status-badge {
            display: inline-flex;
            align-items: center;
            padding: 2px 8px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 600;
            background: #e2e8f0;
            color: #64748b;
            text-transform: uppercase;
        }

        .status-badge.active {
            background: #dcfce7;
            color: #15803d;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
        }

        .stat-card {
            padding: 20px;
        }

        .stat-label {
            font-size: 13px;
            font-weight: 500;
            color: var(--c-ink-soft);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 8px;
        }

        .stat-value {
            font-size: 28px;
            font-weight: 700;
            color: var(--c-ink);
            line-height: 1.1;
            margin-bottom: 4px;
        }

        .stat-delta {
            font-size: 12px;
            color: var(--c-ink-faint);
        }

        .text-neutral { color: var(--c-ink-soft); }

        .action-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
        }

        @media (max-width: 1024px) {
            .stats-grid { grid-template-columns: repeat(2, 1fr); }
            .action-grid { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 640px) {
            .dashboard-header { flex-direction: column; gap: 16px; }
            .stats-grid { grid-template-columns: 1fr; }
            .action-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
