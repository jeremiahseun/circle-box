import { notFound } from "next/navigation";
import { Card } from "../../../../components/ui/card";
import { getProjectForUser, listApiKeysForProject, listUsageForProject } from "../../../../lib/control-plane";
import { requireSession } from "../../../../lib/session";
import { SectionTitle } from "../../../../components/ui/section-title";

type ProjectOverviewPageProps = {
  params: { projectId: string };
};

const SETUP_STEPS = [
  {
    key: "key",
    label: "Create an ingest API key",
    description: "Generate a key to authenticate your SDK uploads.",
    href: (id: string) => `/app/projects/${id}/keys`,
    linkLabel: "Manage Keys",
  },
  {
    key: "docs",
    label: "Integrate the SDK",
    description: "Follow the quickstart for your platform to start capturing crash context.",
    href: () => "/docs/getting-started",
    linkLabel: "View Docs",
  },
  {
    key: "crashes",
    label: "Explore your first report",
    description: "Once a crash is captured, view the full timeline here.",
    href: (id: string) => `/app/projects/${id}/crashes`,
    linkLabel: "Crash Explorer",
  },
];

export default async function ProjectOverviewPage({ params }: ProjectOverviewPageProps) {
  const session = await requireSession();
  const project = await getProjectForUser({
    userId: session.userId,
    projectId: params.projectId,
  });

  if (!project) {
    notFound();
  }

  const [keys, usageData] = await Promise.all([
    listApiKeysForProject({ userId: session.userId, projectId: project.id }),
    listUsageForProject({ userId: session.userId, projectId: project.id, days: 30 }).catch(() => ({ usageRows: [], beaconRows: [] })),
  ]);

  const activeKeys = keys.filter((k) => k.active).length;
  const totalReports30d = usageData.usageRows.reduce((sum, r) => sum + r.reports_count, 0);
  const totalEvents30d = usageData.usageRows.reduce((sum, r) => sum + r.events_count, 0);
  const hasData = totalReports30d > 0;

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 style={{ margin: "0 0 8px 0", fontSize: "1.75rem" }}>{project.name}</h1>
          <div className="page-meta">
            <span className={`status-badge ${project.status === "active" ? "active" : ""}`}>
              {project.status}
            </span>
            <span className="meta-dot">·</span>
            <span className="meta-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4, verticalAlign: "middle" }}>
                <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
              </svg>
              {project.region.toUpperCase()}
            </span>
            <span className="meta-dot">·</span>
            <span className="meta-item" style={{ textTransform: "capitalize" }}>{project.plan_tier}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px", flexShrink: 0 }}>
          <a href={`/app/projects/${project.id}/crashes`} className="btn btn-primary">
            Crash Explorer
          </a>
          <a href="/docs/getting-started" className="btn">
            Docs
          </a>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <Card className="stat-card">
          <div className="stat-label">Crash Reports (30d)</div>
          <div className="stat-value">{hasData ? totalReports30d.toLocaleString() : "—"}</div>
          <div className="stat-delta">
            {hasData ? (
              <a href={`/app/projects/${project.id}/usage`} style={{ color: "var(--c-accent)", fontSize: "0.8rem" }}>
                View usage →
              </a>
            ) : "No data yet"}
          </div>
        </Card>
        <Card className="stat-card">
          <div className="stat-label">Events Indexed (30d)</div>
          <div className="stat-value">{hasData ? totalEvents30d.toLocaleString() : "—"}</div>
          <div className="stat-delta">{hasData ? "across all reports" : "No data yet"}</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-label">Active API Keys</div>
          <div className="stat-value" style={{ color: activeKeys > 0 ? "var(--c-ink)" : "var(--c-ink-faint)" }}>
            {activeKeys}
          </div>
          <div className="stat-delta text-neutral">
            {keys.length} total &bull; <a href={`/app/projects/${project.id}/keys`} style={{ color: "var(--c-accent)", fontSize: "0.8rem" }}>Manage →</a>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="stat-label">Data Region</div>
          <div className="stat-value" style={{ fontSize: "1.5rem" }}>{project.region.toUpperCase()}</div>
          <div className="stat-delta">{project.plan_tier} plan</div>
        </Card>
      </div>

      {/* Getting Started banner (only shown when no data yet) */}
      {!hasData && (
        <Card>
          <div style={{ padding: "24px 28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "var(--c-accent-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--c-accent)",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>Set up CircleBox in 3 steps</div>
                <div style={{ fontSize: "0.85rem", color: "var(--c-ink-soft)" }}>No crash reports yet — follow the steps below to get started.</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {SETUP_STEPS.map((step, i) => (
                <div
                  key={step.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "14px 16px",
                    background: "var(--c-bg)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--c-border)",
                  }}
                >
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "var(--c-accent)",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    flexShrink: 0,
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{step.label}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--c-ink-soft)" }}>{step.description}</div>
                  </div>
                  <a
                    href={step.href(project.id)}
                    className="btn btn-sm"
                    style={{ flexShrink: 0, fontSize: "0.8rem" }}
                  >
                    {step.linkLabel} →
                  </a>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <div>
        <SectionTitle title="Quick Actions" />
        <div className="action-grid">
          <Card>
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--c-accent-subtle)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--c-accent)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                  </svg>
                </div>
                <h3 style={{ margin: 0, fontSize: "1rem" }}>API Keys</h3>
              </div>
              <p style={{ margin: "0 0 16px 0", fontSize: "0.875rem", color: "var(--c-ink-soft)", flex: 1 }}>
                Create and manage ingest keys for SDK authentication.
                {activeKeys === 0 && <strong style={{ color: "var(--c-warning)", display: "block", marginTop: 4 }}>⚠ No active keys</strong>}
              </p>
              <a href={`/app/projects/${project.id}/keys`} className="btn btn-sm">Manage Keys →</a>
            </div>
          </Card>
          <Card>
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#1d4ed8" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <h3 style={{ margin: 0, fontSize: "1rem" }}>Team</h3>
              </div>
              <p style={{ margin: "0 0 16px 0", fontSize: "0.875rem", color: "var(--c-ink-soft)", flex: 1 }}>
                Invite teammates to collaborate on crash analysis and triaging.
              </p>
              <a href={`/app/projects/${project.id}/invites`} className="btn btn-sm">Invite Members →</a>
            </div>
          </Card>
          <Card>
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "#fdf4ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#7e22ce" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 20V10M12 20V4M6 20v-6"/>
                  </svg>
                </div>
                <h3 style={{ margin: 0, fontSize: "1rem" }}>Usage</h3>
              </div>
              <p style={{ margin: "0 0 16px 0", fontSize: "0.875rem", color: "var(--c-ink-soft)", flex: 1 }}>
                Monitor ingestion volume, events indexed, and storage consumption.
              </p>
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
          gap: 16px;
        }

        .page-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--c-ink-soft);
          font-size: 14px;
          flex-wrap: wrap;
        }

        .meta-dot { color: var(--c-ink-faint); }

        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          background: #e2e8f0;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.04em;
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
          padding: 20px 24px;
        }

        .stat-label {
          font-size: 11px;
          font-weight: 700;
          color: var(--c-ink-soft);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 10px;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 800;
          color: var(--c-ink);
          line-height: 1;
          margin-bottom: 6px;
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
          .dashboard-header { flex-direction: column; }
          .stats-grid { grid-template-columns: 1fr 1fr; }
          .action-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
