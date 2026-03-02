import { notFound } from "next/navigation";
import { getDocBySlug, listDocSummaries } from "../../../lib/docs";
import { DocSidebar } from "../../../components/doc-sidebar";
import { Card } from "../../../components/ui/card";
import "../docs.css"; // Import docs specific CSS

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

  // Calculate Next/Prev links
  const currentIndex = nav.findIndex(item => item.slug === params.slug);
  const prevDoc = currentIndex > 0 ? nav[currentIndex - 1] : null;
  const nextDoc = currentIndex < nav.length - 1 ? nav[currentIndex + 1] : null;

  return (
    <div className="doc-layout-grid">
      {/* Sidebar for Desktop / Collapsible for Mobile */}
      <DocSidebar items={nav} currentSlug={params.slug} />

      <div className="doc-content">
        <Card>
          <article className="prose" style={{ padding: "var(--space-6)" }}>
            <span className="badge badge-primary" style={{ marginBottom: "var(--space-4)" }}>Docs</span>
            <h1 style={{ marginBottom: "var(--space-2)" }}>{doc.title}</h1>
            <p style={{ fontSize: "1.1rem", color: "var(--c-ink-soft)", borderBottom: "1px solid var(--c-border)", paddingBottom: "var(--space-6)", marginBottom: "var(--space-6)" }}>
              {doc.description}
            </p>

            {doc.content}

            {/* Next / Previous Navigation */}
            <div className="article-nav">
              {prevDoc ? (
                <a href={`/docs/${prevDoc.slug}`} className="nav-card">
                  <small>Previous</small>
                  <span>&larr; {prevDoc.title}</span>
                </a>
              ) : <div />} {/* Spacer if no prev */}

              {nextDoc ? (
                <a href={`/docs/${nextDoc.slug}`} className="nav-card" style={{ textAlign: "right", alignItems: "flex-end" }}>
                  <small>Next</small>
                  <span>{nextDoc.title} &rarr;</span>
                </a>
              ) : null}
            </div>
          </article>
        </Card>
      </div>
    </div>
  );
}
