import type { Mail } from "./mail";

/**
 * Plain, robust emails in the teamsheet11 colours: grass green header strip,
 * paper body, a yellow-card button. Inline styles only, table layout, so they
 * render the same in Gmail, Outlook and Apple Mail.
 */
const C = {
  grass: "#113520",
  paper: "#f2f5ef",
  ink: "#0d1a12",
  card: "#f7c600",
  muted: "#4b5b50",
};

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function layout(opts: {
  heading: string;
  body: string[];
  button: string;
  url: string;
  foot: string;
}) {
  const paras = opts.body
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font-size:16px;line-height:1.5;color:${C.ink}">${escape(p)}</p>`,
    )
    .join("");
  return `<!doctype html><html><body style="margin:0;padding:0;background:${C.paper}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.paper}">
<tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:2px solid ${C.ink}">
<tr><td style="background:${C.grass};padding:12px 20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;letter-spacing:.5px">teamsheet11</td></tr>
<tr><td style="padding:24px 20px 8px;font-family:Arial,Helvetica,sans-serif">
<h1 style="margin:0 0 14px;font-size:22px;line-height:1.25;color:${C.ink}">${escape(opts.heading)}</h1>
${paras}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 18px"><tr>
<td style="background:${C.card};border:2px solid ${C.ink}">
<a href="${escape(opts.url)}" style="display:inline-block;padding:12px 20px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:${C.ink};text-decoration:none">${escape(opts.button)}</a>
</td></tr></table>
<p style="margin:0 0 14px;font-size:13px;line-height:1.5;color:${C.muted}">If the button doesn't work, paste this link into your browser:<br><a href="${escape(opts.url)}" style="color:${C.grass};word-break:break-all">${escape(opts.url)}</a></p>
</td></tr>
<tr><td style="padding:12px 20px 18px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:${C.muted};border-top:2px solid ${C.paper}">${escape(opts.foot)}</td></tr>
</table></td></tr></table></body></html>`;
}

function text(opts: { heading: string; body: string[]; url: string; foot: string }) {
  return [opts.heading, "", ...opts.body, "", opts.url, "", opts.foot, "", "teamsheet11.com"].join(
    "\n",
  );
}

export function verifyEmail(to: string, url: string): Mail {
  const content = {
    heading: "Confirm your email",
    body: [
      "You made a teamsheet11 account. Confirm this address and your clubs start saving to it, so they're there on every device you sign in on.",
    ],
    button: "Confirm email",
    url,
    foot: "The link works for 24 hours. If you didn't sign up, ignore this email and no account is kept in your name.",
  };
  return {
    to,
    kind: "verify",
    subject: "Confirm your teamsheet11 email",
    html: layout(content),
    text: text(content),
  };
}

export function resetPassword(to: string, url: string): Mail {
  const content = {
    heading: "Set a new password",
    body: [
      "Someone asked to reset the password for this teamsheet11 account. If that was you, choose a new one below.",
    ],
    button: "Choose a new password",
    url,
    foot: "The link works for one hour. If you didn't ask for this, ignore this email; your password stays the same.",
  };
  return {
    to,
    kind: "reset",
    subject: "Reset your teamsheet11 password",
    html: layout(content),
    text: text(content),
  };
}
