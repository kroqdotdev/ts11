"use client";

import { WarningIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Window } from "@/components/lofi/Window";
import { Button, Dialog, Field, TextInput } from "@/components/ui/controls";
import { authClient } from "@/lib/auth-client";
import { OWNER_KEY } from "@/lib/sync/engine";
import { signOutSafely } from "@/lib/sync/signout";
import { authMessage } from "./messages";

/**
 * Deleting the account: the window says what goes and what stays; the dialog needs
 * DELETE typed, plus the password for accounts that have one.
 */
export function DeleteAccount({
  userId,
  hasPassword,
}: {
  userId: string;
  /** null while the sign-in methods are still loading. */
  hasPassword: boolean | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Window title="Delete account" bodyClassName="flex flex-col items-start gap-4 p-4 sm:p-5">
      <p className="text-sm leading-relaxed text-ink-soft">
        Deleting your account removes the account, every club saved to it and all the images you
        uploaded. The clubs in this browser stay as they are.
      </p>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Delete account
      </Button>
      {open && (
        <DeleteDialog userId={userId} hasPassword={hasPassword} onClose={() => setOpen(false)} />
      )}
    </Window>
  );
}

function DeleteDialog({
  userId,
  hasPassword,
  onClose,
}: {
  userId: string;
  hasPassword: boolean | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [typed, setTyped] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ids = { typed: useId(), password: useId(), error: useId() };
  const needsPassword = hasPassword !== false;
  const ready = typed.trim() === "DELETE" && (!needsPassword || password.length > 0) && !busy;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setError(null);
    setBusy(true);
    const { error } = await authClient.deleteUser(needsPassword ? { password } : {});
    if (error) {
      setBusy(false);
      setError(authMessage(error).text);
      return;
    }
    await signOutSafely().catch(() => undefined);
    // The clubs here were this account's; they belong to the browser again, so a later
    // sign-in offers to add them instead of replacing them.
    try {
      localStorage.removeItem(OWNER_KEY);
      localStorage.removeItem(`ts11:sync:${userId}`);
    } catch {
      // Nothing to clear.
    }
    router.push("/");
    toast("Your account is deleted", {
      description: "The clubs in this browser are still here.",
    });
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && !busy && onClose()}
      title="Delete your account?"
      description="This can't be undone. Your saved clubs and uploaded images are deleted for good, on every device."
    >
      <form noValidate onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Type DELETE to confirm" htmlFor={ids.typed}>
          <TextInput
            id={ids.typed}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
          />
        </Field>
        {needsPassword && (
          <Field label="Your password" htmlFor={ids.password}>
            <TextInput
              id={ids.password}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!error || undefined}
              aria-describedby={error ? ids.error : undefined}
            />
          </Field>
        )}
        {error && (
          <p
            id={ids.error}
            role="alert"
            className="flex items-start gap-2 rounded-[3px] border-2 border-danger bg-danger/8 px-3 py-2.5 text-sm leading-snug text-danger"
          >
            <WarningIcon size={18} weight="bold" aria-hidden className="mt-px shrink-0" />
            {error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Keep my account
          </Button>
          <Button type="submit" variant="destructive" disabled={!ready}>
            {busy ? "Deleting…" : "Delete account"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
