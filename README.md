# teamsheet11

Free match day graphics for grassroots football clubs: [teamsheet11.com](https://teamsheet11.com).

Make a starting XI, team news, matchday, goal, half-time, full-time and player-of-the-match post
in a few minutes, and download it as a PNG ready for Instagram, X or the club WhatsApp. No
watermark, no sign-up needed.

teamsheet11 is open source under the [GNU AGPL 3.0](LICENSE). Contributions are welcome: see
[CONTRIBUTING.md](CONTRIBUTING.md).

## What it does

Nine graphics Nine graphics (matchday, starting XI, pitch, goal, half time, substitutions, full time, player of the match,
fixtures/results), four sizes and nine styles, including two low-fi ones (Pixel and Stadium). A first-run setup builds the club
(name, crest, colours, squad). Everything works in the browser (localStorage) without an account;
an optional account (Google or email + password) saves clubs and images to the server and keeps
devices in step.

## Getting started

You need Node 24 and pnpm 11.

```sh
pnpm install
cp .env.example .env.local   # then set BETTER_AUTH_SECRET (openssl rand -hex 32)
pnpm dev                     # http://localhost:3000
```

Without Google, SES or S3 settings everything still works locally: verification and reset emails
are written to `data/dev/outbox/`, images to `data/dev/objects/`, and the database is
`data/teamsheet11.db`.

## Scripts

| Command               | What it does                                                    |
| --------------------- | --------------------------------------------------------------- |
| `pnpm dev`            | Dev server on http://localhost:3000                             |
| `pnpm build`          | Production build                                                |
| `pnpm typecheck`      | Generates route types, then `tsc --noEmit`                      |
| `pnpm lint`           | ESLint (Next core-web-vitals + TS, Prettier)                    |
| `pnpm format`         | Prettier write (with Tailwind class sorting)                    |
| `pnpm format:check`   | Prettier check                                                  |
| `pnpm check`          | typecheck + lint + format:check                                 |
| `pnpm test`           | Unit tests (Vitest): sync merging, server rules, images, mail   |
| `pnpm test:e2e`       | Browser tests against a running dev server (see below)          |
| `pnpm check:graphics` | Layout check of every graphic × style × size (needs `pnpm dev`) |
| `pnpm db:generate`    | New SQL migration after editing `src/server/db/schema.ts`       |

## Layout

- `src/components/graphics/`: the graphic templates. Pure, hook-free components rendered at native
  pixel size (1080×1080, 1080×1350, 1080×1920, 1600×900), so the same DOM node is shown scaled in
  the studio and exported with `modern-screenshot`. The landing page renders them on the server.
  - `theme.ts` turns club colours + style + format into tokens (contrast-checked text and accent).
  - `parts.tsx` holds the backdrop (styles, background photo overlays, outline lettering), crest
    fallback, headings and footer.
- `src/components/studio/`: the editor (client only, loaded with `ssr: false`).
- `src/lib/store.ts`: zustand store persisted to localStorage (debounced writes, quota warnings).
  Uploaded images are downscaled in `src/lib/image.ts` before they are stored.
- `src/components/studio/ClubSetup.tsx`: the first-run club setup (also "Add a team").
- `src/lib/lofi/`: the pixel stadium. `stadium.ts` paints a deterministic scene into an RGBA
  buffer (sky, floodlights, crowd, LED boards, a 3×5-font scoreboard, banner, pitch, players);
  `LofiStadium.tsx` animates it on a canvas (landing hero, club setup) and `stadiumPaths()` turns
  it into one SVG path per colour for the "Stadium" graphic style.
- `src/components/lofi/Window.tsx`: the low-fi window panel used across the site.
- `src/components/landing/PixelGrass.tsx`: pixel grass strip with a kickable ball.
- `scripts/make-turf.py`: regenerates the pixel turf tiles in `public/lofi/`.
- `src/lib/kinds.ts`: the list of graphics; `src/lib/kits.ts`: kit colour presets.
- `src/lib/brand.ts`: the product name and domain.

## Accounts

Optional. Signed out, the app is unchanged. Signed in with a confirmed email, the studio's data
syncs to the account.

- `src/server/`: server-only code. `auth.ts` (Better Auth: email + password, Google, email
  verification, password reset, account deletion, per-IP rate limits), `db/` (SQLite via
  Drizzle; migrations in `drizzle/` run on start-up), `clubs.ts` (sync: the server numbers every
  save, a change based on an old revision is answered with the newer copy; deletions are kept
  briefly so other devices drop the club too), `images.ts` (validation with sharp, SVG rasterised to PNG,
  de-duplication, the per-account quota), `storage.ts` (S3 or a folder on disk), `mail.ts` (SES
  or a dev outbox folder).
- `src/app/api/`: `auth/[...all]`, `sync` (GET/PUT clubs and studio state), `images` (list,
  upload) and `images/[id]` (serve, delete). Images are served by a 128-bit random id.
- `src/lib/sync/`: the client side. `engine.ts` watches the store, uploads inline images, saves
  changes a moment after an edit and pulls other devices' edits on focus; `merge.ts` decides what
  happens the first time a browser meets an account (asks before mixing clubs).
- UI: `src/components/account/` (sign-in dialog, account menu, sync chip, verify banner,
  `/account` storage page), `src/components/sync/` (provider and merge dialog),
  `src/app/reset-password`.

Limits (env, see `.env.example`): 2 MB and 2560 px per image, 250 MB per account, 50 clubs, 60
uploads an hour. A full account blocks uploads with a message; nothing is deleted for you.

### Tests

- `pnpm test` runs the unit tests.
- `pnpm test:e2e` drives a real browser (Chrome or Chromium) against `pnpm dev`. Start the dev
  server with `TS11_RELAXED_RATE_LIMITS=1` in `.env.local`, since the tests create many accounts.
- `pnpm check:graphics` renders every graphic in every style and size with awkward data (long
  names, near-white and near-black kits, missing numbers) and fails on text that overflows,
  collides, is clipped or is too small.

## Self-hosting

The `Dockerfile` builds a standalone Node server that runs as a non-root user and keeps its SQLite
database in `/data`. `compose.yml` runs it next to a [Litestream](https://litestream.io) sidecar
that streams the database to S3-compatible storage (`deploy/litestream.yml`). Put your settings
in `.env.production` next to `compose.yml` (see `.env.example`); they are read at runtime and never
baked into the image.

Put it behind a reverse proxy that sets `X-Real-IP` to the visitor's address; the per-IP rate
limits read that header. `deploy/teamsheet11.com.caddy` is the Caddy site used for teamsheet11.com.

To restore a lost database, stop the web container and run
`docker compose run --rm litestream restore -config /etc/litestream.yml -o /data/teamsheet11.db /data/teamsheet11.db`.

teamsheet11.com itself is deployed by `.github/workflows/deploy.yml` on every push to `main`.

## Stack

Next.js 16 (App Router, Turbopack), React 19, Tailwind v4, Base UI, dnd kit, zustand, motion,
Sonner, Phosphor icons, react-colorful, modern-screenshot, Better Auth, Drizzle ORM +
better-sqlite3, sharp, aws4fetch (S3 and SES), NumberFlow, Vitest.

## License

Copyright (C) 2026 the teamsheet11 contributors.

This program is free software: you can redistribute it and/or modify it under the terms of the GNU
Affero General Public License as published by the Free Software Foundation, version 3. If you run a
modified version for other people over a network, you must offer them its source code too. See
[LICENSE](LICENSE).
