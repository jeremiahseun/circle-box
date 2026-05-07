import { notFound } from "next/navigation";
import { Card } from "../../../../components/ui/card";
import { getProjectForUser, listApiKeysForProject, listUsageForProject } from "../../../../lib/control-plane";
import { requireSession } from "../../../../lib/session";
import { SectionTitle } from "../../../../components/ui/section-title";

type ProjectOverviewPageProps = {
  params: { projectId: string };
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default async function ProjectOverviewPage({ params }: ProjectOverviewPageProps) {
  const session = await requireSession();
  const project = await getProjectForUser({
    userId: session.userId,
    projectId: params.projectId,
  });

  if (!project) {
    notFound();
  }

  const [keys, usageResult] = await Promise.all([
    listApiKeysForProject({ userId: session.userId, projectId: project.id }),
    listUsageForProject({ userId: session.userId, projectId: project.id, days: 30 }).catch(() => ({
      usageRows: [],
      beaconRows: [],
    })),
  ]);

  const totalCrashes30d = usageResult.usageRows.reduce((sum, row) => sum + row.reports_count, 0);
  const totalBytes30d = usageResult.usageRows.reduce((sum, row) => sum + row.bytes_count, 0);
  const totalEvents30d = usageResult.usageRows.reduce((sum, row) => sum + row.events_count, 0);
  const hasUsageData = usageResult.usageRows.length > 0;

  const todayUsage = usageResult.usageRows[0];
  const yesterdayUsage = usageResult.usageRows[1];
  const crashDelta = todayUsage && yesterdayUsage
    ? todayUsage.reports_count - yesterdayUsage.reports_count
    : null;

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
            <div className="stat-value">{hasUsageData ? totalCrashes30d.toLocaleString() : "—"}</div>
            <div className={`stat-delta ${crashDelta !== null ? (crashDelta > 0 ? 'text-danger' : crashDelta < 0 ? 'text-success' : '') : ''}`}>
              {crashDelta !== null
                ? crashDelta > 0
                  ? `▲ ${crashDelta} vs yesterday`
                  : crashDelta < 0
                    ? `▼ ${Math.abs(crashDelta)} vs yesterday`
                    : "No change vs yesterday"
                : hasUsageData ? "No data yet" : "No ingestion data yet"}
            </div>
        </Card>
        <Card className="stat-card">
            <div className="stat-label">Events Captured (30d)</div>
            <div className="stat-value">{hasUsageData ? totalEvents30d.toLocaleString() : "—"}</div>
            <div className="stat-delta text-neutral">
              {hasUsageData
                ? `Across ${usageResult.usageRows.length} day${usageResult.usageRows.length === 1 ? "" : "s"}`
                : "No ingestion data yet"}
            </div>
        </Card>
        <Card className="stat-card">
            <div className="stat-label">Active API Keys</div>
            <div className="stat-value">{keys.filter(k => k.active).length}</div>
            <div className="stat-delta text-neutral">
                {keys.length} total key{keys.length === 1 ? "" : "s"}
            </div>
        </Card>
        <Card className="stat-card">
            <div className="stat-label">Storage (30d)</div>
            <div className="stat-value">{hasUsageData ? formatBytes(totalBytes30d) : "—"}</div>
            <div className="stat-delta text-neutral">
              {hasUsageData ? "Ingest volume" : "No ingestion data yet"}
            </div>
        </Card>
      </div>

      {/* Usage sparkline */}
      {hasUsageData && usageResult.usageRows.length > 1 && (
        <Card>
          <div style={{ padding: "20px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "1rem" }}>Crash Reports — Last 30 Days</h3>
              <a href={`/app/projects/${project.id}/usage`} style={{ fontSize: "0.85rem" }}>View full usage →</a>
            </div>
            <UsageSparkline rows={usageResult.usageRows.slice().reverse()} />
          </div>
        </Card>
      )}

      <div className="dashboard-section">
        <SectionTitle title="Quick Actions" />
        <div className="action-grid">
            <Card>
                <div style={{ padding: "24px", display: "flex", flexDirection: "column", height: "100%" }}>
                    <h3 style={{ margin: "0 0 8px 0", fontSize: "1.1rem" }}>Explore Crashes</h3>
                    <p style={{ margin: "0 0 16px 0", fontSize: "0.9rem", color: "var(--c-ink-soft)", flex: 1 }}>Browse crash reports, filter by platform or fingerprint, and drill into timelines.</p>
                    <a href={`/app/projects/${project.id}/crashes`} className="btn btn-sm btn-primary">View Crashes →</a>
                </div>
            </Card>
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
        .text-danger { color: var(--c-danger); }
        .text-success { color: var(--c-success); }

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

type SparklineProps = {
  rows: { usage_date: string; reports_count: number }[];
};

function UsageSparkline({ rows }: SparklineProps) {
  const maxVal = Math.max(...rows.map(r => r.reports_count), 1);
  const height = 60;
  const width = 100;
  const barWidth = width / rows.length;

  const points = rows.map((row, i) => {
    const x = (i / (rows.length - 1)) * width;
    const y = height - (row.reports_count / maxVal) * (height - 4);
    return `${x},${y}`;
  });

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "4px" }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ flex: 1, height: `${height}px` }}
        aria-label="Crash reports over time"
      >
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke="var(--c-danger)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.8"
        />
        <polyline
          points={[`0,${height}`, ...points, `${width},${height}`].join(" ")}
          fill="var(--c-danger)"
          opacity="0.08"
          stroke="none"
        />
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "11px", color: "var(--c-ink-faint)", minWidth: "60px", textAlign: "right" }}>
        <span>Max: {maxVal}</span>
        <span>Min: {Math.min(...rows.map(r => r.reports_count))}</span>
        <span>{rows[0]?.usage_date?.slice(5)}</span>
      </div>
    </div>
  );
}
