"use client";

import { AuthDialog, useAuthDialog } from "@/components/account/AuthDialog";
import { SetupForm } from "@/components/setup/SetupForm";
import { StadiumScene } from "@/components/setup/StadiumScene";
import { useSetupFlow } from "@/components/setup/useSetupFlow";
import { Wordmark } from "@/components/Wordmark";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { useStudio, useUi } from "@/lib/store";

/**
 * First run in the studio (or "Add a team"): straight onto the big screen in
 * the stadium. The landing page plays the same scene with a camera move in.
 */
export function ClubSetup({ first }: { first: boolean }) {
  const skipSetup = useStudio((s) => s.skipSetup);
  const setSetupOpen = useUi((s) => s.setSetupOpen);
  const setIntro = useUi((s) => s.setIntro);
  const router = useRouter();
  const showSignIn = useAuthDialog((s) => s.show);
  const { data: session, isPending } = useSession();
  // Someone already set up on another device: signing in brings their clubs here.
  const offerSignIn = first && !isPending && !session?.user;
  const flow = useSetupFlow({
    first,
    onDone: () => {
      setIntro(true);
      setSetupOpen(false);
    },
  });

  return (
    <StadiumScene
      className="min-h-dvh lg:h-dvh"
      stadium={flow.stadium}
      setup
      instant
      // Escape: a new team is cancelled; the very first setup goes back to the home page.
      onEscape={first ? () => router.push("/") : () => setSetupOpen(false)}
      screen={<SetupForm flow={flow} variant="screen" />}
      narrowScreen={<SetupForm flow={flow} variant="screen" narrow />}
      header={
        <header className="absolute inset-x-0 top-0 z-20 flex h-16 items-center justify-between gap-4 bg-[#10151c] px-4 lg:bg-transparent lg:px-6">
          <span className="rounded-[4px] bg-[#10151c]/85 px-2.5 py-1.5 text-chalk">
            <Wordmark className="text-[22px]" />
          </span>
          <div className="flex items-center gap-2">
            {offerSignIn && (
              <button
                type="button"
                onClick={() => showSignIn("signin")}
                className="rounded-[4px] px-3 py-1.5 text-sm font-medium text-chalk underline-offset-4 hover:underline"
              >
                Already have an account? Sign in
              </button>
            )}
            <button
              type="button"
              onClick={first ? skipSetup : () => setSetupOpen(false)}
              className="lofi-press rounded-[4px] border-2 border-card-ink bg-paper px-3 py-1.5 text-sm font-medium text-ink shadow-[3px_3px_0_var(--card-ink)]"
            >
              {first ? "Try the example club" : "Cancel"}
            </button>
          </div>
          <AuthDialog />
        </header>
      }
    />
  );
}
