import { defineRouting } from "next-intl/routing";

/**
 * English lives at the root (teamsheet11.com/studio), Danish under /da with Danish
 * paths (teamsheet11.com/da/konto). The first visit from a Danish browser is sent to
 * /da once; after that the choice in the language switch is remembered in a cookie.
 */
export const routing = defineRouting({
  locales: ["en", "da"],
  defaultLocale: "en",
  localePrefix: "as-needed",
  // Remembers the language for a year (the privacy page says so).
  localeCookie: { maxAge: 60 * 60 * 24 * 365 },
  pathnames: {
    "/": "/",
    "/studio": "/studio",
    "/account": { en: "/account", da: "/konto" },
    "/privacy": { en: "/privacy", da: "/privatliv" },
    "/reset-password": { en: "/reset-password", da: "/nulstil-adgangskode" },
    "/dev/graphics": "/dev/graphics",
  },
});

export type Locale = (typeof routing.locales)[number];
export type Pathname = keyof typeof routing.pathnames;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (routing.locales as readonly string[]).includes(value);
}

/** The BCP 47 tag used for dates and numbers. */
export const INTL_LOCALE: Record<Locale, string> = { en: "en-GB", da: "da-DK" };
