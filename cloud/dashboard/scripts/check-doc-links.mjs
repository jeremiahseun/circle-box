import fs from "node:fs/promises";
import path from "node:path";

const rootDir = path.resolve(process.cwd());
const docsDir = path.join(rootDir, "content", "docs");
const fileNames = await fs.readdir(docsDir);
const docSlugs = new Set(fileNames.filter((name) => name.endsWith(".mdx")).map((name) => name.slice(0, -4)));

const markdownLinks = /\[[^\]]+\]\(([^)]+)\)/g;
const errors = [];

for (const fileName of fileNames) {
  if (!fileName.endsWith(".mdx")) {
    continue;
  }
  const source = await fs.readFile(path.join(docsDir, fileName), "utf8");
  let match;
  while ((match = markdownLinks.exec(source)) !== null) {
    const href = match[1];
    if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("mailto:")) {
      continue;
    }
    if (href.startsWith("/docs/")) {
      const slug = href.replace(/^\/docs\//, "").replace(/\/$/, "").split("?")[0].split("#")[0];
      if (slug.length > 0 && !docSlugs.has(slug)) {
        errors.push(`${fileName}: broken docs link -> ${href}`);
      }
      continue;
    }
    if (href.startsWith("/dashboard/") || href === "/") {
      continue;
    }
  }
}

if (errors.length > 0) {
  console.error("Broken documentation links detected:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`check-doc-links: OK (${docSlugs.size} docs scanned)`);
