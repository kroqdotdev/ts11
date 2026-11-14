import { describe, expect, it } from "vitest";
import { linkLocale, resetPassword, verifyEmail } from "@/server/mail-templates";

const BASE = "https://teamsheet11.com/api/auth";
const verify = (callback: string) =>
  `${BASE}/verify-email?token=abc&callbackURL=${encodeURIComponent(callback)}`;
const reset = (callback: string) =>
  `${BASE}/reset-password/tok123?callbackURL=${encodeURIComponent(callback)}`;

describe("email language", () => {
  it("follows the language of the page that asked", () => {
    expect(linkLocale(verify("/da/studio?verified=1"))).toBe("da");
    expect(linkLocale(verify("/da"))).toBe("da");
    expect(linkLocale(verify("/da?verified=1"))).toBe("da");
    expect(linkLocale(reset("/da/nulstil-adgangskode"))).toBe("da");
    expect(linkLocale(reset("https://teamsheet11.com/da/konto"))).toBe("da");
  });

  it("is English for English pages and anything unreadable", () => {
    expect(linkLocale(verify("/studio?verified=1"))).toBe("en");
    expect(linkLocale(reset("/reset-password"))).toBe("en");
    expect(linkLocale(verify("/"))).toBe("en");
    expect(linkLocale(verify("/dansk"))).toBe("en");
    expect(linkLocale(verify("/data/da"))).toBe("en");
    expect(linkLocale(`${BASE}/reset-password/tok?callbackURL=`)).toBe("en");
    expect(linkLocale(`${BASE}/verify-email?token=abc`)).toBe("en");
    expect(linkLocale("not a url at all %%%")).toBe("en");
  });

  it("writes the Danish emails in Danish, with the same link", () => {
    const url = verify("/da/studio?verified=1");
    const v = verifyEmail("a@example.org", url);
    expect(v.subject).toBe("Bekræft din e-mail til teamsheet11");
    expect(v.text).toContain(url);
    expect(v.text.match(/https?:\/\/\S+/)?.[0]).toBe(url);
    expect(v.html).toContain('<html lang="da">');
    const r = resetPassword("a@example.org", reset("/da/nulstil-adgangskode"));
    expect(r.subject).toMatch(/adgangskode/);
    expect(r.html).toContain("Vælg ny adgangskode");
  });

  it("keeps English emails as they were", () => {
    const v = verifyEmail("a@example.org", verify("/studio?verified=1"));
    expect(v.subject).toBe("Confirm your teamsheet11 email");
    expect(v.html).toContain('<html lang="en">');
    const r = resetPassword("a@example.org", reset("/reset-password"));
    expect(r.subject).toBe("Reset your teamsheet11 password");
  });
});
