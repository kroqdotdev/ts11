import { APP_URL } from "@/lib/brand";
import { getPathname } from "./navigation";
import { routing, type Locale, type Pathname } from "./routing";

/** The pages search engines may index. Account and password pages are `noindex`, the rest is private. */
export const PUBLIC_PAGES = ["/", "/studio", "/privacy"] as const satisfies readonly Pathname[];

/** The full public URL of a page in one language. */
export function absoluteUrl(href: Pathname, locale: Locale): string {
  const path = getPathname({ href, locale });
  // The English home page is the bare domain, without a trailing slash.
  return path === "/" ? APP_URL : APP_URL + path;
}

/** Every language version of a page, keyed by hreflang, with the English one as x-default. */
export function languageUrls(href: Pathname): Record<string, string> {
  return {
    ...Object.fromEntries(routing.locales.map((l) => [l, absoluteUrl(href, l)])),
    "x-default": absoluteUrl(href, routing.defaultLocale),
  };
}
