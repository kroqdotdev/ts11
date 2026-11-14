"use client";

import { WarningIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { Button, Dialog } from "@/components/ui/controls";
import { useSyncState } from "@/lib/sync/state";

/**
 * The first time this browser meets an account that has different clubs: add this
 * browser's clubs to the account (the safe default, and what closing does), or keep
 * only the account's, which needs a second, explicit confirmation.
 */
export function MergeDialog() {
  const merge = useSyncState((s) => s.merge);
  const resolve = useSyncState((s) => s.resolveMerge);
  const [confirming, setConfirming] = useState(false);
  const goBack = useRef<HTMLButtonElement>(null);
  const open = !!merge && !!resolve;

  useEffect(() => {
    if (confirming) goBack.current?.focus();
  }, [confirming]);

  if (!merge || !resolve) return null;

  const n = merge.localNames.length;
  const one = n === 1;
  const choose = (keepLocal: boolean) => {
    setConfirming(false);
    resolve(keepLocal);
  };

  return (
    <Dialog
      open={open}
      // Closing keeps both: nothing is removed without a deliberate choice.
      onOpenChange={(o) => !o && choose(true)}
      title="Add this browser's clubs?"
      description={
        one
          ? "This browser has a club that isn't in your account yet."
          : `This browser has ${n} clubs that aren't in your account yet.`
      }
      footer={
        confirming ? (
          <>
            <Button ref={goBack} onClick={() => setConfirming(false)}>
              Go back
            </Button>
            <Button variant="destructive" onClick={() => choose(false)}>
              Remove from this browser
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => setConfirming(true)}>Use only my account</Button>
            <Button variant="primary" onClick={() => choose(true)}>
              Add to my account
            </Button>
          </>
        )
      }
    >
      <dl className="flex flex-col gap-4 text-sm">
        <div className="flex flex-col gap-1">
          <dt className="font-semibold text-ink">In this browser</dt>
          {merge.localNames.map((name, i) => (
            <dd key={i} className="text-ink-soft">
              {name}
            </dd>
          ))}
        </div>
        <div className="flex flex-col gap-1">
          <dt className="font-semibold text-ink">In your account</dt>
          {merge.accountNames.length === 0 && <dd className="text-ink-soft">No clubs yet</dd>}
          {merge.accountNames.map((name, i) => (
            <dd key={i} className="text-ink-soft">
              {name}
            </dd>
          ))}
        </div>
      </dl>
      {confirming && (
        <p
          role="alert"
          className="flex gap-2.5 rounded-[3px] border-2 border-danger bg-danger/8 p-3 text-sm leading-relaxed text-ink"
        >
          <WarningIcon
            size={18}
            weight="bold"
            aria-hidden
            className="mt-0.5 shrink-0 text-danger"
          />
          <span>
            {one
              ? "That club is removed from this browser and isn't saved anywhere."
              : "Those clubs are removed from this browser and aren't saved anywhere."}{" "}
            Download a backup from the team menu first if you might want {one ? "it" : "them"}.
          </span>
        </p>
      )}
    </Dialog>
  );
}
