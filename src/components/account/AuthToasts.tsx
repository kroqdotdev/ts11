"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";
import { useAuthDialog } from "./authDialogStore";

const PARAMS = ["verified", "signedin", "signinerror", "error"] as const;

/** Removes the one-off flags from the address bar, so a reload doesn't repeat them. */
function clearFlags() {
  const url = new URL(window.location.href);
  for (const p of PARAMS) url.searchParams.delete(p);
  window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
}

/**
 * One-off notes after a round trip away from the app: the confirmation link
 * (`?verified=1`) and Google (`?signedin=1`, or `?signinerror=1` when it failed).
 */
export function AuthToasts() {
  const { data, isPending } = useSession();
  const done = useRef(false);

  useEffect(() => {
    if (done.current || isPending) return;
    const q = new URLSearchParams(window.location.search);
    if (!PARAMS.some((p) => q.has(p))) {
      done.current = true;
      return;
    }
    done.current = true;
    const user = data?.user;

    if (q.get("verified") === "1") {
      if (q.get("error")) {
        toast.error("That link has expired", {
          description: user
            ? "Send a new one from the yellow message at the top."
            : "Sign in, and we'll offer to send a new one.",
        });
      } else if (user) {
        toast("Email confirmed", {
          description: "Your clubs save to your account from now on.",
        });
      } else {
        toast("Email confirmed", {
          description: "Sign in to save your clubs to your account.",
          action: { label: "Sign in", onClick: () => useAuthDialog.getState().show("signin") },
        });
      }
    } else if (q.get("signedin") === "1" && user) {
      toast("Signed in", { description: user.email });
    } else if (q.has("signinerror") || q.has("error")) {
      toast.error("Signing in with Google didn't work", {
        description: "Try again, or use your email and a password.",
      });
    }
    clearFlags();
  }, [data, isPending]);

  return null;
}
