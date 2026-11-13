"use client";

import { WarningIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Window } from "@/components/lofi/Window";
import { Button, Dialog, Field, TextInput } from "@/components/ui/controls";
import { authClient } from "@/lib/auth-client";

/**
 * Deleting the account removes it, its saved clubs and its uploaded images.
 * The studio data in this browser is left alone, so nothing on screen vanishes.
 */
export function DangerZone({ hasPassword }: { hasPassword: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmId = useId();
  const passwordId = useId();
  const errorId = useId();

  const ready = typed.trim().toUpperCase() === "DELETE" && (!hasPassword || password.length > 0);

  function close(next: boolean) {
    if (busy) return;
    setOpen(next);
    if (!next) {
      setTyped("");
      setPassword("");
      setError(null);
    }
  }

  async function run() {
    if (!ready) return;
    setBusy(true);
    setError(null);
    const { error: err } = await authClient.deleteUser(
      hasPassword ? { password, callbackURL: "/" } : { callbackURL: "/" },
    );
    if (err) {
      setBusy(false);
      if (err.code === "INVALID_PASSWORD") setError("That password isn't right.");
      else if (err.code === "SESSION_EXPIRED")
        setError(
          "For safety, deleting needs a recent sign-in. Sign out, sign in again, then delete the account.",
        );
      else setError(err.message ?? "The account couldn't be deleted. Try again.");
      return;
    }
    await authClient.signOut().catch(() => undefined);
    toast.success("Account deleted. This browser still has its copy of your clubs.");
    router.push("/");
  }

  return (
    <Window title="Delete account" bodyClassName="flex flex-col gap-4 p-5">
      <p className="text-sm leading-relaxed text-ink">
        Deleting your account removes the account, every club saved to it and all the images you
        uploaded. The clubs in this browser stay as they are.
      </p>
      <Button variant="destructive" className="self-start" onClick={() => setOpen(true)}>
        Delete account
      </Button>

      <Dialog
        open={open}
        onOpenChange={close}
        title="Delete your account?"
        description="This can't be undone. Your saved clubs and uploaded images are deleted for good, on every device."
        footer={
          <>
            <Button variant="ghost" disabled={busy} onClick={() => close(false)}>
              Keep my account
            </Button>
            <Button variant="destructive" disabled={!ready || busy} onClick={run}>
              {busy ? "Deleting…" : "Delete account"}
            </Button>
          </>
        }
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void run();
          }}
        >
          <Field label="Type DELETE to confirm" htmlFor={confirmId}>
            <TextInput
              id={confirmId}
              value={typed}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              aria-describedby={error ? errorId : undefined}
              onChange={(e) => setTyped(e.target.value)}
            />
          </Field>
          {hasPassword && (
            <Field label="Your password" htmlFor={passwordId}>
              <TextInput
                id={passwordId}
                type="password"
                value={password}
                autoComplete="current-password"
                aria-invalid={error === "That password isn't right." || undefined}
                aria-describedby={error ? errorId : undefined}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
          )}
          {error && (
            <p
              id={errorId}
              role="alert"
              className="flex items-start gap-2 border-2 border-danger bg-danger/10 px-3 py-2 text-sm text-danger"
            >
              <WarningIcon size={18} weight="bold" className="mt-0.5 shrink-0" aria-hidden />
              {error}
            </p>
          )}
          {/* Enter in either field submits. */}
          <button type="submit" hidden aria-hidden tabIndex={-1} />
        </form>
      </Dialog>
    </Window>
  );
}
