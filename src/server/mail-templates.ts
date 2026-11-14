import "server-only";
import { createTranslator } from "next-intl";
import { isLocale, routing, type Locale } from "@/i18n/routing";
import { APP_NAME } from "@/lib/brand";
import { messages } from "../../messages";
import type { Mail } from "./mail";

/* Colours from the app's tokens, inlined: mail clients drop stylesheets. */
const INK = "#0d1a12";
const INK_SOFT = "#4b5b50";
const GRASS_DEEP = "#113520";
const CHALK = "#f2f5ef";
const PAPER = "#fbfcfa";
const CARD = "#f7c600";
const FONT = "Arial, Helvetica, sans-serif";

/** Escapes text for HTML, attributes included. */
function esc(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

interface Content {
  locale: Locale;
  subject: string;
  heading: string;
  body: string;
  button: string;
  footer: string;
  fallback: string;
}

/**
 * The language an email goes out in: that of the page that asked for it. The pages
 * pass a callback URL in their own language (/da/studio?verified=1,
 * /da/nulstil-adgangskode), and Better Auth puts it, URL-encoded, into the link it
 * hands us. Anything unreadable is English.
 */
export function linkLocale(url: string): Locale {
  let callback: string | null;
  try {
    callback = new URL(url, "http://localhost").searchParams.get("callbackURL");
  } catch {
    return routing.defaultLocale;
  }
  if (!callback) return routing.defaultLocale;
  let path: string;
  try {
    // Relative ("/da/konto") or absolute ("https://teamsheet11.com/da/konto").
    path = new URL(callback, "http://localhost").pathname;
  } catch {
    return routing.defaultLocale;
  }
  const first = path.split("/")[1]?.toLowerCase();
  return isLocale(first) ? first : routing.defaultLocale;
}

function content(kind: "verify" | "reset", locale: Locale): Content {
  const t = createTranslator({ locale, messages: messages[locale], namespace: "emails" });
  return {
    locale,
    subject: t(`${kind}.subject`, { app: APP_NAME }),
    heading: t(`${kind}.heading`),
    body: t(`${kind}.body`),
    button: t(`${kind}.button`),
    footer: t(`${kind}.footer`),
    fallback: t("fallback"),
  };
}

function html(c: Content, url: string): string {
  const href = esc(url);
  return `<!doctype html>
<html lang="${c.locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${esc(c.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${CHALK};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CHALK};">
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;width:100%;background:${PAPER};border:2px solid ${INK};border-collapse:separate;">
<tr><td style="background:${GRASS_DEEP};border-bottom:2px solid ${INK};padding:12px 24px;font-family:${FONT};font-size:18px;line-height:24px;font-weight:bold;color:#ffffff;">${esc(APP_NAME)}</td></tr>
<tr><td style="padding:28px 24px 8px;font-family:${FONT};color:${INK};">
<h1 style="margin:0 0 12px;font-size:22px;line-height:28px;font-weight:bold;color:${INK};">${esc(c.heading)}</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:22px;color:${INK};">${esc(c.body)}</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;">
<tr><td bgcolor="${CARD}" style="background:${CARD};border:2px solid ${INK};">
<a href="${href}" style="display:inline-block;padding:12px 20px;font-family:${FONT};font-size:15px;line-height:20px;font-weight:bold;color:${INK};text-decoration:none;">${esc(c.button)}</a>
</td></tr>
</table>
<p style="margin:24px 0 6px;font-size:13px;line-height:20px;color:${INK};">${esc(c.fallback)}</p>
<p style="margin:0 0 24px;font-size:13px;line-height:20px;word-break:break-all;"><a href="${href}" style="color:${GRASS_DEEP};word-break:break-all;">${href}</a></p>
</td></tr>
<tr><td style="padding:16px 24px 20px;border-top:1px solid #d2dbd1;font-family:${FONT};font-size:12px;line-height:18px;color:${INK_SOFT};">${esc(c.footer)}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function text(c: Content, url: string): string {
  return [c.heading, "", c.body, "", `${c.button}:`, url, "", c.footer, "", APP_NAME].join("\n");
}

function build(to: string, kind: "verify" | "reset", c: Content, url: string): Mail {
  return { to, kind, subject: c.subject, text: text(c, url), html: html(c, url) };
}

/**
 * The confirmation link sent after signing up with an email address. The language
 * comes from the link unless given.
 */
export function verifyEmail(to: string, url: string, locale: Locale = linkLocale(url)): Mail {
  return build(to, "verify", content("verify", locale), url);
}

/** The link to choose a new password, in the language of the page that asked for it. */
export function resetPassword(to: string, url: string, locale: Locale = linkLocale(url)): Mail {
  return build(to, "reset", content("reset", locale), url);
}
