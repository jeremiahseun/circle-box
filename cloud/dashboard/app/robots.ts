import type { MetadataRoute } from "next";

const siteUrl = process.env.DASHBOARD_PUBLIC_BASE_URL?.trim() || "https://circlebox.seunjeremiah.workers.dev";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/docs", "/pricing", "/signup", "/login"],
        disallow: ["/app/", "/dashboard/", "/api/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
