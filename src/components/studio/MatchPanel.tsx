"use client";

import {
  ArrowsClockwiseIcon,
  DownloadSimpleIcon,
  MinusIcon,
  PlusIcon,
  SoccerBallIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";
import clsx from "clsx";
import { useLocale, useTranslations } from "next-intl";
import { Fragment, useId, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { DbuImportDialog } from "@/components/dbu/DbuImportDialog";
import { DbuMatchButton } from "@/components/dbu/DbuMatchDialog";
import {
  Button,
  Field,
  Section,
  Segmented,
  Select,
  SwitchRow,
  TextField,
  TextInput,
} from "@/components/ui/controls";
import { ColorField, ImageField } from "@/components/ui/media";
import { crestKindOf } from "@/lib/crest";
import {
  dbuErrorKey,
  getDbuImport,
  matchIsBlank,
  nextFixture,
  toFixtures,
  type DbuImport,
} from "@/lib/dbu";
import { displayName, formatMatchDate, initials } from "@/lib/format";
import { FIELD } from "@/lib/issues";
import {
  byMinute,
  findPlayer,
  matchScore,
  scoreMismatch,
  scorerOf,
  spotlightGoal,
} from "@/lib/score";
import { useActiveTeam, useStudio } from "@/lib/store";
import { focusWhenReady } from "./fixIssue";
import type { DbuLink, Fixture, Goal, GraphicKind, Language, Player, Team } from "@/lib/types";

function Score({
  label,
  value,
  onChange,
  inputId,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  /** Fixed id so "Fix it" can focus this box. */
  inputId?: string;
}) {
  const auto = useId();
  const id = inputId ?? auto;
  const t = useTranslations("studio.match");
  return (
    <Field label={label} htmlFor={id}>
      <div className="flex h-10 items-center rounded-md border border-rule bg-paper">
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("lower", { label })}
          onClick={() => onChange(Math.max(0, value - 1))}
        >
          <MinusIcon size={14} />
        </Button>
        <input
          id={id}
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(Math.min(99, Number(e.target.value.replace(/\D/g, "")) || 0))}
          className="w-full min-w-0 bg-transparent text-center text-lg font-semibold tabular-nums focus:outline-none"
        />
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("raise", { label })}
          onClick={() => onChange(Math.min(99, value + 1))}
        >
          <PlusIcon size={14} />
        </Button>
      </div>
    </Field>
  );
}

