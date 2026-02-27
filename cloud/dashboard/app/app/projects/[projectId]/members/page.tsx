import { notFound } from "next/navigation";
import { Card } from "../../../../../components/ui/card";
import { getProjectForUser, listMembersForProject } from "../../../../../lib/control-plane";
import { requireSession } from "../../../../../lib/session";

type ProjectMembersPageProps = {
  params: { projectId: string };
};

export default async function ProjectMembersPage({ params }: ProjectMembersPageProps) {
  const session = await requireSession();
  const project = await getProjectForUser({
    userId: session.userId,
    projectId: params.projectId,
  });
  if (!project) {
    notFound();
  }

  const members = await listMembersForProject({
    userId: session.userId,
    projectId: project.id,
  });

  return (
    <section style={{ display: "grid", gap: 14 }}>
      <Card>
        <div style={{ padding: 20 }}>
          <h1 style={{ marginBottom: 8 }}>{project.name} Members</h1>
          <p style={{ margin: 0, color: "var(--ink-soft)" }}>
            Owner/member model for MVP. Owners control keys and invites.
          </p>
          <p style={{ marginTop: 10, marginBottom: 0 }}>
            <a href={`/app/projects/${project.id}/crashes`}>Crashes</a> |{" "}
            <a href={`/app/projects/${project.id}/keys`}>Keys</a> |{" "}
            <a href={`/app/projects/${project.id}/invites`}>Invites</a> |{" "}
            <a href={`/app/projects/${project.id}/usage`}>Usage</a>
          </p>
        </div>
      </Card>

      <Card>
        <div style={{ padding: "6px 16px 14px" }}>
          <h3>Members</h3>
          {members.length === 0 && <p>No members found.</p>}
          {members.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={`${member.user_id}-${member.created_at}`}>
                      <td>{member.email}</td>
                      <td>{member.role}</td>
                      <td>{new Date(member.created_at).toLocaleString()}</td>
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
