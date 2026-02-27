import { Card } from "../../components/ui/card";

type LoginPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function LoginPage({ searchParams = {} }: LoginPageProps) {
  const error = firstValue(searchParams.error);

  return (
    <section style={{ display: "grid", gap: 16, maxWidth: 620 }}>
      <Card>
        <div style={{ padding: 22 }}>
          <span className="badge">CircleBox Cloud</span>
          <h1 style={{ marginBottom: 8 }}>Sign In</h1>
          <p style={{ color: "var(--ink-soft)", marginBottom: 0 }}>
            No account yet? <a href="/signup">Create one</a>. Have an invite token? Add it during signup or on onboarding after sign in.
          </p>
        </div>
      </Card>

      <Card>
        <div style={{ padding: 20 }}>
          {error && (
            <p style={{ color: "var(--danger)" }}>
              Login failed: <code>{error}</code>
            </p>
          )}

          <form action="/api/auth/login" method="POST" style={{ display: "grid", gap: 12 }}>
            <label>
              Email
              <input name="email" type="email" required placeholder="you@company.com" style={{ width: "100%" }} />
            </label>
            <label>
              Password
              <input name="password" type="password" required style={{ width: "100%" }} />
            </label>
            <button className="btn btn-primary" type="submit">
              Continue
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