function GoalRow({ goal, listId, spotlit }: { goal: Goal; listId: string; spotlit: boolean }) {
  const team = useActiveTeam();
  const updateGoal = useStudio((s) => s.updateGoal);
  const removeGoal = useStudio((s) => s.removeGoal);
  const updateMatch = useStudio((s) => s.updateMatch);
  const nameStyle = useStudio((s) => s.design.nameStyle);
  const t = useTranslations("studio.match");
  const ours = goal.side === "us";
  const linked =
    ours && goal.playerId ? team.players.find((p) => p.id === goal.playerId) : undefined;
  // Typed but not linked yet: the squad player the name would match.
  const match = ours && !linked ? scorerOf(team, goal) : undefined;
  const printed = linked ? displayName(linked, nameStyle) : "";
  const label =
    printed ||
    goal.name.trim() ||
    (goal.minute ? t("goalAt", { minute: goal.minute }) : t("thisGoal"));

  const link = (p: Player) => updateGoal(goal.id, { playerId: p.id, name: p.name });
  /** On Enter or leaving the field, a name that points at one squad player links to them. */
  const settle = () => {
    if (!ours || goal.playerId || !goal.name.trim()) return;
    const p = findPlayer(team, goal.name);
    if (p) link(p);
  };

  return (
    <li className="flex flex-col gap-1">
      <div className="grid grid-cols-[2.25rem_1fr_4rem_2.25rem] gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-pressed={spotlit}
          aria-label={t("useOnGoal", { label })}
          title={t("useOnGoalTitle")}
          onClick={() => updateMatch({ spotlightGoalId: goal.id })}
          className={clsx(spotlit && "bg-card text-card-ink hover:bg-card")}
        >
          <SoccerBallIcon size={18} weight={spotlit ? "fill" : "regular"} />
        </Button>
        {linked ? (
          // Linked to a squad player: show who, with a way to pick someone else.
          <div
            id={FIELD.scorer(goal.id)}
            tabIndex={-1}
            className="flex h-10 min-w-0 items-center gap-2 rounded-[3px] border-2 border-ink bg-paper pr-1 pl-2 outline-none"
          >
            <span className="shrink-0 rounded-[2px] bg-ink px-1.5 py-0.5 text-[11px] font-semibold text-paper tabular-nums">
              {linked.number ? `#${linked.number}` : t("squad")}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
              {printed}
            </span>
            <button
              type="button"
              aria-label={t("changeScorer", { name: printed })}
              title={t("pickElse")}
              onClick={() => {
                updateGoal(goal.id, { playerId: null, name: "" });
                focusWhenReady(FIELD.scorer(goal.id));
              }}
              className="grid size-8 shrink-0 place-items-center rounded-[2px] text-ink-soft hover:bg-well hover:text-ink"
            >
              <XIcon size={14} weight="bold" />
            </button>
          </div>
        ) : (
          <TextInput
            id={FIELD.scorer(goal.id)}
            aria-label={t("scorer")}
            aria-describedby={match ? `${FIELD.scorer(goal.id)}-as` : undefined}
            placeholder={ours ? t("scorerPick") : t("scorer")}
            list={ours ? listId : undefined}
            autoComplete="off"
            value={goal.name}
            onChange={(e) => {
              const name = e.target.value;
              // Picking a full squad name from the suggestions links the player straight away.
              const q = name.trim().toLowerCase();
              const exact =
                ours && q ? team.players.find((p) => p.name.trim().toLowerCase() === q) : undefined;
              if (exact) link(exact);
              else updateGoal(goal.id, { name, playerId: null });
            }}
            onBlur={settle}
            onKeyDown={(e) => {
              if (e.key === "Enter") settle();
            }}
          />
        )}
        <TextInput
          aria-label={t("minute")}
          placeholder={t("min")}
          inputMode="numeric"
          value={goal.minute}
          onChange={(e) => updateGoal(goal.id, { minute: e.target.value.replace(/[^\d+]/g, "") })}
          className="text-center tabular-nums"
        />
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("remove", { label })}
          onClick={() => removeGoal(goal.id)}
        >
          <TrashIcon size={16} />
        </Button>
      </div>
      {match && (
        <p id={`${FIELD.scorer(goal.id)}-as`} className="pl-11 text-xs text-ink-soft">
          {t.rich("means", {
            player: `${match.number ? `#${match.number} ` : ""}${displayName(match, nameStyle)}`,
            link: (chunks) => (
              <button
                type="button"
                onClick={() => link(match)}
                className="font-semibold text-ink underline decoration-ink/40 underline-offset-2 hover:decoration-ink"
              >
                {chunks}
              </button>
            ),
          })}
        </p>
      )}
    </li>
  );
}

/** "2-1" with our score first. */
/** The active team straight from the store, for reading what an action just added. */
function latestTeam() {
  const st = useStudio.getState();
  return st.teams.find((t) => t.id === st.activeTeamId) ?? st.teams[0];
}

/** Ids of the first field in a new substitution or fixture row, focused after adding it. */
const subFieldId = (id: string) => `sub-minute-${id}`;
const fixtureFieldId = (id: string) => `fixture-opponent-${id}`;

function line(us: number, them: number) {
  return `${us}-${them}`;
}

