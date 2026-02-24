import { notFound } from "next/navigation";
import { getDocBySlug, listDocSummaries } from "../../../lib/docs";
import { Card } from "../../../components/ui/card";

type DocPageProps = {
  params: {
    slug: string;
  };
};

export async function generateStaticParams() {
  const docs = await listDocSummaries();
  return docs.map((doc) => ({ slug: doc.slug }));
}

export default async function DocPage({ params }: DocPageProps) {
  const [doc, nav] = await Promise.all([getDocBySlug(params.slug), listDocSummaries()]);
  if (!doc) {
    notFound();
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <Card>
        <div style={{ padding: 18 }}>
          <span className="badge">Docs</span>
          <h1 style={{ marginBottom: 8 }}>{doc.title}</h1>
          <p style={{ margin: 0, color: "var(--ink-soft)" }}>{doc.description}</p>
        </div>
      </Card>

      <div className="docs-layout">
        <Card>
          <nav style={{ padding: 14 }}>
            <h3 style={{ marginTop: 0 }}>Guides</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {nav.map((entry) => (
                <li key={entry.slug} style={{ marginBottom: 8 }}>
                  <a href={`/docs/${entry.slug}`}>{entry.title}</a>
                </li>
              ))}
            </ul>
          </nav>
        </Card>

        <Card>
          <article className="prose" style={{ padding: 20 }}>
            {doc.content}
          </article>
        </Card>
      </div>
    </div>
  );
}
