"use client";

import { ArrowLeftIcon, CheckIcon, PaletteIcon } from "@phosphor-icons/react";
import clsx from "clsx";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, type ReactNode } from "react";
import { Graphic } from "@/components/graphics/Graphic";
import { LOOKS } from "@/components/graphics/theme";
import { ScaledGraphic } from "@/components/landing/ScaledGraphic";
import { BadgePreview } from "@/components/BadgePreview";
import { KitShirt } from "@/components/KitShirt";
import { Window } from "@/components/lofi/Window";
import {
  Button,
  radioGroupKeys,
  rovingTabIndex,
  Segmented,
  TextArea,
  TextInput,
} from "@/components/ui/controls";
import { ColorField, CrestField, useCrestBackground } from "@/components/ui/media";
import { TEAM_SIZES } from "@/lib/formation";
import { defaultDesign } from "@/lib/demo";
import { initials } from "@/lib/format";
import { KITS } from "@/lib/kits";
import type { TeamSize } from "@/lib/types";
import { KitWarning } from "./KitWarning";
import { SquadPreview } from "./SquadPreview";
import { PATTERNS, previewTeam, STEPS, type SetupFlow } from "./useSetupFlow";

/** The draft club on a sample matchday graphic, so the first steps show the payoff. */
function DraftPreview({ flow, note }: { flow: SetupFlow; note: string }) {
  const { d } = flow;
  const team = previewTeam(d);
  const design = {
    ...defaultDesign(),
    kind: "fixture" as const,
    format: "square" as const,
    look: PATTERNS.includes(d.look) ? d.look : ("block" as const),
    footer: "",
  };
  return (
    <figure className="flex items-center gap-4 rounded-[4px] border-2 border-dashed border-rule p-3 short:p-2">
      <div className="w-[clamp(7.5rem,22vh,12rem)] shrink-0 overflow-hidden rounded-[2px] border-2 border-card-ink">
        <ScaledGraphic w={1080} h={1080}>
          <Graphic team={team} design={design} />
        </ScaledGraphic>
      </div>
      <figcaption className="flex min-w-0 flex-col gap-1">
        <span className="truncate font-signage text-[24px] leading-none">
          {d.name.trim() || "Your club"}
        </span>
        <span className="text-xs leading-relaxed text-ink-soft">{note}</span>
        <span className="text-[11px] text-ink-soft/80">Preview: matchday.png</span>
      </figcaption>
    </figure>
  );
}

/**
 * Preset kits plus "Yours": colours typed in by hand stay one arrow-key away,
 * so trying the presets never throws them away.
 */