export function MatchPanel() {
  const team = useActiveTeam();
  const m = team.match;
  const updateMatch = useStudio((s) => s.updateMatch);
  const addGoal = useStudio((s) => s.addGoal);
  const listId = useId();
  const kind = useStudio((s) => s.design.kind);
  const t = useTranslations("studio.match");

  const fixture = (
    <Section title={t("fixture")}>
      <FromFixtures team={team} />
      <DbuMatchButton kind="match" className="self-start" />
      <Segmented
        label={t("homeAway")}
        value={m.isHome ? "home" : "away"}
        onChange={(v) => updateMatch({ isHome: v === "home" })}
        options={[
          { value: "home", label: t("home") },
          { value: "away", label: t("away") },
        ]}
      />
      <div className="grid grid-cols-[1fr_6rem] gap-3">
        <Field label={t("opponent")} htmlFor={FIELD.opponent}>
          <TextInput
            id={FIELD.opponent}
            value={m.opponent}
            placeholder={t("opponentPlaceholder")}
            onChange={(e) => updateMatch({ opponent: e.target.value })}
          />
        </Field>
        <TextField
          label={t("short")}
          value={m.opponentShort}
          // Shows what the graphics use when this is left empty (the initials).
          placeholder={m.opponent.trim() ? initials(m.opponent) : "ABC"}
          maxLength={5}
          onChange={(opponentShort) => updateMatch({ opponentShort: opponentShort.toUpperCase() })}
        />
      </div>
      <TextField
        label={t("competition")}
        value={m.competition}
        placeholder={t("competitionPlaceholder")}
        onChange={(competition) => updateMatch({ competition })}
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label={t("date")}
          type="date"
          value={m.date}
          onChange={(date) => updateMatch({ date })}
        />
        <TextField
          label={t("kickoff")}
          type="time"
          value={m.kickoff}
          onChange={(kickoff) => updateMatch({ kickoff })}
        />
      </div>
      <TextField label={t("venue")} value={m.venue} onChange={(venue) => updateMatch({ venue })} />
    </Section>
  );
  const badge = (
    <Section title={t("badge")}>
      <ImageField
        label={t("crest")}
        value={m.opponentCrest}
        purpose="crest"
        onChange={(opponentCrest) => updateMatch({ opponentCrest })}
      />
      <div className="grid grid-cols-2 gap-3">
        <ColorField
          label={t("theirMain")}
          value={m.opponentColors.primary}
          onChange={(primary) => updateMatch({ opponentColors: { ...m.opponentColors, primary } })}
        />
        <ColorField
          label={t("theirSecond")}
          value={m.opponentColors.secondary}
          onChange={(secondary) =>
            updateMatch({ opponentColors: { ...m.opponentColors, secondary } })
          }
        />
      </div>
    </Section>
  );
  const counted = matchScore({ ...m, autoScore: true });
  const ftOff = scoreMismatch(m);
  const htOff = scoreMismatch(m, true);
  const usName = team.name || t("us");
  const themName = m.opponent || t("them");
  const mismatchNote = (half: boolean) => {
    const goalsLine = half ? line(counted.htUs, counted.htThem) : line(counted.us, counted.them);
    const typed = half ? line(m.htOurScore, m.htTheirScore) : line(m.ourScore, m.theirScore);
    return (
      <div
        role="status"
        className="flex items-center justify-between gap-3 rounded-[4px] border-2 border-card-ink bg-card px-3 py-2 text-[13px] text-card-ink"
      >
        <span>
          {t.rich(half ? "mismatchHalf" : "mismatch", {
            goals: goalsLine,
            typed,
            b: (chunks) => <b className="tabular-nums">{chunks}</b>,
          })}
        </span>
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            updateMatch(
              half
                ? { htOurScore: counted.htUs, htTheirScore: counted.htThem }
                : { ourScore: counted.us, theirScore: counted.them },
            )
          }
        >
          {t("useScore", { score: goalsLine })}
        </Button>
      </div>
    );
  };
  const autoSwitch = (
    <SwitchRow
      label={t("auto")}
      hint={m.autoScore ? t("autoOn") : t("autoOff")}
      checked={m.autoScore}
      onChange={(autoScore) =>
        // Start the boxes from the counted score so turning this off changes nothing.
        updateMatch(
          autoScore
            ? { autoScore }
            : {
                autoScore,
                ourScore: counted.us,
                theirScore: counted.them,
                htOurScore: counted.htUs,
                htTheirScore: counted.htThem,
              },
        )
      }
    />
  );
  const scoreboard = (us: number, them: number, label: string) => (
    <div
      aria-label={`${label}: ${usName} ${us}, ${themName} ${them}`}
      className="flex items-center justify-between gap-3 rounded-[4px] border-2 border-card-ink bg-grass-deep px-4 py-2 text-chalk"
    >
      <span className="text-xs tracking-wide uppercase opacity-80">{label}</span>
      <span className="font-signage text-[34px] leading-none tabular-nums">
        {us}-{them}
      </span>
    </div>
  );
  const score = (
    <Section title={t("score")}>
      <div id={m.autoScore ? FIELD.score : undefined} tabIndex={-1} className="outline-none">
        {autoSwitch}
      </div>
      {m.autoScore ? (
        scoreboard(counted.us, counted.them, t("fullTime"))
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Score
            label={usName}
            value={m.ourScore}
            inputId={kind === "halftime" && !ftOff ? undefined : FIELD.score}
            onChange={(ourScore) => updateMatch({ ourScore })}
          />
          <Score
            label={themName}
            value={m.theirScore}
            onChange={(theirScore) => updateMatch({ theirScore })}
          />
        </div>
      )}
      {ftOff && mismatchNote(false)}
      <datalist id={listId}>
        {team.players.map((p) => (
          <option key={p.id} value={p.name}>
            {p.number ? `#${p.number}` : undefined}
          </option>
        ))}
      </datalist>
      {(["us", "them"] as const).map((side) => {
        const goals = byMinute(m.goals.filter((g) => g.side === side));
        return (
          <div key={side} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-medium">
                {t("scorers", { team: side === "us" ? usName : themName })}
              </h3>
              <Button
                id={side === "us" ? FIELD.goals : undefined}
                data-fix="add"
                size="sm"
                variant="ghost"
                onClick={() => {
                  addGoal(side);
                  // Straight into the new row's scorer, so typing doesn't press the button again.
                  const added = latestTeam().match.goals.at(-1);
                  if (added) focusWhenReady(FIELD.scorer(added.id));
                }}
              >
                <PlusIcon size={14} />
                {t("addGoal")}
              </Button>
            </div>
            {goals.length > 0 && (
              <ul className="flex flex-col gap-2">
                {goals.map((g) => (
                  <GoalRow
                    key={g.id}
                    goal={g}
                    listId={listId}
                    spotlit={spotlightGoal(team)?.goal.id === g.id}
                  />
                ))}
              </ul>
            )}
          </div>
        );
      })}
      <p className="text-xs text-ink-soft">{t("goalNote")}</p>
    </Section>
  );
  const halftime = (
    <Section title={t("halfTime")}>
      {m.autoScore ? (
        <>
          {scoreboard(counted.htUs, counted.htThem, t("halfTime"))}
          <p className="-mt-1 text-xs text-ink-soft">{t("htNote")}</p>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Score
            label={usName}
            value={m.htOurScore}
            inputId={kind === "halftime" && !ftOff ? FIELD.score : undefined}
            onChange={(htOurScore) => updateMatch({ htOurScore })}
          />
          <Score
            label={themName}
            value={m.htTheirScore}
            onChange={(htTheirScore) => updateMatch({ htTheirScore })}
          />
        </div>
      )}
      {htOff && mismatchNote(true)}
    </Section>
  );
  const subs = <SubsSection />;
  const motm = <MotmSection />;
  const list = <FixturesSection />;

  // The editor for the graphic on screen comes first; the rest follow in match order.
  const order: Record<GraphicKind, ReactNode[]> = {
    fixture: [fixture, badge],
    lineup: [fixture, badge],
    pitch: [fixture, badge],
    goal: [score, fixture, badge],
    halftime: [halftime, score, fixture, badge],
    subs: [subs, fixture],
    result: [score, fixture, badge],
    motm: [motm, score, fixture],
    fixtures: [list],
  };
  const first = order[kind];
  const rest = [fixture, badge, score, halftime, subs, motm, list].filter(
    (x) => !first.includes(x),
  );

  return (
    <>
      {[...first, ...rest].map((section, idx) => (
        <Fragment key={idx}>{section}</Fragment>
      ))}
    </>
  );
}

