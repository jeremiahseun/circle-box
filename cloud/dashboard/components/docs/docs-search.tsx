"use client";

import { useState, useMemo } from "react";
import { Card } from "../ui/card";

type DocSummary = {
  slug: string;
  title: string;
  description: string;
};

type DocsSearchProps = {
  docs: DocSummary[];
};

export function DocsSearch({ docs }: DocsSearchProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter(
      (doc) =>
        doc.title.toLowerCase().includes(q) ||
        doc.description.toLowerCase().includes(q) ||
        doc.slug.toLowerCase().includes(q),
    );
  }, [docs, query]);

  return (
    <>
      <div style={{ marginTop: "var(--space-4)", display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
        <div style={{ position: "relative", maxWidth: "400px", flex: 1 }}>
          <svg
            width="16" height="16"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--c-ink-faint)", pointerEvents: "none" }}
          >
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search documentation..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search documentation"
            style={{
              paddingLeft: "36px",
              maxWidth: "100%",
              background: "white",
              boxShadow: "var(--shadow-sm)",
            }}
          />
        </div>
        {query && (
          <button
            onClick={() => setQuery("")}
            className="btn btn-sm"
            style={{ padding: "6px 10px", color: "var(--c-ink-soft)" }}
            aria-label="Clear search"
          >
            Clear
          </button>
        )}
      </div>

      {query && (
        <p style={{ margin: "var(--space-4) 0 0", fontSize: "0.9rem", color: "var(--c-ink-soft)" }}>
          {filtered.length === 0
            ? `No results for "${query}"`
            : `${filtered.length} result${filtered.length !== 1 ? "s" : ""} for "${query}"`}
        </p>
      )}

      <div className="grid-3" style={{ gap: "var(--space-6)", marginTop: "var(--space-6)" }}>
        {filtered.map((doc) => (
          <a key={doc.slug} href={`/docs/${doc.slug}`} style={{ textDecoration: "none", color: "inherit", display: "block", height: "100%" }}>
            <Card className="doc-card" style={{ height: "100%", transition: "all var(--trans-base)" }}>
              <div style={{ padding: "var(--space-6)" }}>
                <h3 style={{
                  marginTop: 0,
                  marginBottom: "var(--space-2)",
                  fontSize: "1.25rem",
                  color: "var(--c-primary)",
                }}>
                  {doc.title}
                </h3>
                <p style={{
                  color: "var(--c-ink-soft)",
                  fontSize: "0.95rem",
                  lineHeight: "1.6",
                  marginBottom: "var(--space-4)",
                }}>
                  {doc.description}
                </p>
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: "var(--c-accent)",
                }}>
                  Read Guide &rarr;
                </span>
              </div>
            </Card>
          </a>
        ))}

        {filtered.length === 0 && (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "var(--space-12) 0", color: "var(--c-ink-soft)" }}>
            <p style={{ margin: 0 }}>Try a different search term, or <a href="/docs" onClick={() => setQuery("")} style={{ color: "var(--c-accent)" }}>browse all guides</a>.</p>
          </div>
        )}
      </div>

      <style>{`
        .doc-card:hover {
          transform: translateY(-4px);
          border-color: var(--c-accent);
          box-shadow: var(--shadow-lg);
        }
      `}</style>
    </>
  );
}
