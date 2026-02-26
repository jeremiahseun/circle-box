import { Card } from "../../../../components/ui/card";
import { requireSession } from "../../../../lib/session";

type NewProjectPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function NewProjectPage({ searchParams = {} }: NewProjectPageProps) {
  await requireSession();
  const error = firstValue(searchParams.error);

  return (
    <section style={{ display: "grid", gap: 14, maxWidth: 720 }}>
      <Card>
        <div style={{ padding: 20 }}>
          <h1 style={{ marginBottom: 8 }}>Create Project</h1>
          <p style={{ margin: 0, color: "var(--ink-soft)" }}>
            Choose region based on data-residency needs. You can generate ingest keys immediately after create.
          </p>
        </div>
      </Card>

      <Card>
        <div style={{ padding: 20 }}>
          {error && (
            <p style={{ color: "var(--danger)" }}>
              Project create failed: <code>{error}</code>
            </p>
          )}
          <form action="/api/projects/create" method="POST" style={{ display: "grid", gap: 12 }}>
            <label>
              Project Name
              <input name="project_name" required placeholder="Acme Checkout" style={{ width: "100%" }} />
            </label>
            <label>
              Region
              <select name="region" defaultValue="us" style={{ width: "100%" }}>
                <option value="us">US</option>
                <option value="eu">EU</option>
              </select>
            </label>
            <button className="btn btn-primary" type="submit">
              Create Project
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