function playerItems(players: Player[], empty: string) {
  return [
    { value: "", label: empty },
    ...players.map((p) => ({ value: p.id, label: `${p.number} ${p.name}`.trim() })),
  ];
}

function SubsSection() {
  const team = useActiveTeam();
  const { addSub, updateSub, removeSub } = useStudio.getState();
  const byId = new Map(team.players.map((p) => [p.id, p]));
  const starters = team.lineup.starters
    .map((id) => (id ? byId.get(id) : undefined))
    .filter((p): p is Player => !!p);
  const bench = team.lineup.bench.map((id) => byId.get(id)).filter((p): p is Player => !!p);
  // Fall back to the whole squad when no line-up has been picked.
  const offList = starters.length ? starters : team.players;
  const onList = bench.length ? bench : team.players;
  const firstOpen = team.match.subs.find((s) => !s.onId || !s.offId);
  const t = useTranslations("studio.match");

  return (
    <Section
      title={t("subs")}
      action={
        <Button
          id={team.match.subs.length === 0 ? FIELD.subs : undefined}
          data-fix="add"
          size="sm"
          variant="ghost"
          onClick={() => {
            addSub();
            const added = latestTeam().match.subs.at(-1);
            if (added) focusWhenReady(subFieldId(added.id));
          }}
        >
          <PlusIcon size={14} />
          {t("addSub")}
        </Button>
      }
    >
      {team.match.subs.length === 0 ? (
        <p className="text-sm text-ink-soft">{t("noSubs")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {team.match.subs.map((sub) => (
            <li
              key={sub.id}
              id={sub.id === firstOpen?.id ? FIELD.subs : undefined}
              tabIndex={sub.id === firstOpen?.id ? -1 : undefined}
              className="grid grid-cols-[4rem_1fr_2.25rem] items-start gap-2 border-b-2 border-rule/60 pb-3 outline-none last:border-b-0 last:pb-0"
            >
              <Field label={t("minute")} htmlFor={subFieldId(sub.id)}>
                <TextInput
                  id={subFieldId(sub.id)}
                  inputMode="numeric"
                  value={sub.minute}
                  placeholder={t("min")}
                  onChange={(e) =>
                    updateSub(sub.id, { minute: e.target.value.replace(/[^\d+]/g, "") })
                  }
                  className="text-center tabular-nums"
                />
              </Field>
              <div className="flex flex-col gap-2">
                <Select
                  label={t("on")}
                  value={sub.onId ?? ""}
                  items={playerItems(onList, t("whoOn"))}
                  onChange={(id) => updateSub(sub.id, { onId: id || null })}
                />
                <Select
                  label={t("off")}
                  value={sub.offId ?? ""}
                  items={playerItems(offList, t("whoOff"))}
                  onChange={(id) => updateSub(sub.id, { offId: id || null })}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="mt-6"
                aria-label={t("removeSub")}
                onClick={() => removeSub(sub.id)}
              >
                <TrashIcon size={16} />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function MotmSection() {
  const team = useActiveTeam();
  const updateMatch = useStudio((s) => s.updateMatch);
  const t = useTranslations("studio.match");
  return (
    <Section title={t("motm")}>
      <Select
        id={FIELD.motm}
        label={t("player")}
        value={team.match.motmId ?? ""}
        items={playerItems(team.players, t("pickPlayer"))}
        onChange={(id) => updateMatch({ motmId: id || null })}
      />
      <TextField
        label={t("lineUnder")}
        hint={t("lineUnderHint")}
        value={team.match.motmNote}
        onChange={(motmNote) => updateMatch({ motmNote })}
      />
    </Section>
  );
}

function FixturesSection() {
  const team = useActiveTeam();
  const { addFixture, updateFixture, removeFixture, playFixture } = useStudio.getState();
  const t = useTranslations("studio.match");
  const tDbu = useTranslations("dbu.fixtures");
  return (
    <Section
      title={t("fixtures")}
      action={
        <Button
          id={FIELD.fixtures}
          data-fix="add"
          size="sm"
          variant="ghost"
          onClick={() => {
            addFixture();
            const added = latestTeam().fixtures.at(-1);
            if (added) focusWhenReady(fixtureFieldId(added.id));
          }}
        >
          <PlusIcon size={14} />
          {t("addFixture")}
        </Button>
      }
    >
      <p className="-mt-2 text-xs text-ink-soft">{t("fixturesNote")}</p>
      <DbuTools team={team} />
      {team.fixtures.length === 0 ? (
        <p className="text-sm text-ink-soft">{t("noFixtures")}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {team.fixtures.map((f) => (
            <li key={f.id} className="flex flex-col gap-2 rounded-md bg-well p-3">
              <div className="flex items-end gap-2">
                {f.opponentCrest && (
                  <img
                    src={f.opponentCrest}
                    alt=""
                    className="mb-1 size-8 shrink-0 object-contain"
                  />
                )}
                <TextField
                  id={fixtureFieldId(f.id)}
                  label={t("opponent")}
                  value={f.opponent}
                  onChange={(opponent) => updateFixture(f.id, { opponent })}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={
                    f.opponent.trim() ? t("remove", { label: f.opponent }) : t("removeFixture")
                  }
                  onClick={() => removeFixture(f.id)}
                >
                  <TrashIcon size={16} />
                </Button>
              </div>
              <Segmented
                label={t("homeAway")}
                value={f.isHome ? "home" : "away"}
                onChange={(v) => updateFixture(f.id, { isHome: v === "home" })}
                options={[
                  { value: "home", label: t("home") },
                  { value: "away", label: t("away") },
                ]}
              />
              <div className="grid grid-cols-[1fr_6.5rem] gap-2">
                <TextField
                  label={t("date")}
                  type="date"
                  value={f.date}
                  onChange={(date) => updateFixture(f.id, { date })}
                />
                <TextField
                  label={t("kickoff")}
                  type="time"
                  value={f.kickoff}
                  onChange={(kickoff) => updateFixture(f.id, { kickoff })}
                />
              </div>
              <div className="grid grid-cols-[1fr_6.5rem] gap-2">
                <TextField
                  label={t("competition")}
                  value={f.competition}
                  onChange={(competition) => updateFixture(f.id, { competition })}
                />
                <TextField
                  label={t("result")}
                  placeholder={t("resultPlaceholder")}
                  value={f.score}
                  onChange={(score) => updateFixture(f.id, { score })}
                />
              </div>
              {f.opponent.trim() && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="self-start"
                  onClick={() => {
                    playFixture(f.id);
                    toast.success(tDbu("used", { opponent: f.opponent }));
                  }}
                >
                  <SoccerBallIcon size={14} />
                  {tDbu("useForMatch")}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

/** Fill the match in from a fixture: the next one on match day, or a played one for its result. */
function FromFixtures({ team }: { team: Team }) {
  const playFixture = useStudio((s) => s.playFixture);
  const t = useTranslations("dbu.fixtures");
  const language: Language = useLocale() === "da" ? "da" : "en";
  const m = team.match;
  const label = (f: Fixture) =>
    [
      f.date && `${formatMatchDate(f.date, language)} ·`,
      f.opponent,
      `(${f.isHome ? t("home") : t("away")})`,
      f.score.trim(),
    ]
      .filter(Boolean)
      .join(" ");
  const all = team.fixtures
    .filter((f) => f.opponent.trim())
    .sort((a, b) => `${a.date}T${a.kickoff}`.localeCompare(`${b.date}T${b.kickoff}`));
  if (!all.length) return null;
  const current = all.find(
    (f) => f.date === m.date && f.opponent.trim().toLowerCase() === m.opponent.trim().toLowerCase(),
  );
  return (
    <Select
      label={t("fillFrom")}
      value={current?.id ?? ""}
      items={[
        { value: "", label: t("pick") },
        ...all.map((f) => ({ value: f.id, label: label(f) })),
      ]}
      onChange={(id) => id && playFixture(id)}
    />
  );
}

/** Import fixtures from DBU, or update the ones already imported. */
function DbuTools({ team }: { team: Team }) {
  const importFixtures = useStudio((s) => s.importFixtures);
  const playFixture = useStudio((s) => s.playFixture);
  // The team the import dialog was opened for; its import lands there.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const t = useTranslations("dbu.fixtures");
  const tErrors = useTranslations("dbu.errors");

  /**
   * Applies an import to the team it was started for (`teamId`), even if another team
   * is open by the time DBU answers. A team deleted in the meantime gets nothing.
   */
  async function apply(teamId: string, data: DbuImport, link: DbuLink) {
    const teamNow = () => useStudio.getState().teams.find((x) => x.id === teamId);
    if (!teamNow()) return;
    const fresh = toFixtures(data);
    // Only fill the crest in when the team has none: one picked by hand stays.
    const crest = !teamNow()?.crest && data.club.crest ? data.club.crest : null;
    const extra = crest ? { crest, crestKind: await crestKindOf(crest) } : {};
    const { added, updated } = importFixtures(teamId, link, fresh, extra);
    const now = teamNow();
    if (!now) return;
    const next = nextFixture(now.fixtures);
    const title =
      added || updated
        ? t("fromDbu", {
            summary: [
              added && t("added", { count: added }),
              updated && t("updated", { count: updated }),
            ]
              .filter(Boolean)
              .join(", "),
          })
        : t("upToDate");
    const isCurrent =
      !!next &&
      next.date === now.match.date &&
      next.opponent.trim().toLowerCase() === now.match.opponent.trim().toLowerCase();
    if (next && matchIsBlank(now)) {
      playFixture(next.id, teamId);
      toast.success(title, { description: t("matchSet", { opponent: next.opponent }) });
    } else {
      toast.success(title, {
        action:
          next && !isCurrent
            ? {
                label: t("next", { opponent: next.opponent }),
                onClick: () => playFixture(next.id, teamId),
              }
            : undefined,
      });
    }
  }

  async function update(link: DbuLink) {
    const teamId = team.id;
    setUpdating(true);
    try {
      await apply(teamId, await getDbuImport(link), link);
    } catch (e) {
      toast.error(t("updateFailed"), { description: tErrors(dbuErrorKey(e)) });
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {team.dbu ? (
        <>
          <Button size="sm" onClick={() => update(team.dbu!)} disabled={updating}>
            <ArrowsClockwiseIcon size={14} className={clsx(updating && "animate-spin")} />
            {updating ? t("updating") : t("update")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setOpenFor(team.id)} disabled={updating}>
            {t("changeTeams")}
          </Button>
        </>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => setOpenFor(team.id)}>
          <DownloadSimpleIcon size={14} />
          {t("import")}
        </Button>
      )}
      <DbuImportDialog
        open={openFor !== null}
        onOpenChange={(o) => !o && setOpenFor(null)}
        initialQuery={team.name}
        link={team.dbu}
        onImport={(data, link) => apply(openFor ?? team.id, data, link)}
      />
    </div>
  );
}
