import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/brand";

/*
 * Crawl everything but the API and the dev-only pages. The account and reset-password pages
 * stay crawlable on purpose: they say `noindex`, and a crawler has to fetch them to see it.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/dev/", "/da/dev/"] },
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
