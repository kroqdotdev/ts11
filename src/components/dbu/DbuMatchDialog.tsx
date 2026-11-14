"use client";

import { ArrowsClockwiseIcon, DownloadSimpleIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, Dialog } from "@/components/ui/controls";
import { dbuErrorKey, getDbuMatch, planFromDbuMatch, type DbuMatchPlan } from "@/lib/dbu";
import { useActiveTeam, useStudio } from "@/lib/store";
import { Check } from "./Check";

type Load =
  | { state: "loading" }
  | { state: "failed"; message: string }
  | { state: "ready"; plan: DbuMatchPlan };

/**
 * "Get from DBU" for the match on the graphics: shows what DBU's match page has (the
 * team sheet, score and goals, substitutions) and fills in the parts ticked.
 */
export function DbuMatchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  // A fresh look at DBU each time it opens.
  const [opened, setOpened] = useState(0);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setOpened((n) => n + 1);
  }
  return <MatchBody key={opened} open={open} onOpenChange={onOpenChange} />;
}

function MatchBody({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const team = useActiveTeam();
  const applyDbuMatch = useStudio((s) => s.applyDbuMatch);
  const ref = team.match.dbu;
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [parts, setParts] = useState({ score: true, lineup: true, subs: true });
  const t = useTranslations("dbu.match");
  const tErrors = useTranslations("dbu.errors");

  useEffect(() => {
    if (!open || !ref) return;
    let live = true;
    getDbuMatch(ref).then(
      (page) => live && setLoad({ state: "ready", plan: planFromDbuMatch(team, page) }),
      (e) => live && setLoad({ state: "failed", message: tErrors(dbuErrorKey(e)) }),
    );
    return () => {
      live = false;
    };
    // Once per opening (the body remounts each time).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const plan = load.state === "ready" ? load.plan : null;
  const has = {
    score: !!plan && (!!plan.score || plan.goals.length > 0),
    lineup: !!plan?.sheet,
    subs: !!plan && plan.subs.length > 0,
  };
  const chosen = {
    score: parts.score && has.score,
    lineup: parts.lineup && has.lineup,
    subs: parts.subs && has.subs,
  };
  const replaces = [
    chosen.score && team.match.goals.length > 0 && t("partGoals"),
    chosen.lineup && team.lineup.starters.some(Boolean) && t("partLineup"),
    chosen.subs && team.match.subs.length > 0 && t("partSubs"),
  ].filter(Boolean) as string[];
  const m = team.match;

  function apply() {
    if (!plan) return;
    applyDbuMatch(plan, chosen);
    const done = [
      chosen.lineup && t("partLineup"),
      chosen.score && t("partResult"),
      chosen.subs && t("partSubs"),
    ].filter(Boolean) as string[];
    toast.success(t("filled", { parts: done.join(", ") }), {
      description:
        chosen.lineup && plan.newPlayers.length
          ? t("playersAdded", { count: plan.newPlayers.length })
          : undefined,
    });
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      description={t(m.isHome ? "introHome" : "introAway", {
        opponent: m.opponent || t("theOpponent"),
      })}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
          <Button
            variant="primary"
            onClick={apply}
            disabled={!plan || !(chosen.score || chosen.lineup || chosen.subs)}
          >
            <DownloadSimpleIcon size={14} weight="bold" />
            {t("fill")}
          </Button>
        </>
      }
    >
      {load.state === "loading" && (
        <p className="text-sm text-ink-soft" role="status">
          {t("loading")}
        </p>
      )}
      {load.state === "failed" && (
        <p className="text-sm font-medium text-danger" role="alert">
          {load.message}
        </p>
      )}
      {plan && (
        <div className="flex flex-col gap-1">
          <Check
            checked={chosen.lineup}
            disabled={!has.lineup}
            onChange={(lineup) => setParts((p) => ({ ...p, lineup }))}
            title={t("lineup")}
            detail={
              plan.sheet
                ? [
                    t("lineupDetail", {
                      starters: plan.sheet.starters.length,
                      bench: plan.sheet.bench.length,
                    }),
                    plan.newPlayers.length > 0 && t("lineupNew", { count: plan.newPlayers.length }),
                    t("lineupPositions"),
                  ]
                    .filter(Boolean)
                    .join(" ")
                : t("lineupNone")
            }
          />
          <Check
            checked={chosen.score}
            disabled={!has.score}
            onChange={(score) => setParts((p) => ({ ...p, score }))}
            title={t("score")}
            detail={
              !has.score
                ? t("scoreNone")
                : [
                    t("scoreDetail", {
                      score: plan.score ? `${plan.score.us}-${plan.score.them}` : "–",
                      live: plan.finished ? "no" : "yes",
                      count: plan.goals.length,
                    }),
                    plan.score && !plan.goalsAddUp && t("scoreTyped"),
                  ]
                    .filter(Boolean)
                    .join(" ")
            }
          />
          <Check
            checked={chosen.subs}
            disabled={!has.subs}
            onChange={(subs) => setParts((p) => ({ ...p, subs }))}
            title={t("subs")}
            detail={has.subs ? t("subsDetail", { count: plan.subs.length }) : t("subsNone")}
          />
        </div>
      )}
      {replaces.length > 0 && (
        <p className="text-xs leading-snug text-ink-soft">
          {t("replaces", { parts: replaces.join(", ") })}
        </p>
      )}
    </Dialog>
  );
}

/** Opens "Get from DBU" for a match set from an imported fixture; nothing otherwise. */
export function DbuMatchButton({
  kind,
  className,
}: {
  /** "match" in the Match panel (line-up and result), "lineup" in the Line-up panel. */
  kind: "match" | "lineup";
  className?: string;
}) {
  const team = useActiveTeam();
  const [open, setOpen] = useState(false);
  const t = useTranslations("dbu.match");
  if (!team.match.dbu) return null;
  return (
    <>
      <Button size="sm" className={className} onClick={() => setOpen(true)}>
        <ArrowsClockwiseIcon size={14} />
        {kind === "match" ? t("buttonMatch") : t("buttonLineup")}
      </Button>
      <DbuMatchDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
