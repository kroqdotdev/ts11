"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

/**
 * Shows a toast for the flags the auth redirects add to /studio
 * (?verified=1 after the email link, ?signedin=1 after Google), then tidies the URL.
 */
export function AuthToasts() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const verified = url.searchParams.has("verified");
    const signedIn = url.searchParams.has("signedin");
    if (!verified && !signedIn) return;
    if (verified) {
      // The link confirms the address but doesn't sign anyone in (so a link someone
      // else triggered can't put this browser into their account).
      void authClient
        .getSession()
        .then(({ data }) =>
          data?.user
            ? toast.success("Email confirmed. Your clubs now save to your account.")
            : toast.success("Email confirmed. Sign in to start saving your clubs."),
        );
    } else toast.success("Signed in");
    url.searchParams.delete("verified");
    url.searchParams.delete("signedin");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, []);
  return null;
}
