import { Card } from "../../../../components/ui/card";

type AcceptInvitePageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function AcceptInvitePage({ searchParams = {} }: AcceptInvitePageProps) {
  const token = firstValue(searchParams.token) ?? "";
  const error = firstValue(searchParams.error);
  const success = firstValue(searchParams.success);

  return (
    <section style={{ display: "grid", gap: 14, maxWidth: 720 }}>
      <Card>
        <div style={{ padding: 20 }}>
          <h1 style={{ marginBottom: 8 }}>Accept Invite</h1>
          <p style={{ margin: 0, color: "var(--ink-soft)" }}>
            Paste the invite token you received from a project owner.
          </p>
        </div>
      </Card>

      {error && (
        <Card>
          <div style={{ padding: 14, color: "var(--danger)" }}>
            Invite acceptance failed: <code>{error}</code>
          </div>
        </Card>
      )}
      {success && (
        <Card>
          <div style={{ padding: 14, color: "var(--accent-strong)" }}>
            Invite accepted: <code>{success}</code>
          </div>
        </Card>
      )}

      <Card>
        <div style={{ padding: 20 }}>
          <form action="/api/invites/accept" method="POST" style={{ display: "grid", gap: 12 }}>
            <label>
              Invite Token
              <input
                name="invite_token"
                required
                defaultValue={token}
                placeholder="paste_invite_token"
                style={{ width: "100%" }}
              />
            </label>
            <button className="btn btn-primary" type="submit">Accept Invite</button>
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
