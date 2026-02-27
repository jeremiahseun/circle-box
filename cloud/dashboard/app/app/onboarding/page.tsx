import { Card } from "../../../components/ui/card";
import { listProjectsForUser } from "../../../lib/control-plane";
import { requireSession } from "../../../lib/session";

type OnboardingPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function OnboardingPage({ searchParams = {} }: OnboardingPageProps) {
  const session = await requireSession();
  const projects = await listProjectsForUser(session.userId);
  const success = firstValue(searchParams.success);
  const error = firstValue(searchParams.error);
  const token = firstValue(searchParams.token) ?? "";

  return (
    <section style={{ display: "grid", gap: 14, maxWidth: 860 }}>
      <Card>
        <div style={{ padding: 20 }}>
          <h1 style={{ marginBottom: 8 }}>Get Started</h1>
          <p style={{ margin: 0, color: "var(--ink-soft)" }}>
            Your account is ready. Choose how you want to start using CircleBox Cloud.
          </p>
        </div>
      </Card>

      {success && (
        <Card>
          <div style={{ padding: 14, color: "var(--accent-strong)" }}>
            Action completed: <code>{success}</code>
          </div>
        </Card>
      )}
      {error && (
        <Card>
          <div style={{ padding: 14, color: "var(--danger)" }}>
            Action failed: <code>{error}</code>
          </div>
        </Card>
      )}

      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        <Card>
          <div style={{ padding: 18, display: "grid", gap: 10 }}>
            <h3 style={{ margin: 0 }}>Create New Project</h3>
            <p style={{ margin: 0, color: "var(--ink-soft)" }}>
              Start a fresh project, pick region, then generate ingest and usage keys.
            </p>
            <a className="btn btn-primary" href="/app/projects/new">Create Project</a>
          </div>
        </Card>

        <Card>
          <div style={{ padding: 18, display: "grid", gap: 10 }}>
            <h3 style={{ margin: 0 }}>Join Existing Project</h3>
            <p style={{ margin: 0, color: "var(--ink-soft)" }}>
              Paste an invite token to join an existing organization workspace.
            </p>
            <form action="/api/invites/accept" method="POST" style={{ display: "grid", gap: 10 }}>
              <input
                name="invite_token"
                required
                defaultValue={token}
                placeholder="paste_invite_token"
                style={{ width: "100%" }}
              />
              <button className="btn btn-primary" type="submit">Join With Invite Token</button>
            </form>
          </div>
        </Card>
      </div>

      {projects.length > 0 && (
        <Card>
          <div style={{ padding: 18, display: "grid", gap: 10 }}>
            <h3 style={{ margin: 0 }}>Your Available Projects</h3>
            <p style={{ margin: 0, color: "var(--ink-soft)" }}>
              You already have access to {projects.length} project{projects.length === 1 ? "" : "s"}.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {projects.slice(0, 12).map((project) => (
                <a key={project.id} className="badge" href={`/app/projects/${project.id}/keys`}>
                  {project.name} ({project.region.toUpperCase()})
                </a>
              ))}
            </div>
          </div>
        </Card>
      )}
    </section>
  );
}

function firstValue(input: string | string[] | undefined): string | undefined {
  if (typeof input === "string") {
    return input;
  }
  return Array.isArray(input) ? input[0] : undefined;
}
