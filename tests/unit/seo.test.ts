import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

describe("sitemap", () => {
  const entries = sitemap();
  const urls = entries.map((e) => e.url);

  it("lists every public page in both languages, with their Danish paths", () => {
    expect(urls).toEqual([
      "https://teamsheet11.com",
      "https://teamsheet11.com/da",
      "https://teamsheet11.com/studio",
      "https://teamsheet11.com/da/studio",
      "https://teamsheet11.com/privacy",
      "https://teamsheet11.com/da/privatliv",
    ]);
  });

  it("leaves out pages that say noindex", () => {
    expect(urls.some((u) => /account|konto|password|adgangskode|dev/.test(u))).toBe(false);
  });

  it("links each page to its other language", () => {
    const privacy = entries.find((e) => e.url.endsWith("/da/privatliv"));
    expect(privacy?.alternates?.languages).toEqual({
      en: "https://teamsheet11.com/privacy",
      da: "https://teamsheet11.com/da/privatliv",
      "x-default": "https://teamsheet11.com/privacy",
    });
  });
});

describe("robots", () => {
  it("points at the sitemap and keeps crawlers out of the API", () => {
    const r = robots();
    expect(r.sitemap).toBe("https://teamsheet11.com/sitemap.xml");
    expect(r.rules).toMatchObject({ userAgent: "*", allow: "/" });
    expect(Array.isArray(r.rules) ? [] : r.rules.disallow).toContain("/api/");
  });
});
