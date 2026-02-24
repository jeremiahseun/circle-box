import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import type { ReactNode } from "react";

export type DocSummary = {
  slug: string;
  title: string;
  description: string;
  order: number;
};

export type DocPage = DocSummary & {
  content: ReactNode;
};

const DOCS_DIR = path.join(process.cwd(), "content", "docs");

export async function listDocSummaries(): Promise<DocSummary[]> {
  const entries = await fs.readdir(DOCS_DIR, { withFileTypes: true });
  const docs = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".mdx"))
      .map(async (entry) => {
        const slug = entry.name.replace(/\.mdx$/, "");
        const source = await fs.readFile(path.join(DOCS_DIR, entry.name), "utf8");
        const parsed = matter(source);
        return toSummary(slug, parsed.data);
      }),
  );
  return docs.sort((left, right) => left.order - right.order || left.slug.localeCompare(right.slug));
}

export async function getDocBySlug(slug: string): Promise<DocPage | null> {
  const filePath = path.join(DOCS_DIR, `${slug}.mdx`);
  let source: string;
  try {
    source = await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }

  const parsed = matter(source);
  const summary = toSummary(slug, parsed.data);
  const compiled = await compileMDX({
    source: parsed.content,
    options: {
      mdxOptions: {
        remarkPlugins: [remarkGfm],
      },
    },
  });

  return {
    ...summary,
    content: compiled.content,
  };
}

function toSummary(slug: string, data: Record<string, unknown>): DocSummary {
  return {
    slug,
    title: asString(data.title) ?? slugToTitle(slug),
    description: asString(data.description) ?? "CircleBox guide",
    order: asNumber(data.order) ?? 999,
  };
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map((chunk) => `${chunk.charAt(0).toUpperCase()}${chunk.slice(1)}`)
    .join(" ");
}
