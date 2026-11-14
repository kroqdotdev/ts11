"use client";

import { WarningIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("sync.merge");

  useEffect(() => {
    if (confirming) goBack.current?.focus();
  }, [confirming]);

  if (!merge || !resolve) return null;

  const n = merge.localNames.length;
  const name = (club: string) => club || t("unnamedClub");
  const choose = (keepLocal: boolean) => {
    setConfirming(false);
    resolve(keepLocal);
  };

  return (
    <Dialog
      open={open}
      // Closing keeps both: nothing is removed without a deliberate choice.
      onOpenChange={(o) => !o && choose(true)}
      title={t("title")}
      description={t("description", { count: n })}
      footer={
        confirming ? (
          <>
            <Button ref={goBack} onClick={() => setConfirming(false)}>
              {t("goBack")}
            </Button>
            <Button variant="destructive" onClick={() => choose(false)}>
              {t("remove")}
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => setConfirming(true)}>{t("useAccount")}</Button>
            <Button variant="primary" onClick={() => choose(true)}>
              {t("add")}
            </Button>
          </>
        )
      }
    >
      <dl className="flex flex-col gap-4 text-sm">
        <div className="flex flex-col gap-1">
          <dt className="font-semibold text-ink">{t("inBrowser")}</dt>
          {merge.localNames.map((club, i) => (
            <dd key={i} className="text-ink-soft">
              {name(club)}
            </dd>
          ))}
        </div>
        <div className="flex flex-col gap-1">
          <dt className="font-semibold text-ink">{t("inAccount")}</dt>
          {merge.accountNames.length === 0 && <dd className="text-ink-soft">{t("noClubs")}</dd>}
          {merge.accountNames.map((club, i) => (
            <dd key={i} className="text-ink-soft">
              {name(club)}
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
          <span>{t("warning", { count: n })}</span>
        </p>
      )}
    </Dialog>
  );
}
