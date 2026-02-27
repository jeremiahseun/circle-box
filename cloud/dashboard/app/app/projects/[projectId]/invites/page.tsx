import { notFound } from "next/navigation";
import { Card } from "../../../../../components/ui/card";
import { getProjectForUser, getProjectRoleForUser, listInvitesForProject } from "../../../../../lib/control-plane";
import { requireSession } from "../../../../../lib/session";

type ProjectInvitesPageProps = {
  params: { projectId: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function ProjectInvitesPage({
  params,
  searchParams = {},
}: ProjectInvitesPageProps) {
  const session = await requireSession();
  const project = await getProjectForUser({
    userId: session.userId,
    projectId: params.projectId,
  });
  if (!project) {
    notFound();
  }

  const [invites, role] = await Promise.all([
    listInvitesForProject({
      userId: session.userId,
      projectId: project.id,
    }),
    getProjectRoleForUser({
      userId: session.userId,
      projectId: project.id,
    }),
  ]);

  const isOwner = role === "owner";
  const error = firstValue(searchParams.error);
  const success = firstValue(searchParams.success);
  const inviteToken = firstValue(searchParams.invite_token);

  return (
    <section style={{ display: "grid", gap: 14 }}>
      <Card>
        <div style={{ padding: 20 }}>
          <h1 style={{ marginBottom: 8 }}>{project.name} Invites</h1>
          <p style={{ margin: 0, color: "var(--ink-soft)" }}>
            Invite flow is owner-controlled in MVP. Members can view project data and use existing keys.
          </p>
          <p style={{ marginTop: 10, marginBottom: 0 }}>
            <a href={`/app/projects/${project.id}/crashes`}>Crashes</a> |{" "}
            <a href={`/app/projects/${project.id}/keys`}>Keys</a> |{" "}
            <a href={`/app/projects/${project.id}/members`}>Members</a> |{" "}
            <a href={`/app/projects/${project.id}/usage`}>Usage</a>
          </p>
        </div>
      </Card>

      {error && (
        <Card>
          <div style={{ padding: 14, color: "var(--danger)" }}>
            Action failed: <code>{error}</code>
          </div>
        </Card>
      )}
      {success && (
        <Card>
          <div style={{ padding: 14, color: "var(--accent-strong)" }}>
            Action completed: <code>{success}</code>
          </div>
        </Card>
      )}

      {inviteToken && (
        <Card>
          <div style={{ padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>Invite Token (Shown Once)</h3>
            <p style={{ color: "var(--ink-soft)" }}>
              Share this token with teammates. They can accept from the <a href="/app/invites/accept">invite acceptance page</a>.
            </p>
            <code style={{ display: "block", wordBreak: "break-all" }}>{inviteToken}</code>
          </div>
        </Card>
      )}

      <Card>
        <div style={{ padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Create Invite</h3>
          <p style={{ color: "var(--ink-soft)" }}>
            Invite tokens are reusable until revoked or expired.
          </p>
          {!isOwner && <p style={{ color: "var(--ink-soft)" }}>Only owners can create invites.</p>}
          <form action={`/api/projects/${project.id}/invites/create`} method="POST" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <label>
              Expires (days){" "}
              <input name="expires_in_days" type="number" min={1} max={30} defaultValue={7} style={{ width: 120 }} disabled={!isOwner} />
            </label>
            <button className="btn btn-primary" type="submit" disabled={!isOwner}>Create Invite</button>
          </form>
        </div>
      </Card>

      <Card>
        <div style={{ padding: "6px 16px 14px" }}>
          <h3>Existing Invites</h3>
          {invites.length === 0 && <p>No invites yet.</p>}
          {invites.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Expires</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invites.map((invite) => (
                    <tr key={invite.id}>
                      <td>{invite.mode === "open_token" ? "Open token" : "Invite"}</td>
                      <td>{statusForInvite(invite)}</td>
                      <td>{new Date(invite.created_at).toLocaleString()}</td>
                      <td>{new Date(invite.expires_at).toLocaleString()}</td>
                      <td>
                        <form action={`/api/projects/${project.id}/invites/${invite.id}/revoke`} method="POST">
                          <button
                            className="btn"
                            type="submit"
                            disabled={!isOwner || Boolean(invite.revoked_at)}
                          >
                            Revoke
                          </button>
                        </form>
                      </td>
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

function firstValue(input: string | string[] | undefined): string | undefined {
  if (typeof input === "string") {
    return input;
  }
  return Array.isArray(input) ? input[0] : undefined;
}

function statusForInvite(invite: {
  accepted_at: string | null;
  revoked_at: string | null;
  expires_at: string;
}): string {
  if (invite.revoked_at) {
    return "revoked";
  }
  if (Date.parse(invite.expires_at) <= Date.now()) {
    return "expired";
  }
  return invite.accepted_at ? "active (used)" : "active";
}
