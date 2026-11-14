import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { APP_NAME } from "@/lib/brand";
import { alternates, sharing } from "./metadata";
import { isLocale, routing, type Locale, type Pathname } from "./routing";

/** Reads the [locale] segment and makes it the locale for this render. */
export async function pageLocale(params: Promise<{ locale: string }>): Promise<Locale> {
  const { locale } = await params;
  const l = isLocale(locale) ? locale : routing.defaultLocale;
  setRequestLocale(l);
  return l;
}

type MetaKey = "studio" | "account" | "resetPassword" | "privacy";

/** Title, description and language alternates for a page, from the `meta` messages. */
export async function pageMetadata(
  params: Promise<{ locale: string }>,
  key: MetaKey,
  href: Pathname,
  extra: Metadata = {},
): Promise<Metadata> {
  const { locale } = await params;
  const l = isLocale(locale) ? locale : routing.defaultLocale;
  const t = await getTranslations({ locale: l, namespace: "meta" });
  const title = t(`${key}.title`);
  const description = t(`${key}.description`, { app: APP_NAME });
  return {
    title,
    description,
    alternates: alternates(href, l),
    ...sharing(href, l, `${title} | ${APP_NAME}`, description, t("home.title", { app: APP_NAME })),
    ...extra,
  };
}
