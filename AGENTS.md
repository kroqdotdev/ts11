<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Working on teamsheet11

Read [README.md](README.md) for the layout and [CONTRIBUTING.md](CONTRIBUTING.md) for the rules.
The short version for agents:

- Run `pnpm check` and `pnpm test` before you hand back. For graphics changes, also
  `pnpm check:graphics` (needs `pnpm dev`); for accounts or sync, `pnpm test:e2e`.
- Graphics are pure components at native pixel size and must pass the layout check. Never print
  placeholder text in a graphic.
- Keep the app chrome in the existing low-fi theme (tokens in `src/app/globals.css`, components in
  `src/components/ui/controls.tsx` and `src/components/lofi/`).
- Accounts are optional: everything must keep working signed out.
- Server code imports `server-only`, checks the user and ownership in every route, and validates
  input with zod. Don't log personal data or secrets.
- Schema changes need `pnpm db:generate` and the generated files in `drizzle/`.
- Never commit `.env*` files (except `.env.example`), `data/`, or anything from `.playwright-mcp/`.
- The license is AGPL-3.0. Don't add dependencies with incompatible licenses.
