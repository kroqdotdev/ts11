# Accounts UI: design record

The design plan, library choices and pre-flight review for the account screens added in
November 2026: the sign-in dialog, account menu, sync status chip, confirm-email banner,
merge dialog, `/account` (storage and account), `/reset-password`, `/privacy` and the two
account emails. Keep this up to date when those screens change.

**How this was made, honestly.** The screens were built first, by two agents given a written brief
before they started: reuse the `Window` and `Dialog` components and the tokens in `globals.css`,
2px ink borders, hard offset shadows, the signage font for headings, plain sentence-case copy, and
check light, dark and a 390 px phone. This record was written afterwards: it states that brief as a
plan, reviews the result against it and the design-taste checklist, and lists what the review
changed. Treat it as the plan for future changes to these screens.

## Design read

Reading this as: account and storage screens inside an existing product, for club volunteers who
mostly want to get back to making a graphic, with the app's own lo-fi stadium language, leaning
toward the existing Tailwind tokens, Base UI primitives and Phosphor icons.

This is a **redesign, preserve** case. The visual language already exists; the account screens
have to look like they were always part of it, not like a bolted-on auth kit.

Dials (from the "redesign, preserve" row, adjusted for a tool rather than a marketing page):

| Dial               | Value | Why                                                                                       |
| ------------------ | ----- | ----------------------------------------------------------------------------------------- |
| `DESIGN_VARIANCE`  | 4     | Forms and lists people use, not a showcase. Matches the studio.                           |
| `MOTION_INTENSITY` | 3     | Motion only as feedback: dialog open, the storage number counting down, the status blink. |
| `VISUAL_DENSITY`   | 5     | Same rhythm as the studio panels.                                                         |

## Design plan (frontend-design)

**Subject and job.** A grassroots club volunteer, often on a phone, often at the ground. The
account exists so their club is on every device; the screens have one job each and get out of
the way. Signed out must keep working exactly as before.

**Colour** (existing tokens in `src/app/globals.css`, no new ones):

| Token          | Light     | Role here                                                        |
| -------------- | --------- | ---------------------------------------------------------------- |
| `--grass-deep` | `#113520` | Window title bars, page headers                                  |
| `--paper`      | `#fbfcfa` | Window bodies, dialog body                                       |
| `--ink`        | `#0d1a12` | Text, 2px outlines, hard shadows                                 |
| `--card`       | `#f7c600` | The one accent: primary buttons, the confirm-email banner, focus |
| `--danger`     | `#c81f33` | Delete account, storage full                                     |

The yellow card is the only accent, used for "do this next" (the primary action, the banner).
Red only appears for something destructive or a hard limit.

**Type.** The existing pair: Jersey 10 (`font-signage`) for window titles and page headings,
Archivo for everything else. No new faces.

**Layout.** Everything lives in the existing `Window` (title bar, 2px ink border, 6px hard offset
shadow) or the existing `Dialog`. The account page is two columns on desktop and one on phones:

```
desktop                                   phone
+---------------------------+ +--------+  +-----------+
| Storage (meter, numbers)  | |Account |  | Storage   |
+---------------------------+ +--------+  +-----------+
| Your images (grid)        | |Delete  |  | Images    |
|                           | |account |  | Account   |
+---------------------------+ +--------+  | Delete    |
                                          +-----------+
```

Left aligned throughout; window titles name the thing ("Storage", "Your images"), not a
category label.

**Principles.**

1. One memorable thing: the storage meter is a row of pixel blocks that fill (yellow past 80%, red
   when full), with the number counting down when an image is deleted. Everything else is quiet.
2. Say what happens: buttons are verbs ("Send reset link", "Delete account"), errors say what to
   do next, and nothing apologises.
