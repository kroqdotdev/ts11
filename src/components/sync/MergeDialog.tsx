"use client";

import { useState } from "react";
import { Button, Dialog } from "@/components/ui/controls";
import { useSyncState } from "@/lib/sync/state";

function list(names: string[]) {
  if (names.length <= 3) return names.join(", ");
  return `${names.slice(0, 3).join(", ")} and ${names.length - 3} more`;
}

/**
 * Asked once per browser and account: this browser has clubs the account
 * doesn't. Adding them is the default, so nothing is lost by just confirming.
 */
export function MergeDialog() {
  const merge = useSyncState((s) => s.merge);
  const resolve = useSyncState((s) => s.resolveMerge);
  const [confirmDrop, setConfirmDrop] = useState(false);
  if (!merge || !resolve) return null;

  const local = merge.localNames.length;
  return (
    <Dialog
      open
      // Closing without choosing keeps both, the safe answer.
      onOpenChange={(open) => {
        if (!open) resolve(true);
      }}
      title="Add this browser's clubs?"
      description={`This browser has ${local === 1 ? "a club" : `${local} clubs`} that ${local === 1 ? "isn't" : "aren't"} in your account yet.`}
      footer={
        confirmDrop ? (
          <>
            <Button variant="secondary" onClick={() => setConfirmDrop(false)}>
              Go back
            </Button>
            <Button variant="destructive" onClick={() => resolve(false)}>
              Remove from this browser
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={() => setConfirmDrop(true)}>
              Use only my account
            </Button>
            <Button variant="primary" onClick={() => resolve(true)}>
              Add to my account
            </Button>
          </>
        )
      }
    >
      <dl className="grid gap-3 text-sm">
        <div className="grid gap-1">
          <dt className="font-semibold text-ink">In this browser</dt>
          <dd className="text-ink-soft">{list(merge.localNames)}</dd>
        </div>
        <div className="grid gap-1">
          <dt className="font-semibold text-ink">In your account</dt>
          <dd className="text-ink-soft">{list(merge.accountNames)}</dd>
        </div>
      </dl>
      {confirmDrop && (
        <p role="alert" className="border-2 border-danger bg-danger/10 p-3 text-sm text-ink">
          {local === 1 ? "That club is" : "Those clubs are"} removed from this browser and{" "}
          {local === 1 ? "isn't" : "aren't"} saved anywhere. Download a backup from the team menu
          first if you might want {local === 1 ? "it" : "them"}.
        </p>
      )}
    </Dialog>
  );
}
