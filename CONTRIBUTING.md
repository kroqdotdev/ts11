# Contributing to teamsheet11

Thanks for helping. teamsheet11 is a free tool for volunteers at grassroots football clubs, so the
bar for every change is the same: does it make a match day post quicker or better for someone
doing this on a phone at half time?

## Before you start

- **Bugs:** open an issue with what you did, what you expected and what happened. A screenshot or
  the exported PNG helps a lot.
- **Bigger changes** (a new graphic, a new style, anything touching accounts or sync): open an
  issue first so we can agree on the shape before you spend time on it.
- **Security problems:** don't open an issue; see [SECURITY.md](SECURITY.md).

## Setting up

```sh
pnpm install
cp .env.example .env.local   # set BETTER_AUTH_SECRET (openssl rand -hex 32)
pnpm dev
```

Node 24 and pnpm 11. No outside services are needed: mail goes to `data/dev/outbox/` and images
to `data/dev/objects/`.

## Before you open a pull request

Run what CI runs:

```sh
pnpm check            # typecheck, lint, formatting
pnpm test             # unit tests
pnpm check:graphics   # with `pnpm dev` running: every graphic, style and size
pnpm test:e2e         # with `pnpm dev` running and TS11_RELAXED_RATE_LIMITS=1
```

`pnpm format` fixes formatting. Changing the database schema in `src/server/db/schema.ts` needs a
migration: `pnpm db:generate`, and commit the files it writes to `drizzle/`.

## How the code is laid out

[README.md](README.md) has the map. A few rules that keep the project in shape:

- **Graphics** (`src/components/graphics/`) are pure, hook-free components rendered at native
  size. They must never print placeholder text, and they must pass `pnpm check:graphics`. If you
  add a graphic or a style, it gets checked automatically.
- **The app chrome** (landing, setup, studio, account pages) uses the low-fi look: hard 2px
  borders, offset shadows, the signage font for headings, the tokens in `src/app/globals.css`.
  Reuse `src/components/ui/controls.tsx` and `src/components/lofi/Window.tsx` instead of new
  styles.
- **Signed out must keep working.** Accounts are optional; nothing may require one.
- **Account screens** follow [docs/design/accounts.md](docs/design/accounts.md); update its
  pre-flight table when you change them.
- **Copy** is plain and in sentence case. Say what happens ("Download PNG", not "Submit").
- **Accessibility:** keyboard access, visible focus, labels on inputs, reduced motion respected.
- **Server code** lives in `src/server/` and imports `server-only`. Check the signed-in user
  and their ownership in every API route; never trust ids from the browser on their own.

## Pull requests

- Keep them focused: one change per pull request.
- Describe what changed and why, and how you checked it. Screenshots for anything visual.
- Commits: short imperative subject ("Fit long names on the Sash starting XI").

## License

teamsheet11 is licensed under the [GNU AGPL 3.0](LICENSE). By contributing, you agree that your
contribution is licensed under the same terms.
