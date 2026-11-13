"use client";

import { SignInIcon } from "@phosphor-icons/react";
import { Window } from "@/components/lofi/Window";
import { Button } from "@/components/ui/controls";
import { useAuthDialog } from "./AuthDialog";

/** Shown on the account page when nobody is signed in. */
export function AccountPageSignIn() {
  const show = useAuthDialog((s) => s.show);
  return (
    <Window
      title="Sign in to see your account"
      className="max-w-xl"
      bodyClassName="flex flex-col items-start gap-4 p-5"
    >
      <p className="max-w-[52ch] text-sm leading-relaxed text-ink">
        Your storage, uploaded images and account settings are here once you sign in. Without an
        account, your clubs stay in this browser.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button variant="primary" onClick={() => show("signin")}>
          <SignInIcon size={18} weight="bold" aria-hidden />
          Sign in
        </Button>
        <Button onClick={() => show("signup")}>Create account</Button>
      </div>
    </Window>
  );
}
