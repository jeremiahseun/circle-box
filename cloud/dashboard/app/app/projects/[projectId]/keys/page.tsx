import { notFound } from "next/navigation";
import { Card } from "../../../../../components/ui/card";
import { CopyButton } from "../../../../../components/ui/copy-button";
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
          <h1 style={{ marginBottom: 6 }}>{project.name} — Keys</h1>
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
          <div style={{ padding: 14, color: "var(--c-danger)", background: "var(--c-danger-bg)", borderRadius: "var(--radius-md)" }}>
            Action failed: <code>{error}</code>
          </div>
        </Card>
      )}
      {success && (
        <Card>
          <div style={{ padding: 14, color: "var(--c-primary)", background: "var(--c-accent-subtle)", borderRadius: "var(--radius-md)" }}>
            Action completed: <code>{success}</code>
          </div>
        </Card>
      )}

      {preview && (
        <Card>
          <div style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "var(--c-warning)", display: "flex",
                alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "1rem" }}>New Secret — Copy Now</h3>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--c-ink-soft)" }}>
                  These secrets are shown only once. Only the hash is stored.
                </p>
              </div>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {preview.keys.map((key) => (
                <div
                  key={`${key.key_type}-${key.secret}`}
                  style={{
                    border: "1px solid var(--c-border)",
                    borderRadius: "var(--radius-md)",
                    padding: "12px 14px",
                    background: "var(--c-bg)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span className="badge" style={{ fontSize: "0.75rem" }}>{key.key_type}</span>
                    <CopyButton text={key.secret} label="Copy secret" />
                  </div>
                  <code style={{
                    display: "block",
                    wordBreak: "break-all",
                    fontSize: "0.82rem",
                    color: "var(--c-primary)",
                    lineHeight: 1.5,
                  }}>
                    {key.secret}
                  </code>
                </div>
              ))}
            </div>
            <form action={`/api/projects/${project.id}/keys/preview-clear`} method="POST" style={{ marginTop: 14 }}>
              <button className="btn btn-sm" type="submit" style={{ color: "var(--c-ink-soft)" }}>
                I've saved these — dismiss
              </button>
            </form>
          </div>
        </Card>
      )}

      <Card>
        <div style={{ padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Generate New Key</h3>
          {!isOwner && (
            <div style={{ padding: "10px 14px", background: "var(--c-bg)", border: "1px solid var(--c-border)", borderRadius: "var(--radius-md)", marginBottom: 12, fontSize: "0.875rem", color: "var(--c-ink-soft)" }}>
              Only project owners can create, rotate, or revoke keys.
            </div>
          )}
          <form action={`/api/projects/${project.id}/keys/create`} method="POST" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
            <label style={{ flex: 1, minWidth: "200px" }}>
              Key Type
              <select name="key_type" defaultValue="ingest" disabled={!isOwner} style={{ width: "100%", marginTop: "4px" }}>
                <option value="ingest">ingest — upload crash reports</option>
                <option value="usage_beacon">usage_beacon — aggregate SDK telemetry</option>
              </select>
            </label>
            <button className="btn btn-primary" type="submit" disabled={!isOwner} style={{ height: "42px" }}>Generate Key</button>
          </form>
        </div>
      </Card>

      <Card>
        <div style={{ padding: "6px 16px 14px" }}>
          <h3>Existing Keys</h3>
          {keys.length === 0 && (
            <p style={{ color: "var(--c-ink-soft)" }}>No keys yet. Generate your first key above to start ingesting crash reports.</p>
          )}
          {keys.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Prefix</th>
                    <th>Type</th>
                    <th>Region</th>
                    <th>Rate Limit</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Last Used</th>
                    {isOwner && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {keys.map((key) => (
                    <tr key={key.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <code style={{ fontSize: "0.82rem" }}>{key.key_prefix}</code>
                          <CopyButton text={key.key_prefix} label="Copy" />
                        </div>
                      </td>
                      <td>
                        <span className="badge" style={{ fontSize: "0.7rem" }}>{key.key_type}</span>
                      </td>
                      <td style={{ textTransform: "uppercase", fontSize: "0.85rem" }}>{key.region_scope}</td>
                      <td style={{ fontSize: "0.82rem", color: "var(--c-ink-soft)" }}>
                        {key.max_reports_per_minute}/min · burst {key.burst_limit}
                      </td>
                      <td>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "2px 8px",
                          borderRadius: "999px",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          background: key.active ? "#dcfce7" : "#f1f5f9",
                          color: key.active ? "#15803d" : "#64748b",
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
                          {key.active ? "active" : "revoked"}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.82rem", color: "var(--c-ink-soft)" }}>{new Date(key.created_at).toLocaleDateString()}</td>
                      <td style={{ fontSize: "0.82rem", color: "var(--c-ink-soft)" }}>{key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : <span style={{ color: "var(--c-ink-faint)" }}>never</span>}</td>
                      {isOwner && (
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            <form action={`/api/projects/${project.id}/keys/${key.id}/rotate`} method="POST">
                              <button
                                className="btn btn-sm"
                                type="submit"
                                disabled={!key.active}
                                style={{ fontSize: "0.78rem", padding: "4px 10px" }}
                              >
                                Rotate
                              </button>
                            </form>
                            <form action={`/api/projects/${project.id}/keys/${key.id}/revoke`} method="POST">
                              <button
                                className="btn btn-sm"
                                type="submit"
                                disabled={!key.active}
                                style={{ fontSize: "0.78rem", padding: "4px 10px", color: key.active ? "var(--c-danger)" : undefined }}
                              >
                                Revoke
                              </button>
                            </form>
                          </div>
                        </td>
                      )}
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
