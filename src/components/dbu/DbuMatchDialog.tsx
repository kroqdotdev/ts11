"use client";

import { ArrowsClockwiseIcon, DownloadSimpleIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, Dialog } from "@/components/ui/controls";
import { DbuError, getDbuMatch, planFromDbuMatch, type DbuMatchPlan } from "@/lib/dbu";
import { useActiveTeam, useStudio } from "@/lib/store";
import { Check } from "./Check";

type Load =
  | { state: "loading" }
  | { state: "failed"; message: string }
  | { state: "ready"; plan: DbuMatchPlan };

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

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

  useEffect(() => {
    if (!open || !ref) return;
    let live = true;
    getDbuMatch(ref).then(
      (page) => live && setLoad({ state: "ready", plan: planFromDbuMatch(team, page) }),
      (e) =>
        live &&
        setLoad({
          state: "failed",
          message: e instanceof DbuError ? e.message : "Something went wrong. Try again.",
        }),
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
    chosen.score && team.match.goals.length > 0 && "goals",
    chosen.lineup && team.lineup.starters.some(Boolean) && "line-up",
    chosen.subs && team.match.subs.length > 0 && "substitutions",
  ].filter(Boolean) as string[];
  const m = team.match;

  function apply() {
    if (!plan) return;
    applyDbuMatch(plan, chosen);
    const done = [
      chosen.lineup && "line-up",
      chosen.score && "result",
      chosen.subs && "substitutions",
    ].filter(Boolean);
    toast.success(`Filled in from DBU: ${done.join(", ")}`, {
      description:
        chosen.lineup && plan.newPlayers.length
          ? `${plural(plan.newPlayers.length, "player was", "players were")} added to the squad. Check their positions.`
          : undefined,
    });
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Get from DBU"
      description={`${m.isHome ? "Home" : "Away"} against ${m.opponent || "the opponent"}. DBU shows the team sheet (holdkort) once it's handed in, and goals and substitutions as they're reported.`}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="primary"
            onClick={apply}
            disabled={!plan || !(chosen.score || chosen.lineup || chosen.subs)}
          >
            <DownloadSimpleIcon size={14} weight="bold" />
            Fill in
          </Button>
        </>
      }
    >
      {load.state === "loading" && (
        <p className="text-sm text-ink-soft" role="status">
          Looking at DBU&apos;s page for the match…
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
            title="Line-up from the team sheet"
            detail={
              plan.sheet
                ? `${plural(plan.sheet.starters.length, "starter", "starters")}, ${plural(plan.sheet.bench.length, "on the bench", "on the bench")}.${
                    plan.newPlayers.length
                      ? ` ${plural(plan.newPlayers.length, "isn't", "aren't")} in your squad yet and will be added.`
                      : ""
                  } The team sheet has no positions, so check them after.`
                : "DBU doesn't show your team sheet for this match (yet)."
            }
          />
          <Check
            checked={chosen.score}
            disabled={!has.score}
            onChange={(score) => setParts((p) => ({ ...p, score }))}
            title="Score and goals"
            detail={
              !has.score
                ? "No score on DBU yet."
                : `${plan.score ? `${plan.score.us}-${plan.score.them}${plan.finished ? "" : " so far"}` : "No score yet"}, ${plural(plan.goals.length, "goal", "goals")} with ${plan.goals.length === 1 ? "its" : "their"} scorer${plan.goals.length === 1 ? "" : "s"}.${
                    plan.score && !plan.goalsAddUp
                      ? " DBU's timeline doesn't have every goal, so the score is typed in as DBU has it."
                      : ""
                  }`
            }
          />
          <Check
            checked={chosen.subs}
            disabled={!has.subs}
            onChange={(subs) => setParts((p) => ({ ...p, subs }))}
            title="Substitutions"
            detail={
              has.subs
                ? `${plural(plan.subs.length, "substitution", "substitutions")}.`
                : "None reported on DBU."
            }
          />
        </div>
      )}
      {replaces.length > 0 && (
        <p className="text-xs leading-snug text-ink-soft">
          This replaces the {replaces.join(" and ")} you have for this match now.
        </p>
      )}
    </Dialog>
  );
}

/** Opens "Get from DBU" for a match set from an imported fixture; nothing otherwise. */
export function DbuMatchButton({ label, className }: { label: string; className?: string }) {
  const team = useActiveTeam();
  const [open, setOpen] = useState(false);
  if (!team.match.dbu) return null;
  return (
    <>
      <Button size="sm" className={className} onClick={() => setOpen(true)}>
        <ArrowsClockwiseIcon size={14} />
        {label}
      </Button>
      <DbuMatchDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