3. Never imply data loss: every destructive action names what goes and what stays ("this browser
   keeps its copy").
4. Signed-out first: account UI is a quiet "Sign in" until someone wants it.

**Review against the brief** (what would be the generic default, and what was chosen instead):

- A centred card on a gradient with a logo above is the default auth page. Instead: a dialog over
  the screen the person was on, in the app's own window style, so signing in doesn't take them
  away from their club.
- The default storage page is a smooth progress bar on a grey track. That is also on the
  design-taste ban list. Instead: discrete pixel blocks, the same language as the stadium LED
  boards.
- The default sync indicator is a spinner. Instead: a blinking pixel and a word ("Saving…",
  "Saved").

## Library choices (pick-ui-library)

From the curated list, all already in the project:

| Need                     | Library    | Where                                                                           |
| ------------------------ | ---------- | ------------------------------------------------------------------------------- |
| Dialogs, menus, popovers | Base UI    | `AuthDialog`, `AccountButton`, `SyncChip` popover, delete confirmations         |
| Toasts                   | Sonner     | Signed in or out, image deleted, account deleted                                |
| Animating a number       | NumberFlow | The storage readout (`StorageMeter.tsx`); it respects reduced motion by default |
| Shared state             | zustand    | `useAuthDialog`, `useSyncState`                                                 |
| Conditional classes      | clsx       | Throughout                                                                      |

Not used, on purpose:

- input-otp: verification is a link, not a code.
- motion: CSS transitions are enough here, per the list's own guidance for simple fades.

Outside the curated list (server-side, so the list doesn't cover them): Better Auth
(sign-in), Drizzle ORM with better-sqlite3 (database), sharp (image checks), aws4fetch (S3 and
SES) and zod (request validation).

## Pre-flight (design-taste-frontend, section 14)

Checked on 14 November 2026, then rechecked after the measurements below. Many items are written for landing pages; those are marked n/a. The
mechanical checks are a search over `src/components/account`, `src/components/sync`,
`src/app/account`, `src/app/reset-password`, `src/app/privacy` and `src/server/mail-templates.ts`.

| Check                                | Result                                                                                                                                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Design read declared                 | Pass: above                                                                                                                                                                                |
| Dials explicit and reasoned          | Pass: above                                                                                                                                                                                |
| Design system chosen honestly        | Pass: the project's own tokens and Base UI, no second system                                                                                                                               |
| Redesign mode and audit              | Pass: preserve; tokens, type and components reused                                                                                                                                         |
| Zero em or en dashes in visible text | Pass: none found                                                                                                                                                                           |
| One theme per page                   | Pass: light and dark follow the system, no section flips                                                                                                                                   |
| One accent colour                    | Pass: `--card` only; `--danger` is reserved for destructive actions and hard limits                                                                                                        |
| One corner system                    | Pass: 4px on windows, inputs and buttons, as in the studio; no pills or large radii                                                                                                        |
| Button contrast (AA)                 | Pass: ink on card 11.1:1; paper on danger 5.5:1 light, 6.5:1 dark                                                                                                                          |
| No wrapped CTA labels on desktop     | Pass: checked in screenshots at 1440 and 1280 px                                                                                                                                           |
| Form contrast                        | Pass: 2px ink input borders; helper text ink-soft on paper 7.0:1; focus ring is the global two-tone ring                                                                                   |
| Serif discipline                     | Pass: no serif                                                                                                                                                                             |
| Premium-consumer palette             | n/a                                                                                                                                                                                        |
| Italic descender clearance           | n/a: no italic display type                                                                                                                                                                |
| Hero rules (fits, padding, stack)    | n/a: no hero                                                                                                                                                                               |
| Eyebrow count                        | Pass: none; the only uppercase is the avatar initial                                                                                                                                       |
| Split-header ban                     | Pass: headings stack above their text                                                                                                                                                      |
| Zigzag cap, logo wall, bento         | n/a                                                                                                                                                                                        |
| No duplicate CTA intent              | Pass: one "Sign in" entry per surface; the confirm-email chip was removed because the banner already says it                                                                               |
| Copy self-audit                      | Pass: every string re-read; fixed "Waiting for you" (now "Choose what to keep") and two differently worded sign-out toasts                                                                 |
| Motion motivated                     | Pass: dialog open (state change), NumberFlow count (feedback on delete), status blink (live state)                                                                                         |
| No scroll listeners                  | Pass                                                                                                                                                                                       |
| Reduced motion respected             | Pass: the blink is `motion-safe` only, NumberFlow follows the setting, global reduced-motion block in `globals.css`                                                                        |
| Dark mode tested                     | Pass: dialog, account page, banner and privacy page captured in both themes                                                                                                                |
| Mobile collapse explicit             | Pass: one column below `lg`, captured at 390 px (screens/account-states-phone.webp); dialog and banner reflow (screens/signin-dialog-and-reset.webp)                                       |
| `min-h-dvh`, never `h-screen`        | Pass                                                                                                                                                                                       |
| Empty, loading and error states      | Pass: all four captured on a phone, from left: empty, loading skeleton, error with retry, filled (screens/account-states-phone.webp)                                                       |
| Icons from one library               | Pass: Phosphor only                                                                                                                                                                        |
| No generic spinners                  | Pass: the sync chip's spinner was replaced by the pixel blink                                                                                                                              |
| Decorative status dots               | Pass: the only dot is the sync blink, which shows real state                                                                                                                               |
| Long lists                           | Pass: images are a card grid with sort controls, not a ruled list                                                                                                                          |
| Progress bars with grey tracks       | Pass: the storage meter is discrete blocks without a track                                                                                                                                 |
| Core Web Vitals                      | Partial: see the measurements below. CLS 0 and TBT under 300 ms everywhere; LCP passes on `/privacy` but not on `/account` or `/reset-password` under Lighthouse's throttled phone profile |

## Measurements

Lighthouse 12.8.2 against teamsheet11.com, mobile profile (simulated slow 4G and a 4x slower CPU),
14 November 2026, best of two runs:

| Page                       | Performance | Accessibility | Best practices | FCP   | LCP   | CLS  | TBT    |
| -------------------------- | ----------- | ------------- | -------------- | ----- | ----- | ---- | ------ |
| `/privacy`                 | 98          | 100           | 100            | 0.9 s | 2.2 s | 0    | 90 ms  |
| `/account` (signed out)    | 92          | 100           | 100            | 1.2 s | 2.7 s | 0    | 230 ms |
| `/reset-password`          | 86          | 100           | 100            | 1.3 s | 3.0 s | 0    | 290 ms |
| `/studio` (for comparison) | 74          | 100           | 100            | 1.2 s | 4.8 s | 0.09 | 270 ms |

What changed because of these numbers:

- The account sync code (auth client, sync engine, merge dialog, about 250 KB) used to load on
  every page; it now loads after the page is interactive. `/privacy` went from LCP 3.5 s to 2.2 s.
- The logo link no longer prefetches the home page (91 KB) on every page.
- `/account` checks the session on the server and `/reset-password` reads its token on the server,
  so their content is in the first HTML instead of appearing after the scripts run.

What's left: on these pages the largest text paints immediately (unthrottled, LCP equals first
paint at about 0.3 s), but in the simulated slow-4G profile it waits on the 89 KB variable Archivo
font. That font's width axis drives the condensed type in the graphics, so it stays for now.
Serving the app chrome a smaller static cut of Archivo is the next step if this needs to go lower.

Accessibility scored 100 on every account page. The one failure Lighthouse found on the site was on
the home page, inside a sample graphic (white text on a gold Halves panel); that belongs to the
graphics, not to these screens.

## Screens

- Phone, from left: empty, loading, error, with images: [account-states-phone.webp](screens/account-states-phone.webp)
- Desktop, dark: [account-desktop-dark.webp](screens/account-desktop-dark.webp)
- Sign-in dialog (dark desktop, light phone) and the reset page: [signin-dialog-and-reset.webp](screens/signin-dialog-and-reset.webp)
- Studio while the email isn't confirmed: [studio-confirm-email.webp](screens/studio-confirm-email.webp)

## Accessibility notes

- Dialogs trap focus and close on Escape (Base UI); labels sit above inputs and are bound to them.
- Errors are announced (`role="alert"`), and the sync chip is a polite live region.
- Destructive dialogs need a deliberate step: typing DELETE, plus the password for password
  accounts.
