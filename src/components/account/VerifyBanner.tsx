"use client";

import { EnvelopeSimpleIcon, XIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { useSession } from "@/lib/auth-client";
import { ResendButton } from "./AuthDialog";
import { EmailText } from "./EmailText";

const HIDDEN_KEY = "ts11:verify-banner-hidden";

function hiddenFor(): string | null {
  try {
    return sessionStorage.getItem(HIDDEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Signed in, email not confirmed: saving to the account waits for the link. Says so
 * once, across the top of the studio, with a resend. Hiding it lasts for this tab.
 */
export function VerifyBanner() {
  const { data } = useSession();
  const user = data?.user;
  const [hidden, setHidden] = useState<string | null>(hiddenFor);

  if (!user || user.emailVerified || hidden === user.id) return null;

  const hide = () => {
    try {
      sessionStorage.setItem(HIDDEN_KEY, user.id);
    } catch {
      // Hidden for this page view only.
    }
    setHidden(user.id);
  };

  return (
    <div
      role="region"
      aria-label="Confirm your email"
      className="flex shrink-0 flex-col gap-3 border-y-2 border-card-ink bg-card px-4 py-3 text-card-ink sm:flex-row sm:items-center lg:px-5"
    >
      <EnvelopeSimpleIcon
        size={20}
        weight="bold"
        aria-hidden
        className="hidden shrink-0 sm:block"
      />
      <p className="min-w-0 flex-1 text-sm leading-snug">
        Confirm your email to start saving your clubs to your account. We sent a link to{" "}
        <EmailText email={user.email} className="font-semibold" />.
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <ResendButton email={user.email} size="sm" />
        <button
          type="button"
          onClick={hide}
          aria-label="Hide this message"
          className="grid size-8 place-items-center rounded-[3px] hover:bg-card-ink/10"
        >
          <XIcon size={16} weight="bold" aria-hidden />
        </button>
      </div>
    </div>
  );
}
