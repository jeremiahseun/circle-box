import { notFound } from "next/navigation";
import { Card } from "../../../../../components/ui/card";
import { getProjectForUser, getProjectRoleForUser, listApiKeysForProject } from "../../../../../lib/control-plane";
import { readKeyPreview } from "../../../../../lib/key-preview";
import { requireSession } from "../../../../../lib/session";

type ProjectKeysPageProps = {
  params: { projectId: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function ProjectKeysPage({
  params,
  searchParams = {},
}: ProjectKeysPageProps) {
  const session = await requireSession();
  const project = await getProjectForUser({
    userId: session.userId,
    projectId: params.projectId,
  });
  if (!project) {
    notFound();
  }

  const [keys, preview, role] = await Promise.all([
    listApiKeysForProject({ userId: session.userId, projectId: project.id }),
    Promise.resolve(readKeyPreview(project.id)),
    getProjectRoleForUser({ userId: session.userId, projectId: project.id }),
  ]);
  const isOwner = role === "owner";

  const error = firstValue(searchParams.error);
  const success = firstValue(searchParams.success);

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
          <h1 style={{ marginBottom: 6 }}>{project.name} Keys</h1>
          <p style={{ margin: 0, color: "var(--c-ink-soft)" }}>
            Project ID: <code>{project.id}</code> | Region: <code>{project.region}</code>
          </p>
          <p style={{ marginTop: 10, marginBottom: 0 }}>
            <a href={`/app/projects/${project.id}/crashes`}>Crashes</a> |{" "}
            <a href={`/app/projects/${project.id}/usage`}>Usage</a> |{" "}
            <a href={`/app/projects/${project.id}/members`}>Members</a> |{" "}
            <a href={`/app/projects/${project.id}/invites`}>Invites</a>
          </p>
        </div>
      </Card>

      {error && (
        <Card>
          <div style={{ padding: 14, color: "var(--c-danger)" }}>
            Action failed: <code>{error}</code>
          </div>
        </Card>
      )}
      {success && (
        <Card>
          <div style={{ padding: 14, color: "var(--c-accent)" }}>
            Action completed: <code>{success}</code>
          </div>
        </Card>
      )}

      {preview && (
        <Card>
          <div style={{ padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>New Secret (Shown Once)</h3>
            <p style={{ color: "var(--c-ink-soft)" }}>
              Copy these keys now. Only hashed secrets are persisted in the control plane.
            </p>
            <div style={{ display: "grid", gap: 10 }}>
              {preview.keys.map((key) => (
                <div key={`${key.key_type}-${key.secret}`} style={{ border: "1px solid var(--c-border)", borderRadius: 10, padding: 10 }}>
                  <strong>{key.key_type}</strong>
                  <div>
                    <code style={{ wordBreak: "break-all" }}>{key.secret}</code>
                  </div>
                </div>
              ))}
            </div>
            <form action={`/api/projects/${project.id}/keys/preview-clear`} method="POST" style={{ marginTop: 12 }}>
              <button className="btn" type="submit">Hide Secret Preview</button>
            </form>
          </div>
        </Card>
      )}

      <Card>
        <div style={{ padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Create Key</h3>
          {!isOwner && <p style={{ color: "var(--c-ink-soft)" }}>Only owners can create, rotate, or revoke keys.</p>}
          <form action={`/api/projects/${project.id}/keys/create`} method="POST" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
            <label style={{ flex: 1, minWidth: "200px" }}>
              Key Type{" "}
              <select name="key_type" defaultValue="ingest" disabled={!isOwner} style={{ width: "100%", marginTop: "4px" }}>
                <option value="ingest">ingest</option>
                <option value="usage_beacon">usage_beacon</option>
              </select>
            </label>
            <button className="btn btn-primary" type="submit" disabled={!isOwner} style={{ height: "42px" }}>Generate Key</button>
          </form>
        </div>
      </Card>

      <Card>
        <div style={{ padding: "6px 16px 14px" }}>
          <h3>Existing Keys</h3>
          {keys.length === 0 && <p>No keys yet for this project.</p>}
          {keys.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Prefix</th>
                    <th>Type</th>
                    <th>Scope</th>
                    <th>Rate Limit</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Last Used</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((key) => (
                    <tr key={key.id}>
                      <td><code>{key.key_prefix}</code></td>
                      <td>{key.key_type}</td>
                      <td>{key.region_scope}</td>
                      <td>
                        {key.max_reports_per_minute} rpt/min, {key.max_fragments_per_minute} frag/min, burst {key.burst_limit}
                      </td>
                      <td>{key.active ? "active" : "revoked"}</td>
                      <td>{new Date(key.created_at).toLocaleString()}</td>
                      <td>{key.last_used_at ? new Date(key.last_used_at).toLocaleString() : "-"}</td>
                      <td>
                        <div style={{ display: "flex", gap: 8 }}>
                          <form action={`/api/projects/${project.id}/keys/${key.id}/rotate`} method="POST">
                            <button className="btn btn-sm" type="submit" disabled={!key.active || !isOwner}>Rotate</button>
                          </form>
                          <form action={`/api/projects/${project.id}/keys/${key.id}/revoke`} method="POST">
                            <button className="btn btn-sm" type="submit" disabled={!key.active || !isOwner}>Revoke</button>
                          </form>
                        </div>
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
