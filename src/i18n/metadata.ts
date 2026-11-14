import type { Metadata } from "next";
import { APP_URL } from "@/lib/brand";
import { getPathname } from "./navigation";
import { routing, type Locale, type Pathname } from "./routing";

/** Canonical URL and the other-language versions of a page, for search engines. */
export function alternates(href: Pathname, locale: Locale): Metadata["alternates"] {
  const url = (l: Locale) => APP_URL + getPathname({ href, locale: l });
  return {
    canonical: url(locale),
    languages: {
      ...Object.fromEntries(routing.locales.map((l) => [l, url(l)])),
      "x-default": url(routing.defaultLocale),
    },
  };
}