function KitPicker({ flow }: { flow: SetupFlow }) {
  const { d, patch } = flow;
  const same = (a: { primary: string; secondary: string }) =>
    a.primary.toLowerCase() === d.colors.primary.toLowerCase() &&
    a.secondary.toLowerCase() === d.colors.secondary.toLowerCase();
  const options = [
    ...KITS.map((k) => ({
      id: k.id,
      name: k.name,
      colors: { primary: k.primary, secondary: k.secondary },
      look: k.look,
    })),
    ...(d.custom ? [{ id: "custom", name: "Your colours", colors: d.custom, look: d.look }] : []),
  ];
  const anyOn = options.some((o) => same(o.colors));
  return (
    <div
      className="grid grid-cols-5 gap-2 sm:grid-cols-6"
      role="radiogroup"
      aria-label="Kit"
      onKeyDown={radioGroupKeys}
    >
      {options.map((k, idx) => {
        const on = same(k.colors);
        return (
          <button
            key={k.id}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={rovingTabIndex(on, idx, anyOn)}
            aria-label={k.name}
            title={k.name}
            onClick={() =>
              patch(k.id === "custom" ? { colors: k.colors } : { colors: k.colors, look: k.look })
            }
            className={clsx(
              "relative grid h-14 place-items-center rounded-[4px] border-2 transition-colors",
              on
                ? "border-card bg-card/20 shadow-[3px_3px_0_var(--card-ink)]"
                : "border-transparent hover:bg-well",
            )}
          >
            <KitShirt
              primary={k.colors.primary}
              secondary={k.colors.secondary}
              look={k.look}
              size={36}
            />
            {k.id === "custom" && (
              <span className="absolute right-1 bottom-1 grid size-4 place-items-center rounded-[2px] bg-card text-card-ink">
                <PaletteIcon size={11} weight="bold" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function Question({
  title,
  hint,
  children,
  screen,
}: {
  title: string;
  hint: string;
  children: ReactNode;
  screen: boolean;
}) {
  return (
    <div className="flex flex-col gap-5 short:gap-3">
      <div className="flex flex-col gap-1.5 short:gap-1">
        <h1
          className={clsx(
            "font-signage text-[clamp(2.25rem,3.2vw,2.75rem)] leading-[0.9] short:text-[2rem]",
            screen && "text-card",
          )}
        >
          {title}
        </h1>
        <p
          className={clsx(
            "text-[15px] leading-relaxed text-ink-soft short:max-w-[60ch] short:text-[13px] short:leading-snug",
            screen ? "max-w-[56ch]" : "max-w-[46ch]",
          )}
        >
          {hint}
        </p>
      </div>
      {children}
    </div>
  );
}

function Progress({ step }: { step: number }) {
  return (
    <ol className="flex gap-1" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
      {STEPS.map((label, i) => (
        <li
          key={label}
          title={label}
          className={clsx(
            "h-3 w-5 border-2 border-card-ink",
            i <= step ? "bg-card" : "bg-chalk/20",
          )}
        />
      ))}
    </ol>
  );
}

/**
 * The club setup questions. `screen` draws them as the stadium's big screen
 * (dark, LED type); otherwise they sit in a low-fi window (phones).
 */
export function SetupForm({
  flow,
  variant,
  narrow = false,
  onLeave,
  leaveLabel,
}: {
  flow: SetupFlow;
  variant: "screen" | "window";
  /** The big screen on a phone: it grows with its content instead of filling a fixed rect. */
  narrow?: boolean;
  /** Back out of the first question (e.g. back to the stands on the landing page). */
  onLeave?: () => void;
  leaveLabel?: string;
}) {
  const { d, patch, step, dir, go, kickoff, finish, parsed, ignored, restore, canContinue, last } =
    flow;
  const reduce = useReducedMotion();
  const nameId = useId();
  const shortId = useId();
  const screen = variant === "screen";
  const crestBg = useCrestBackground(d.crest);

  const form = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!canContinue || kickoff) return;
        if (last) finish();
        else go(step + 1);
      }}
      className={clsx(
        "flex min-h-0 flex-1 flex-col",
        screen ? "gap-5 short:gap-3" : "gap-6 p-5 sm:p-6",
      )}
    >
      <div
        className={clsx(
          "relative min-h-0 flex-1 overflow-x-hidden pb-3",
          !narrow && "scrollbar-thin overflow-y-auto pr-2",
        )}
      >
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div
            key={step}
            initial={reduce ? false : { opacity: 0, x: 24 * dir }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: -24 * dir }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
          >
            {step === 0 && (
              <Question
                screen={screen}
                title="What's your club called?"
                hint="The crowd will spell it out. It also goes on your matchday graphics, and the short name goes on your badge."
              >
                <div className="grid grid-cols-[1fr_6.5rem] gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={nameId} className="text-[13px] font-medium">
                      Club name
                    </label>
                    <TextInput
                      id={nameId}
                      autoFocus
                      value={d.name}
                      placeholder="e.g. Ashby Vale"
                      onChange={(e) =>
                        patch({
                          name: e.target.value,
                          ...(d.shortEdited
                            ? {}
                            : { shortName: e.target.value ? initials(e.target.value, 4) : "" }),
                        })
                      }
                      className="h-12 text-base"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={shortId} className="text-[13px] font-medium">
                      Short name
                    </label>
                    <TextInput
                      id={shortId}
                      value={d.shortName}
                      maxLength={6}
                      onChange={(e) =>
                        patch({ shortName: e.target.value.toUpperCase(), shortEdited: true })
                      }
                      className="h-12 text-base uppercase"
                    />
                  </div>
                </div>
                <DraftPreview
                  flow={flow}
                  note="Your badge until you add a crest. Colours come next."
                />
              </Question>
            )}

            {step === 1 && (
              <Question
                screen={screen}
                title="Add your crest"
                hint="It goes on every graphic. A cut-out PNG sits straight on your colours; a crest on a white square gets a neat plate. Skip it to use a shield with your initials."
              >
                <CrestField
                  value={d.crest}
                  onChange={(crest, crestKind) => patch({ crest, crestKind })}
                  placeholder={<BadgePreview name={d.name} colors={d.colors} size={44} />}
                />
                <DraftPreview
                  flow={flow}
                  note={
                    d.crest
                      ? crestBg
                        ? "On a square, so it sits on a plate. Remove the background to lose the plate."
                        : "Looking sharp. It sits on every graphic like this."
                      : "Without a crest, your initials go on a shield in your colours."
                  }
                />
              </Question>
            )}

            {step === 2 && (
              <Question
                screen={screen}
                title="What do you play in?"
                hint="Pick the nearest kit and watch the crowd change. Fine-tune the colours below."
              >
                <KitPicker flow={flow} />
                <div className="grid grid-cols-2 gap-3">
                  <ColorField
                    label="Main colour"
                    value={d.colors.primary}
                    onChange={(primary) => {
                      const colors = { ...d.colors, primary };
                      patch({ colors, custom: colors });
                    }}
                  />
                  <ColorField
                    label="Second colour"
                    value={d.colors.secondary}
                    onChange={(secondary) => {
                      const colors = { ...d.colors, secondary };
                      patch({ colors, custom: colors });
                    }}
                  />
                </div>
                <KitWarning
                  colors={d.colors}
                  onSecondary={(secondary) => {
                    const colors = { ...d.colors, secondary };
                    patch({ colors, custom: colors });
                  }}
                />
                <div
                  className="flex gap-1.5"
                  role="radiogroup"
                  aria-label="Pattern"
                  onKeyDown={radioGroupKeys}
                >
                  {PATTERNS.map((look, idx) => (
                    <button
                      key={look}
                      type="button"
                      role="radio"
                      aria-checked={d.look === look}
                      tabIndex={rovingTabIndex(d.look === look, idx, PATTERNS.includes(d.look))}
                      onClick={() => patch({ look })}
                      className={clsx(
                        "flex flex-1 flex-col items-center gap-1 rounded-[4px] border-2 py-1.5 text-xs transition-colors",
                        d.look === look
                          ? "border-card bg-card/20 font-semibold"
                          : "border-transparent text-ink-soft hover:bg-well",
                      )}
                    >
                      <KitShirt
                        primary={d.colors.primary}
                        secondary={d.colors.secondary}
                        look={look}
                        size={26}
                      />
                      {LOOKS[look].label}
                    </button>
                  ))}
                </div>
              </Question>
            )}

            {step === 3 && (
              <Question
                screen={screen}
                title="Who's in the squad?"
                hint="Paste it from the team chat, messages and all. Numbers, positions, (c) for the captain and a “Subs:” line are picked up; the chat is left out."
              >
                <div
                  className={clsx(
                    "flex gap-1.5",
                    screen && !narrow ? "items-center gap-4" : "flex-col",
                  )}
                >
                  <span className="shrink-0 text-[13px] font-medium">Players per side</span>
                  <div className="min-w-0 flex-1">
                    <Segmented<`${TeamSize}`>
                      label="Players per side"
                      value={`${d.size}`}
                      onChange={(v) => patch({ size: Number(v) as TeamSize })}
                      options={TEAM_SIZES.map((n) => ({
                        value: `${n}` as `${TeamSize}`,
                        label: `${n}`,
                        title: `${n}-a-side`,
                      }))}
                    />
                  </div>
                </div>
                {/* Side by side on the big screen, each the same fixed height: the paste
                    scrolls in its box and the read-back list in its column, nothing else. */}
                <div
                  className={clsx(
                    "grid gap-4",
                    // The paste box narrower, the read-back list wider in two columns.
                    screen &&
                      !narrow &&
                      "h-[clamp(8.5rem,calc(100dvh-39.5rem),22rem)] grid-cols-[minmax(0,2fr)_minmax(0,3fr)] grid-rows-[minmax(0,1fr)] short:h-[clamp(8.5rem,calc(100dvh-31.5rem),22rem)]",
                  )}
                >
                  <TextArea
                    aria-label="Squad list"
                    value={d.squad}
                    onChange={(e) => patch({ squad: e.target.value })}
                    placeholder={
                      "1 Tom Hadley GK\n4 Ryan Desai DEF\n10 Callum Price MID\n9 Harry Lund ATT\nSubs: Talbot, Fenn"
                    }
                    className={clsx(
                      "font-mono text-[13px]",
                      screen && !narrow ? "h-full min-h-0! resize-none" : "min-h-24",
                    )}
                  />
                  <SquadPreview
                    players={parsed}
                    ignored={ignored}
                    onRestore={restore}
                    size={d.size}
                    columns={screen && !narrow}
                    rootClassName={clsx(screen && !narrow && "min-h-0")}
                    className={clsx(
                      screen && !narrow && "min-h-0 flex-1 scrollbar-thin overflow-y-auto pr-1",
                    )}
                  />
                </div>
              </Question>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2">
        {step > 0 ? (
          <Button variant="ghost" onClick={() => go(step - 1)} disabled={kickoff}>
            <ArrowLeftIcon size={16} />
            Back
          </Button>
        ) : onLeave ? (
          <Button variant="ghost" onClick={onLeave}>
            <ArrowLeftIcon size={16} />
            {leaveLabel ?? "Back"}
          </Button>
        ) : (
          <span />
        )}
        <div className="ml-auto flex items-center gap-2">
          {(step === 1 || step === 3) && !(step === 1 && d.crest) && (
            <Button
              variant="ghost"
              disabled={kickoff}
              onClick={() => (last ? finish() : go(step + 1))}
            >
              Skip
            </Button>
          )}
          <Button
            type="submit"
            variant="primary"
            disabled={!canContinue || kickoff}
            className="h-11 px-5"
          >
            {last ? (
              <>
                <CheckIcon size={16} weight="bold" />
                Open the studio
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </div>
      </div>
    </form>
  );

  if (!screen) {
    return (
      <Window title="Club setup" right={<Progress step={step} />} className="w-full">
        {form}
      </Window>
    );
  }

  // The big screen: dark glass, LED header, faint scanlines over the top.
  return (
    <div
      className={clsx(
        "screen-theme relative flex w-full flex-col gap-5 overflow-hidden bg-paper text-ink short:gap-3",
        narrow ? "p-4" : "h-full p-5 xl:p-7 short:p-4 short:xl:p-5",
      )}
    >
      <div className="flex shrink-0 items-center justify-between">
        <span className="font-[family-name:var(--font-dots)] text-[22px] leading-none font-bold tracking-wider text-card">
          CLUB SETUP
        </span>
        <Progress step={step} />
      </div>
      {form}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,rgb(255_255_255/0.025)_0_1px,transparent_1px_3px)]"
      />
    </div>
  );
}
