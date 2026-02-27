import type { MetadataRoute } from "next";

const siteUrl = process.env.DASHBOARD_PUBLIC_BASE_URL?.trim() || "https://circlebox.seunjeremiah.workers.dev";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes = [
    "/",
    "/docs",
    "/pricing",
    "/signup",
    "/login",
  ];

  return routes.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
