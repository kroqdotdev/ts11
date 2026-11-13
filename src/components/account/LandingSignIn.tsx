"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { AuthDialog, useAuthDialog } from "./AuthDialog";

/**
 * A quiet "Sign in" link for the landing header, for people coming back on a
 * new device. Signed in, it disappears: the main button already opens the studio.
 * Hidden on phones, where the main button needs the room; the studio header has
 * its own sign-in button one tap away.
 */
export function LandingSignIn() {
  const { data, isPending } = useSession();
  const show = useAuthDialog((s) => s.show);
  const open = useAuthDialog((s) => s.open);
  const router = useRouter();
  // After signing in here, carry on into the studio where the clubs load.
  const [asked, setAsked] = useState(false);
  useEffect(() => {
    if (asked && !open && data?.user) router.push("/studio?signedin=1");
  }, [asked, open, data?.user, router]);

  if (isPending || data?.user) return <AuthDialog />;
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setAsked(true);
          show("signin");
        }}
        className="hidden rounded-[4px] bg-[#10151c]/85 px-2.5 py-1.5 text-sm font-semibold whitespace-nowrap text-chalk underline decoration-chalk/40 decoration-2 underline-offset-4 hover:decoration-chalk sm:inline-block"
      >
        Sign in
      </button>
      <AuthDialog />
    </>
  );
}
