# Accounts UI, pass 5: rebuild the rest from a plan

The privacy page, the two account emails and a few small pieces added while deploying were
written before any plan. This pass plans them first (this file, committed before any code), then
removes and rebuilds them from this plan, then checks them on screen. Base tokens, type and
principles: [accounts.md](accounts.md). Library picks: none needed beyond what's installed
(Phosphor icons, `Window`, `Wordmark`, `useAuthDialog`); no new dependencies.

## 1. `/privacy` (`src/app/privacy/page.tsx`)

**Layout.** Same shell as `/reset-password`: pixel-turf background, the wordmark top left on its
dark badge, an "Open the studio" button top right (the studio's secondary button look), then one
`Window` titled `privacy.txt`, max width about 42rem, body padding 20 to 32 px. Inside: an `h1`
"Privacy" in the signage font (about 40 px), sections with signage `h2`s (about 26 px), body
15 px, relaxed leading, ink-soft colour, links underlined in ink. Works at 390 px.

**Content** (facts the page must state, in plain words, sentence case, no em dashes):

- Date: last updated 13 November 2026.
- Without an account: clubs, squads, match details and images stay in the browser
  (localStorage) and are never received; graphics are made in the browser; no analytics,
  advertising or tracking cookies; fonts served from teamsheet11.com.
- Who runs it: enkelt.design, CVR 45871290, Denmark, is responsible (data controller); contact
  privacy@teamsheet11.com (use `OPERATOR` from `src/lib/legal.ts`).
- With an account it stores: email and name, a hashed password if used; with Google, the name,
  email and profile picture link Google shares; clubs, squads, match details and design settings;
  uploaded crests and photos; per session its start time, IP address and browser name, for
  security. Used only to provide the account (sign-in, saving clubs, the emails it needs:
  confirming the address, resetting the password). Not sold, no marketing, no newsletters.
  Legal basis: GDPR article 6(1)(b), and 6(1)(f) for security such as limiting sign-in attempts.
- Where: website, database and uploaded images on Hetzner servers in Germany; account emails via
  Amazon Web Services in Frankfurt, Germany; Google sign-in under Google's own policy. All act
  on instruction only. Uploaded images open for anyone with their exact long random link, so
  don't upload anything private.
- Cookies: one sign-in cookie, needed for the account, removed on sign-out; no others.
- Retention: until the account is deleted; deleting on the account page (link) removes the
  account, saved clubs and uploaded images at once; database backup copies go within three days;
  server logs (with IP addresses) are kept briefly for abuse and overwritten automatically.
- Rights: see, correct, download or delete, object; most on the account page, otherwise email,
  answered within a month; complaints to Datatilsynet (link https://www.datatilsynet.dk).
- Open source: link to the source code (`SOURCE_URL` from `src/lib/brand.ts`).

Metadata: title "Privacy", a one-sentence description.

## 2. Account emails (`src/server/mail-templates.ts`)

Keep the exports `verifyEmail(to, url)` and `resetPassword(to, url)` returning
`{ to, kind: "verify" | "reset", subject, text, html }` (the `Mail` type in `src/server/mail.ts`).

- HTML: table layout with inline styles only (Gmail, Outlook, Apple Mail), max width 520 px,
  outer background `#f2f5ef`, a card with a 2 px `#0d1a12` border; a `#113520` title strip
  reading "teamsheet11" in bold white; heading 22 px that names the action; one short paragraph;
  a button: `#f7c600` cell, 2 px ink border, bold ink text; under it "If the button doesn't work,
  paste this link into your browser:" and the raw link (`word-break: break-all`, colour
  `#113520`); a footer line in `#4b5b50` 12 px about expiry and what happens if it wasn't you.
  Escape every interpolated value. No images.
- Text version: the same words and the raw link.
- Verify: subject "Confirm your teamsheet11 email", heading "Confirm your email", button
  "Confirm email"; body says confirming makes the clubs save to the account and appear on every
  device; footer: link works for 24 hours, ignore if you didn't sign up and no account is kept.
- Reset: subject "Reset your teamsheet11 password", heading "Set a new password", button "Choose
  a new password"; body: someone asked to reset; footer: link works for one hour, ignore and the
  password stays the same.

## 3. Small pieces

- `/reset-password` page shell (`src/app/reset-password/page.tsx`): the same shell as `/privacy`
  minus the studio button; one `Window` titled `reset_password.exe`, max width 28rem, holding
  `<ResetPassword token linkError />` read from `searchParams` on the server inside `Suspense`.
- Landing footer links (`src/app/page.tsx`): after the tagline, a row of three quiet text links,
  "Source code" (`SOURCE_URL`), "Privacy" (`/privacy`), "Your account" (`/account`), chalk at 70%,
  underline on hover.
- Team menu (`src/components/studio/TeamMenu.tsx`): last item, after a separator, "Source code"
  with the Phosphor GitHub logo, opening `SOURCE_URL` in a new tab.
- Club setup (`src/components/studio/ClubSetup.tsx`): on the first-run setup only, when signed
  out, a quiet chalk text button "Already have an account? Sign in" left of "Try the example
  club", opening the sign-in dialog (`useAuthDialog().show("signin")`, with `<AuthDialog />`
  rendered in the header).

## Done when

`pnpm check`, `pnpm test`, `pnpm test:e2e` and `pnpm check:graphics` pass, and each item above is
captured on screen (privacy light and dark, 1280 px and 390 px; both emails at 640 px and 360 px;
reset shell; footer; team menu open; setup with the sign-in link), with results recorded below.

## Results

Built from this plan in `src/app/privacy/page.tsx`, `src/server/mail-templates.ts`,
`src/app/reset-password/page.tsx`, `src/app/page.tsx`, `src/components/studio/TeamMenu.tsx` and
`src/components/studio/ClubSetup.tsx`.

`pnpm check`, `pnpm test` (29 tests), `pnpm test:e2e` (sync, auth API, images) and
`pnpm check:graphics` (1,296 graphics, no faults) pass.

| Item                               | Result                      | Evidence                                                          |
| ---------------------------------- | --------------------------- | ----------------------------------------------------------------- |
| Privacy, dark, 1280 px             | Pass                        | [pass-5-privacy-1280-dark](screens/pass-5-privacy-1280-dark.webp) |
| Privacy, light, 390 px             | Pass                        | [pass-5-privacy-390-light](screens/pass-5-privacy-390-light.webp) |
| Verify email, 640 px               | Pass                        | [pass-5-mail-verify-640](screens/pass-5-mail-verify-640.webp)     |
| Reset email, 360 px                | Pass                        | [pass-5-mail-reset-360](screens/pass-5-mail-reset-360.webp)       |
| Reset password shell, dark, 390 px | Pass                        | [pass-5-reset-390-dark](screens/pass-5-reset-390-dark.webp)       |
| Landing footer links               | Pass                        | [pass-5-footer-1280](screens/pass-5-footer-1280.webp)             |
| Team menu "Source code"            | Pass                        | [pass-5-team-menu-1280](screens/pass-5-team-menu-1280.webp)       |
| Setup sign-in link, 390 px         | Pass, with the change below | [pass-5-setup-signin-390](screens/pass-5-setup-signin-390.webp)   |

Deviations:

- Under the `sm` breakpoint the setup link shows only "Sign in"; "Already have an account?" is
  kept for screen readers. The full label overflowed the header at 390 px.
- At 390 px "Try the example club" still wraps to two lines next to it. It wrapped before this
  pass too; left as is.
