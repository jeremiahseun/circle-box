import { listDocSummaries } from "../../lib/docs";
import { Card } from "../../components/ui/card";
import { SectionTitle } from "../../components/ui/section-title";

export default async function DocsIndexPage() {
  const docs = await listDocSummaries();

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <Card>
        <div style={{ padding: 20 }}>
          <SectionTitle
            eyebrow="Documentation"
            title="Developer Guides"
            subtitle="Setup CircleBox core SDKs, cloud uploaders, and optional adapters."
          />
        </div>
      </Card>

      <div className="grid-3">
        {docs.map((doc) => (
          <Card key={doc.slug}>
            <div style={{ padding: 18 }}>
              <h3 style={{ marginTop: 0 }}>
                <a href={`/docs/${doc.slug}`}>{doc.title}</a>
              </h3>
              <p style={{ color: "var(--ink-soft)" }}>{doc.description}</p>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
