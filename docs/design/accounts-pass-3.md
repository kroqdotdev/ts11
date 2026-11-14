# Accounts UI, pass 3: plan for every original screen

The account screens from pass 1 were built before their plan was written down. This pass puts
each of them through the plan-first order: this file is committed before any code for the pass;
then each screen is brought to the spec below, then every acceptance check is captured on screen.

Base tokens, type, dials and principles: [accounts.md](accounts.md) (unchanged).

## Library choices for this pass (pick-ui-library)

Decided now, before building. Every need maps to the curated list, and every pick is already
installed, so nothing is added:

| Need                                                     | Pick                                |
| -------------------------------------------------------- | ----------------------------------- |
| Dialog (sign-in, delete confirmations, merge)            | Base UI `Dialog` via `controls.tsx` |
| Account menu                                             | Base UI `Menu`                      |
| "Not saved" detail                                       | Base UI `Popover`                   |
| Transient confirmations (signed in, signed out, deleted) | Sonner                              |
| Storage readout                                          | NumberFlow                          |
| Dialog and sync state                                    | zustand                             |
| Conditional classes                                      | clsx                                |

Not used: input-otp (verification is by link), motion (CSS covers every transition here).

## Spec and acceptance checks per screen

Each check is captured on screen (light and dark, 1280 px and 390 px unless noted) after the build.

**1. Sign-in dialog** (`AuthDialog`)

- Title bar is the app's window title bar; one-sentence intro on what an account adds.
- Google first, then email; labels above inputs; the primary button is the yellow card.
- Errors show inline under the field in plain words (checked: wrong password).
- "Check your inbox" step names the address and offers a resend with a visible cooldown.

**2. Account menu and sync chip** (`AccountButton`, `SyncChip`)

- Menu shows the email, "Storage and account", "Sign out", "Sign out and clear this browser".
- Chip states: Saving (pixel blink), Saved (check), Offline (cloud icon, retries), Not saved
  (yellow, opens the popover). No chip while signed out or unconfirmed.

**3. Confirm-email banner**: done in [pass 2](accounts-pass-2.md).

**4. `/account`**: empty, loading, error, with images, signed out, and the delete-account dialog
with the typed confirmation and a wrong-password error.

**5. `/reset-password`**: the form, the expired-link and incomplete-link messages, and success.

**6. `/privacy`**: one window, headings in the signage font, body at 15 px with line length under
80 characters, links underlined.

**7. Account emails** (verify, reset): table layout that survives email clients; the grass title
strip, white body, yellow-card button, the raw link below for clients that block buttons; the
heading says the action; no images.

Checklist for all of the above: zero em and en dashes; one accent; AA contrast on text and
buttons; focus visible; sentence case; nothing but Phosphor icons.
