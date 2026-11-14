"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthDialog } from "./authDialogStore";

/* The dialog and the auth client load when someone asks for them, not with the landing page. */
const AuthDialog = dynamic(() => import("./AuthDialog").then((m) => m.AuthDialog), {
  ssr: false,
});

/**
 * "Sign in" in the landing page header, for someone whose clubs are on another
 * device. Shown only once it's clear nobody is signed in; nothing while signed in.
 * During club setup it reads "Already have an account? Sign in", as on /studio.
 */
export function LandingSignIn({ setup = false }: { setup?: boolean }) {
  const [state, setState] = useState<"unknown" | "out" | "in">("unknown");
  const [wanted, setWanted] = useState(false);
  const show = useAuthDialog((s) => s.show);
  const open = useAuthDialog((s) => s.open);
  const router = useRouter();

  useEffect(() => {
    let live = true;
    import("@/lib/auth-client")
      .then(({ authClient }) => authClient.getSession())
      .then(({ data }) => live && setState(data?.user ? "in" : "out"))
      .catch(() => live && setState("out"));
    return () => {
      live = false;
    };
  }, []);

  // Signing in from here goes on to the studio, where the clubs are.
  useEffect(() => {
    if (!wanted || open || state !== "out") return;
    let live = true;
    import("@/lib/auth-client")
      .then(({ authClient }) => authClient.getSession())
      .then(({ data }) => {
        if (live && data?.user) router.push("/studio");
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [wanted, open, state, router]);

  if (state !== "out") return null;
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setWanted(true);
          show("signin");
        }}
        className="shrink-0 rounded-[4px] px-2 py-1.5 text-sm font-medium whitespace-nowrap text-chalk underline-offset-4 hover:underline sm:px-3"
      >
        {/* Phones have room for "Sign in" only; the full label stays for screen readers. */}
        {setup && <span className="max-sm:sr-only">Already have an account? </span>}
        Sign in
      </button>
      {wanted && <AuthDialog />}
    </>
  );
}
