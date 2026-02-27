import { Card } from "../../components/ui/card";

type LoginPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function LoginPage({ searchParams = {} }: LoginPageProps) {
  const error = firstValue(searchParams.error);

  return (
    <section style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "60vh",
      gap: "var(--space-6)"
    }}>
      <div style={{ textAlign: "center", maxWidth: "480px" }}>
        <div style={{
          width: "48px",
          height: "48px",
          background: "var(--c-primary)",
          borderRadius: "var(--radius-md)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto var(--space-4)",
          color: "white"
        }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
        </div>
        <h1 style={{ marginBottom: "var(--space-2)", fontSize: "2rem" }}>Welcome back</h1>
        <p style={{ color: "var(--c-ink-soft)", marginBottom: 0 }}>
          Enter your details to access your workspace.
        </p>
      </div>

      <Card className="login-card" style={{ width: "100%", maxWidth: "440px" }}>
        <div style={{ padding: "var(--space-8)" }}>
          {error && (
            <div style={{
              background: "var(--c-danger-bg)",
              color: "var(--c-danger)",
              padding: "var(--space-3)",
              borderRadius: "var(--radius-sm)",
              marginBottom: "var(--space-4)",
              fontSize: "0.9rem",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{decodeURIComponent(error)}</span>
            </div>
          )}

          <form action="/api/auth/login" method="POST" style={{ display: "grid", gap: "var(--space-4)" }}>
            <label>
              Email address
              <input
                name="email"
                type="email"
                required
                placeholder="name@company.com"
                autoComplete="email"
                style={{ width: "100%", marginTop: "4px" }}
              />
            </label>
            <label>
              Password
              <div style={{ position: "relative" }}>
                  <input
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    style={{ width: "100%", marginTop: "4px" }}
                  />
              </div>
            </label>

            <button className="btn btn-primary" type="submit" style={{
              marginTop: "var(--space-2)",
              padding: "var(--space-3)",
              fontSize: "1rem"
            }}>
              Sign In
            </button>
          </form>

          <div style={{
            marginTop: "var(--space-6)",
            paddingTop: "var(--space-6)",
            borderTop: "1px solid var(--c-border)",
            textAlign: "center",
            fontSize: "0.9rem",
            color: "var(--c-ink-soft)"
          }}>
            Don't have an account? <a href="/signup" style={{ fontWeight: 600 }}>Create one now</a>
          </div>
        </div>
      </Card>

      <p style={{ fontSize: "0.85rem", color: "var(--c-ink-faint)", textAlign: "center", maxWidth: "400px" }}>
        By signing in, you agree to our Terms of Service and Privacy Policy.
      </p>
    </section>
  );
}

function firstValue(input: string | string[] | undefined): string | undefined {
  if (typeof input === "string") {
    return input;
  }
  return Array.isArray(input) ? input[0] : undefined;
}
