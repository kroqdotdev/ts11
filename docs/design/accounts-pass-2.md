# Accounts UI, pass 2: plan

Written before any code for this pass, following frontend-design (plan, review, build, critique)
and the design-taste pre-flight. The base plan, tokens and dials are in
[accounts.md](accounts.md); this pass reuses them unchanged.

## Scope

The account screens that haven't been reviewed on screen yet, plus one defect seen in pass 1:

1. **Confirm-email banner on a phone.** The address wraps mid-word ("exampl / e.org") because the
   email uses `break-all`.
2. **Merge dialog** ("Add this browser's clubs?"), both steps: the choice, and the confirmation
   before removing this browser's clubs.
3. **"Not saved" popover** on the sync chip (storage full, club too big).

## Plan

**Banner.** Wrap the address only where it can wrap naturally: after the `@` and at dots, never
inside a word. Use `overflow-wrap: anywhere` with a `<wbr>` after the `@`, so on a phone the
address breaks as "name@" / "example.org". The resend and dismiss buttons stay on one row.

**Merge dialog.** It is the one place sync can remove data, so it has to read as a decision:

- the title is the question;
- the two lists ("In this browser", "In your account") are short definition rows, not cards;
- the primary action (yellow) is the safe one: "Add to my account";
- choosing "Use only my account" shows a red-bordered warning and a second, red confirm button,
  and names the backup option.

No new components: `Dialog` and `Button` from `controls.tsx`.

**"Not saved" popover.** Failure is a moment for direction, not mood. It gets a title saying what
happened ("Not saved"), the reason, and what to do: a link to "Storage and account" when the
reason is storage, since that's where images are deleted. Same window styling as other popovers
(2px edge, hard shadow).

## Review against the brief

- Would this look the same on any other app? The pieces are the app's own `Window`, `Dialog` and
  yellow-card accent, so no. Nothing new is introduced.
- Defaults avoided: no toast for a blocking error (it would disappear); no modal for "Not saved"
  (the studio stays usable); no spinner.

## Pre-flight to run after building

Zero em dashes; one accent; AA contrast on every button; labels and focus; light and dark; 390 px
phone; each state captured on screen; copy re-read.
