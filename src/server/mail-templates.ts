import "server-only";
import { APP_NAME } from "@/lib/brand";
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
  subject: string;
  heading: string;
  body: string;
  button: string;
  footer: string;
}

const FALLBACK = "If the button doesn't work, paste this link into your browser:";

function html(c: Content, url: string): string {
  const href = esc(url);
  return `<!doctype html>
<html lang="en">
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
<p style="margin:24px 0 6px;font-size:13px;line-height:20px;color:${INK};">${esc(FALLBACK)}</p>
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

/** The confirmation link sent after signing up with an email address. */
export function verifyEmail(to: string, url: string): Mail {
  return build(
    to,
    "verify",
    {
      subject: `Confirm your ${APP_NAME} email`,
      heading: "Confirm your email",
      body: "Confirm this address and your clubs save to your account, so they appear on every device you sign in on.",
      button: "Confirm email",
      footer:
        "This link works for 24 hours. If you didn't sign up, ignore this email and no account is kept.",
    },
    url,
  );
}

/** The link to choose a new password. */
export function resetPassword(to: string, url: string): Mail {
  return build(
    to,
    "reset",
    {
      subject: `Reset your ${APP_NAME} password`,
      heading: "Set a new password",
      body: "Someone asked to reset the password for your account. If it was you, choose a new one with the button below.",
      button: "Choose a new password",
      footer:
        "This link works for one hour. If you didn't ask for it, ignore this email and your password stays the same.",
    },
    url,
  );
}
