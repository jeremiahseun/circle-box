import { Card } from "../../components/ui/card";

type SignUpPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function SignUpPage({ searchParams = {} }: SignUpPageProps) {
  const error = firstValue(searchParams.error);
  const inviteToken = firstValue(searchParams.invite_token) ?? firstValue(searchParams.token) ?? "";

  return (
    <section style={{ display: "grid", gap: 16, maxWidth: 680 }}>
      <Card>
        <div style={{ padding: 22 }}>
          <span className="badge">CircleBox Cloud</span>
          <h1 style={{ marginBottom: 8 }}>Create Your Account</h1>
          <p style={{ color: "var(--ink-soft)" }}>
            Create your account first. After signup, choose whether to create a new project or join an existing project with an invite token.
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
              Workspace Name (optional)
              <input name="organization_name" placeholder="Acme Mobile" style={{ width: "100%" }} />
            </label>
            <label>
              Invite Token (optional)
              <input
                name="invite_token"
                defaultValue={inviteToken}
                placeholder="paste_invite_token_if_you_have_one"
                style={{ width: "100%" }}
              />
            </label>
            <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: 13 }}>
              If you provide an invite token, you will join that workspace directly.
            </p>
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
