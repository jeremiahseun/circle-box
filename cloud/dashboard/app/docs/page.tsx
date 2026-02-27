import { listDocSummaries } from "../../lib/docs";
import { Card } from "../../components/ui/card";
import { SectionTitle } from "../../components/ui/section-title";

export default async function DocsIndexPage() {
  const docs = await listDocSummaries();

  return (
    <section>
      <div style={{
        marginBottom: "var(--space-8)",
        borderBottom: "1px solid var(--c-border)",
        paddingBottom: "var(--space-6)"
      }}>
        <SectionTitle
          eyebrow="Documentation"
          title="Developer Guides"
          subtitle="Setup CircleBox core SDKs, cloud uploaders, and optional adapters."
        />
        <div style={{ marginTop: "var(--space-4)", display: "flex", gap: "var(--space-2)" }}>
           <input
             type="text"
             placeholder="Search documentation..."
             style={{
               maxWidth: "400px",
               background: "white",
               boxShadow: "var(--shadow-sm)"
             }}
           />
        </div>
      </div>

      <div className="grid-3" style={{ gap: "var(--space-6)" }}>
        {docs.map((doc) => (
          <a key={doc.slug} href={`/docs/${doc.slug}`} style={{ textDecoration: "none", color: "inherit", display: "block", height: "100%" }}>
            <Card className="doc-card" style={{ height: "100%", transition: "all var(--trans-base)" }}>
              <div style={{ padding: "var(--space-6)" }}>
                <h3 style={{
                  marginTop: 0,
                  marginBottom: "var(--space-2)",
                  fontSize: "1.25rem",
                  color: "var(--c-primary)"
                }}>
                  {doc.title}
                </h3>
                <p style={{
                  color: "var(--c-ink-soft)",
                  fontSize: "0.95rem",
                  lineHeight: "1.6",
                  marginBottom: "var(--space-4)"
                }}>
                  {doc.description}
                </p>
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: "var(--c-accent)"
                }}>
                  Read Guide &rarr;
                </span>
              </div>
            </Card>
          </a>
        ))}
      </div>

      <style>{`
        .doc-card:hover {
          transform: translateY(-4px);
          border-color: var(--c-accent);
          box-shadow: var(--shadow-lg);
        }
      `}</style>
    </section>
  );
}
