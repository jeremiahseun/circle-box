import { listDocSummaries } from "../../lib/docs";
import { SectionTitle } from "../../components/ui/section-title";
import { DocsSearch } from "../../components/docs/docs-search";

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
        <DocsSearch docs={docs} />
      </div>
    </section>
  );
}
