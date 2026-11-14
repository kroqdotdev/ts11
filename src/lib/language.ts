import type { Language } from "./types";

/**
 * The interface language of the page, read from <html lang> (set by the [locale]
 * layout). For code outside React, such as the store. English on the server.
 */
export function pageLanguage(): Language {
  if (typeof document === "undefined") return "en";
  return document.documentElement.lang === "da" ? "da" : "en";
}

/** The language a club's graphics are printed in. */
export function graphicsLanguage(team: { language?: Language }): Language {
  return team.language === "da" ? "da" : "en";
}
