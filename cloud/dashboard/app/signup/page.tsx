import { Card } from "../../components/ui/card";

type SignUpPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function SignUpPage({ searchParams = {} }: SignUpPageProps) {
  const error = firstValue(searchParams.error);

  return (
    <section style={{ display: "grid", gap: 16, maxWidth: 680 }}>
      <Card>
        <div style={{ padding: 22 }}>
          <span className="badge">CircleBox Cloud</span>
          <h1 style={{ marginBottom: 8 }}>Create Your Workspace</h1>
          <p style={{ color: "var(--ink-soft)" }}>
            Create your account, bootstrap your first project, and generate ingest + usage beacon keys.
          </p>
          <p style={{ color: "var(--ink-soft)", marginBottom: 0 }}>
            Already have an account? <a href="/login">Sign in</a>.
          </p>
        </div>
      </Card>

      <Card>
        <div style={{ padding: 20 }}>
          {error && (
            <p style={{ color: "var(--danger)" }}>
              Sign up failed: <code>{error}</code>
            </p>
          )}

          <form action="/api/auth/signup" method="POST" style={{ display: "grid", gap: 12 }}>
            <label>
              Email
              <input name="email" type="email" required placeholder="you@company.com" style={{ width: "100%" }} />
            </label>
            <label>
              Password
              <input name="password" type="password" required minLength={8} style={{ width: "100%" }} />
            </label>
            <label>
              Organization Name
              <input name="organization_name" required placeholder="Acme Mobile" style={{ width: "100%" }} />
            </label>
            <label>
              Project Name
              <input name="project_name" required placeholder="Acme Shopper App" style={{ width: "100%" }} />
            </label>
            <label>
              Region
              <select name="region" defaultValue="us" style={{ width: "100%" }}>
                <option value="us">US</option>
                <option value="eu">EU</option>
              </select>
            </label>
            <button className="btn btn-primary" type="submit">
              Create Account
            </button>
          </form>
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
