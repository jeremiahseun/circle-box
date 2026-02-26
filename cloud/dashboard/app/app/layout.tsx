import type { ReactNode } from "react";
import { listProjectsForUser } from "../../lib/control-plane";
import { requireSession } from "../../lib/session";
import { Card } from "../../components/ui/card";

export default async function AppLayout(props: { children: ReactNode }) {
  const session = await requireSession();
  const projects = await listProjectsForUser(session.userId);

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <Card>
        <div style={{ padding: 18, display: "grid", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <strong>Workspace</strong>
              <div style={{ color: "var(--ink-soft)" }}>{session.email}</div>
            </div>
            <form action="/api/auth/logout" method="POST">
              <button className="btn" type="submit">Log out</button>
            </form>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a className="btn" href="/app/projects/new">New Project</a>
            <a className="btn" href="/dashboard/crashes">Dashboard</a>
            <a className="btn" href="/docs/cloud-quickstart">Cloud Docs</a>
          </div>

          {projects.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {projects.slice(0, 8).map((project) => (
                <a key={project.id} className="badge" href={`/app/projects/${project.id}/keys`}>
                  {project.name} ({project.region.toUpperCase()})
                </a>
              ))}
            </div>
          )}
        </div>
      </Card>

      {props.children}
    </section>
  );
}
