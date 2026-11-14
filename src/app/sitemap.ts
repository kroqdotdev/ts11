import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { absoluteUrl, languageUrls, PUBLIC_PAGES } from "@/i18n/seo";

/** Every public page in every language, each listing its other-language versions. */
export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PAGES.flatMap((href) =>
    routing.locales.map((locale) => ({
      url: absoluteUrl(href, locale),
      changeFrequency: href === "/privacy" ? "yearly" : "monthly",
      priority: href === "/" ? 1 : href === "/studio" ? 0.8 : 0.3,
      alternates: { languages: languageUrls(href) },
    })),
  );
}
