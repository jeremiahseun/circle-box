import type { ReactNode } from "react";

export default function DashboardLayout(props: { children: ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: "var(--space-8)", minHeight: "80vh" }}>
      <aside className="dashboard-sidebar" style={{
        borderRight: "1px solid var(--c-border)",
        paddingRight: "var(--space-4)"
      }}>
        <div style={{ marginBottom: "var(--space-6)" }}>
            <h5 style={{
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--c-ink-faint)",
                fontSize: "0.75rem",
                marginBottom: "var(--space-3)"
            }}>
                Overview
            </h5>
            <nav className="sidebar-nav" style={{ display: "grid", gap: "var(--space-1)" }}>
                <a href="/dashboard/crashes" className="sidebar-link active">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                    Crashes
                </a>
                <a href="/dashboard/analytics" className="sidebar-link">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                    Analytics
                </a>
            </nav>
        </div>

        <div>
            <h5 style={{
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--c-ink-faint)",
                fontSize: "0.75rem",
                marginBottom: "var(--space-3)"
            }}>
                Settings
            </h5>
            <nav className="sidebar-nav" style={{ display: "grid", gap: "var(--space-1)" }}>
                <a href="/dashboard/projects" className="sidebar-link">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                    Projects
                </a>
                <a href="/dashboard/users" className="sidebar-link">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    Users
                </a>
            </nav>
        </div>
      </aside>

      <div className="dashboard-content">
        <header style={{
            marginBottom: "var(--space-6)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
        }}>
            <div>
                <h1 style={{ fontSize: "1.5rem", marginBottom: "4px" }}>Crashes</h1>
                <p style={{ margin: 0, color: "var(--c-ink-soft)", fontSize: "0.9rem" }}>
                    Live crash stream and impact analysis.
                </p>
            </div>
            <div className="toolbar">
                {/* Placeholder for toolbar actions */}
            </div>
        </header>
        {props.children}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .sidebar-link {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 12px;
            border-radius: var(--radius-md);
            color: var(--c-ink-soft);
            font-size: 0.9rem;
            font-weight: 500;
            transition: all var(--trans-fast);
        }
        .sidebar-link:hover {
            background: var(--c-surface-hover);
            color: var(--c-ink);
        }
        .sidebar-link.active {
            background: var(--c-primary-light);
            color: white;
        }
        .sidebar-link svg {
            opacity: 0.8;
        }
      `}} />
    </div>
  );
}
