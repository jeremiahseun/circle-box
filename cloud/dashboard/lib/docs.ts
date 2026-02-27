import { compileMDX } from "next-mdx-remote/rsc";
import path from "path";
import fs from "fs/promises";
import matter from "gray-matter";

// Components for MDX
import { CodeBlock } from "../components/code-block";

// Need to fix this component usage or ignore type check for the dynamic import logic inside Next.js scope
// The issue is likely how we are passing the component to MDXProvider or compileMDX.
// But wait, compileMDX takes components map.

const DOCS_PATH = path.join(process.cwd(), "content/docs");

export type DocSummary = {
  slug: string;
  title: string;
  description: string;
  order: number;
};

export async function getDocBySlug(slug: string) {
  const filePath = path.join(DOCS_PATH, `${slug}.mdx`);

  try {
    const fileContent = await fs.readFile(filePath, "utf8");
    const { content, data } = matter(fileContent);

    const { content: compiledContent } = await compileMDX({
      source: content,
      options: { parseFrontmatter: true },
      components: {
        // @ts-ignore
        pre: CodeBlock,
      },
    });

    return {
      slug,
      title: data.title,
      description: data.description,
      content: compiledContent,
    };
  } catch (error) {
    console.error("Error reading doc:", error);
    return null;
  }
}

export async function listDocSummaries(): Promise<DocSummary[]> {
  try {
    const files = await fs.readdir(DOCS_PATH);
    const docs = await Promise.all(
      files
        .filter((file) => file.endsWith(".mdx"))
        .map(async (file) => {
          const filePath = path.join(DOCS_PATH, file);
          const fileContent = await fs.readFile(filePath, "utf8");
          const { data } = matter(fileContent);
          return {
            slug: file.replace(".mdx", ""),
            title: data.title || file.replace(".mdx", ""),
            description: data.description || "",
            order: data.order || 999,
          };
        })
    );
    return docs.sort((a, b) => a.order - b.order);
  } catch (error) {
    console.error("Error listing docs:", error);
    return [];
  }
}
