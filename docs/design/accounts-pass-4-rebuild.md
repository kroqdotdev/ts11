# Accounts UI, pass 4: rebuild from the plan

The account screens from pass 1 were built before their plan was written. This pass rebuilds them
from scratch, from the plan alone: the old component files are removed first, and the rebuild is
written without reading them. Committed before any code is removed or written.

## Inputs (the plan)

- [accounts.md](accounts.md): design read, dials, tokens, type, layout, principles, library picks.
- [accounts-pass-3.md](accounts-pass-3.md): the spec and acceptance checks for every screen.
- [accounts-pass-2.md](accounts-pass-2.md): banner email wrapping, the "Not saved" next step, the
  merge dialog.
- [privacy page](../../src/app/privacy/page.tsx) and the emails stay as they are; they were written
  after their plan (pass 3 spec 6 and 7) and passed it.

Library picks (pick-ui-library, curated list, all installed): Base UI `Dialog`, `Menu`, `Popover`
through `src/components/ui/controls.tsx` where it has them; Sonner for toasts; NumberFlow for the
storage readout; zustand for the dialog store; clsx; Phosphor icons. Nothing new is added.

## Contract with the rest of the app (must not change)

| File                                       | Export                                                                                                                                                                            | Used by            |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `src/components/account/AuthDialog.tsx`    | `AuthDialog` (renders the one dialog), `useAuthDialog` (zustand: `open`, `mode`, `email`, `show(mode?)`, `set(patch)`; modes `signin`, `signup`, `reset`, `sent`), `ResendButton` | studio, club setup |
| `src/components/account/AccountButton.tsx` | `AccountButton`                                                                                                                                                                   | studio header      |
| `src/components/account/SyncChip.tsx`      | `SyncChip`                                                                                                                                                                        | studio header      |
| `src/components/account/VerifyBanner.tsx`  | `VerifyBanner`                                                                                                                                                                    | studio             |
| `src/components/account/AuthToasts.tsx`    | `AuthToasts` (`?verified=1`, `?signedin=1`)                                                                                                                                       | studio             |
| `src/components/account/LandingSignIn.tsx` | `LandingSignIn`                                                                                                                                                                   | landing header     |
| `src/components/account/AccountPage.tsx`   | `AccountPage({ signedIn?: boolean })`                                                                                                                                             | `/account`         |
| `src/components/account/ResetPassword.tsx` | `ResetPassword({ token, linkError })`                                                                                                                                             | `/reset-password`  |
| `src/components/sync/MergeDialog.tsx`      | `MergeDialog`                                                                                                                                                                     | sync provider      |

Behaviour that tests and other code rely on: the merge dialog's buttons are named "Add to my
account" and "Use only my account" (then "Remove from this browser"); sign-out goes through
`signOutSafely` in `src/lib/sync/signout.ts`; image usage comes from `src/lib/sync/images.ts`;
sync state from `src/lib/sync/state.ts`; auth from `src/lib/auth-client.ts`.

## Done when

`pnpm check`, `pnpm test`, `pnpm test:e2e` and `pnpm check:graphics` pass; every acceptance check
in pass 3 is captured again on the rebuilt screens (light and dark, 1280 px and 390 px); and the
results are recorded below.

## Results

Rebuilt by an agent working from this plan only (the old files were removed in fe595eb and not
read). Files: the nine contract files, plus `authDialogStore.ts`, `messages.ts`, `EmailText.tsx`,
`StorageMeter.tsx`, `ImagesWindow.tsx` and `DeleteAccount.tsx`.

- `pnpm check`, `pnpm test` (29), `pnpm test:e2e` (sync 7, auth 7, images 6) and
  `pnpm check:graphics` (1296, 0 faults) pass.
- Every pass-3 acceptance check passes on the rebuilt screens, captured in light and dark at
  1280 px and 390 px (84 captures). Two things were fixed after looking at them: the account
  menu now wraps the address after the `@`, and the offline chip keeps its label on phones.
- Screens: [account, dark](screens/pass-4-account-dark.webp),
  [account, light](screens/pass-4-account-light.webp), [sign-in](screens/pass-4-signin.webp),
  [merge](screens/pass-4-merge.webp), [reset](screens/pass-4-reset.webp),
  [delete](screens/pass-4-delete.webp), [menu and chip](screens/pass-4-menu-chip.webp).

Changes from pass 1 that came out of building from the plan:

- The landing page loads the sign-in dialog and auth client only when "Sign in" is clicked.
- Deleting the account also clears this browser's sync record, so a later sign-up here can't
  replace the clubs the confirmation says are kept.
- "Sign out and clear this browser" refuses (with a message) while changes are unsaved, so the
  only copy isn't wiped.
- No arrow icons in links; the storage meter's filled blocks use the ink colour.
