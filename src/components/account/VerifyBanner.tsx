"use client";

import { EnvelopeSimpleIcon, XIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { useSession } from "@/lib/auth-client";
import { ResendButton } from "./AuthDialog";

const KEY = "ts11:verify-banner-dismissed";

function wasDismissed(): boolean {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/** Asks a signed-in person with an unconfirmed email to open the link we sent. */
export function VerifyBanner() {
  const { data } = useSession();
  const [dismissed, setDismissed] = useState(wasDismissed);
  const user = data?.user;
  if (!user || user.emailVerified || dismissed) return null;

  return (
    <div
      role="region"
      aria-label="Confirm your email"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 border-y-2 border-card-ink bg-card px-4 py-2.5 text-card-ink lg:px-5"
    >
      <EnvelopeSimpleIcon size={20} weight="bold" className="hidden shrink-0 sm:block" />
      <p className="min-w-0 flex-1 basis-60 text-sm leading-snug">
        Confirm your email to start saving your clubs to your account. We sent a link to{" "}
        <strong className="break-all">{user.email}</strong>.
      </p>
      <ResendButton email={user.email} size="sm" />
      <button
        type="button"
        aria-label="Hide this message"
        onClick={() => {
          setDismissed(true);
          try {
            sessionStorage.setItem(KEY, "1");
          } catch {
            /* private mode: only hidden until reload */
          }
        }}
        className="grid size-8 place-items-center rounded-[3px] hover:bg-card-ink/10"
      >
        <XIcon size={16} weight="bold" />
      </button>
    </div>
  );
}
