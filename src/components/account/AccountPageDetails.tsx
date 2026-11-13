"use client";

import { EnvelopeSimpleIcon, GoogleLogoIcon, SignOutIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";
import { Window } from "@/components/lofi/Window";
import { Button } from "@/components/ui/controls";
import { signOutSafely } from "@/lib/sync/signout";

const METHOD: Record<string, { label: string; icon: typeof GoogleLogoIcon }> = {
  credential: { label: "Email and password", icon: EnvelopeSimpleIcon },
  google: { label: "Google", icon: GoogleLogoIcon },
};

/** Who is signed in and how, with sign out. */
export function AccountPageDetails({
  email,
  name,
  providers,
}: {
  email: string;
  name: string;
  /** Better Auth provider ids, e.g. "credential", "google"; null while loading. */
  providers: string[] | null;
}) {
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    const { ok } = await signOutSafely();
    setBusy(false);
    if (!ok) toast.error("Couldn't sign out. Try again.");
    else toast.success("Signed out. Your clubs stay in this browser.");
  }

  return (
    <Window title="Account" bodyClassName="flex flex-col gap-5 p-5">
      <dl className="flex flex-col gap-4 text-sm">
        {name && name !== email && (
          <div className="flex flex-col gap-0.5">
            <dt className="text-[13px] text-ink-soft">Name</dt>
            <dd className="font-semibold break-words text-ink">{name}</dd>
          </div>
        )}
        <div className="flex flex-col gap-0.5">
          <dt className="text-[13px] text-ink-soft">Email</dt>
          <dd className="font-semibold break-all text-ink">{email}</dd>
        </div>
        <div className="flex flex-col gap-1.5">
          <dt className="text-[13px] text-ink-soft">Signs in with</dt>
          <dd>
            {providers === null ? (
              <span aria-label="Loading" className="block h-7 w-40 animate-pulse bg-well" />
            ) : (
              <ul className="flex flex-wrap gap-2">
                {providers.map((p) => {
                  const m = METHOD[p] ?? { label: p, icon: EnvelopeSimpleIcon };
                  const Icon = m.icon;
                  return (
                    <li
                      key={p}
                      className="inline-flex items-center gap-1.5 border-2 border-ink/25 px-2 py-1 text-[13px] text-ink"
                    >
                      <Icon size={16} weight="bold" aria-hidden />
                      {m.label}
                    </li>
                  );
                })}
              </ul>
            )}
          </dd>
        </div>
      </dl>
      <Button className="self-start" disabled={busy} onClick={signOut}>
        <SignOutIcon size={18} weight="bold" aria-hidden />
        Sign out
      </Button>
    </Window>
  );
}
