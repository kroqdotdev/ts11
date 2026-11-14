import type { Metadata } from "next";
import { APP_NAME, APP_URL } from "@/lib/brand";
import { routing, type Locale, type Pathname } from "./routing";
import { absoluteUrl, languageUrls } from "./seo";

/** Canonical URL and the other-language versions of a page, for search engines. */
export function alternates(href: Pathname, locale: Locale): Metadata["alternates"] {
  return { canonical: absoluteUrl(href, locale), languages: languageUrls(href) };
}

const OG_LOCALE: Record<Locale, string> = { en: "en_GB", da: "da_DK" };

export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

/**
 * Open Graph and X card for a page. A page's `openGraph` replaces the layout's whole object,
 * so every page sets all of it. The picture (`src/app/og/[image]/route.tsx`) is the same on
 * every page, in the page's language; `imageAlt` describes it.
 */
export function sharing(
  href: Pathname,
  locale: Locale,
  title: string,
  description: string,
  imageAlt: string,
): Pick<Metadata, "openGraph" | "twitter"> {
  const image = {
    url: `${APP_URL}/og/${locale}.png`,
    ...OG_IMAGE_SIZE,
    type: "image/png",
    alt: imageAlt,
  };
  return {
    openGraph: {
      type: "website",
      siteName: APP_NAME,
      url: absoluteUrl(href, locale),
      title,
      description,
      locale: OG_LOCALE[locale],
      alternateLocale: routing.locales.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
      images: [image],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}
