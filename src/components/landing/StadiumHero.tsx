"use client";

import clsx from "clsx";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useState } from "react";
import { Graphic } from "@/components/graphics/Graphic";
import { KitShirt } from "@/components/KitShirt";
import { Window } from "@/components/lofi/Window";
import { radioGroupKeys, rovingTabIndex } from "@/components/ui/controls";
import { LandingSignIn } from "@/components/account/LandingSignIn";
import { Wordmark } from "@/components/Wordmark";
import { defaultDesign, demoTeam } from "@/lib/demo";
import { FORMATIONS, formationSlots } from "@/lib/formation";
import { initials } from "@/lib/format";
import { KITS } from "@/lib/kits";
import { SetupForm } from "@/components/setup/SetupForm";
import { StadiumScene } from "@/components/setup/StadiumScene";
import { useSetupFlow } from "@/components/setup/useSetupFlow";
import { CTA } from "@/lib/brand";
import { scoreboardLine } from "@/lib/lofi/scoreboard";
import { START_EVENT } from "@/lib/events";
import { flushStorage, useHydrated, useStudio, useUi } from "@/lib/store";
import type { Design, FontId, LookId, Team } from "@/lib/types";
import { ScaledGraphic } from "./ScaledGraphic";
import { buttonName } from "./StartLink";

/** One invented club per kit, so each tap reads like a different club's post. */
const CLUBS: { name: string; font: FontId; look: LookId }[] = [
  { name: "Millbrook Rangers", font: "archivo", look: "stripes" },
  { name: "Harlow Fields", font: "jersey", look: "stadium" },
  { name: "Ravensmoor Town", font: "bebas", look: "stripes" },
  { name: "Ashby Vale", font: "archivo", look: "hoops" },
  { name: "Holbeck Saints", font: "jersey", look: "pixel" },
  { name: "Wrenfield United", font: "oswald", look: "halves" },
  { name: "Pellow Rovers", font: "barlow", look: "sash" },
  { name: "Saltmarsh United", font: "jersey", look: "stadium" },
  { name: "Weybridge Albion", font: "anton", look: "stripes" },
  { name: "Kestle Athletic", font: "teko", look: "clean" },
];

const base = demoTeam("hero", "2026-11-21");

function clubFor(i: number): Team {
  const kit = KITS[i];
  const name = CLUBS[i].name;
  return {
    ...base,
    id: kit.id,
    name,
    shortName: initials(name, 4) + "FC",
    colors: { primary: kit.primary, secondary: kit.secondary },
  };
}

/* The line-up, side on, squeezed into the stretch of pitch between the panels. */
const FORMATION = formationSlots(FORMATIONS[11][0], 11).map((s) => ({
  x: 0.4 + ((89 - s.y) / 74) * 0.24,
  y: 0.12 + (s.x / 100) * 0.8,
  keeper: s.index === 0,
}));

function StartButton({
  onStart,
  label,
  className = "",
}: {
  onStart: () => void;
  label: string;
  className?: string;
}) {
  return (
    <a
      href="/studio"
      data-setup-start
      onClick={(e) => {
        e.preventDefault();
        onStart();
      }}
      className={`inline-flex h-12 max-w-full lofi-press items-center justify-center rounded-[4px] border-2 border-card-ink bg-card px-6 text-[15px] font-semibold text-card-ink shadow-[4px_4px_0_var(--card-ink)] ${className}`}
    >
      <span className="truncate">{label}</span>
    </a>
  );
}

export function StadiumHero() {
  /** The kit picked in the hero; -1 is a returning club's own kit. */
  const [i, setI] = useState(-1);
  const reduce = useReducedMotion();
  const router = useRouter();
  const hydrated = useHydrated();
  const onboarded = useStudio((st) => st.onboarded);
  const myTeam = useStudio((st) => st.teams.find((t) => t.id === st.activeTeamId) ?? null);
  const myDesign = useStudio((st) => st.design);
  const skipSetup = useStudio((st) => st.skipSetup);
  const [started, setStarted] = useState(false);
  const flow = useSetupFlow({
    first: true,
    onDone: () => {
      useUi.getState().setIntro(true);
      router.push("/studio");
    },
  });

  // A returning club stays itself in the hero: tapping a kit tries it on, the name stays.
  const mine = hydrated && onboarded && myTeam ? myTeam : null;
  const pick = mine ? i : Math.max(0, i);
  const kit = pick >= 0 ? KITS[pick] : null;
  const colors = kit ? { primary: kit.primary, secondary: kit.secondary } : mine!.colors;
  const club: Team = mine ? { ...mine, colors } : clubFor(pick);
  const patternLook: LookId =
    kit && ["stripes", "hoops", "halves", "sash"].includes(kit.look) ? kit.look : "block";
  const design: Design = mine
    ? { ...myDesign, kind: "lineup", format: "portrait", colors: null }
    : {
        ...defaultDesign(),
        kind: "lineup",
        format: "portrait",
        look: CLUBS[pick].look,
        font: CLUBS[pick].font,
        footer: "",
      };
  const cta = mine ? `Open ${buttonName(mine)}` : CTA;

  const start = () => {
    // Returning clubs, and phones, go straight to the studio.
    if ((hydrated && onboarded) || window.innerWidth < 1024) {
      router.push("/studio");
      return;
    }
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    flow.begin(KITS[Math.max(0, i)]);
    setStarted(true);
  };

  // Buttons further down the page ask the hero to start the setup.
  const onStartEvent = useEffectEvent(() => start());
  useEffect(() => {
    const listener = () => onStartEvent();
    window.addEventListener(START_EVENT, listener);
    return () => window.removeEventListener(START_EVENT, listener);
  }, []);

  const heroStadium = {
    lightsOn: true,
    kit: { ...colors, look: patternLook },
    // Demo clubs are pre-match; a returning club's board shows its own match.
    scoreLine: scoreboardLine(club, { live: !!mine }),
    ticker: mine
      ? `WELCOME BACK, ${club.name.toUpperCase()}`
      : "FREE MATCHDAY GRAPHICS FOR YOUR CLUB - PICK A KIT AND WATCH THE CROWD",
    // The crowd spells out your club if you've set one up, otherwise the name of the game.
    tifo: {
      text: mine ? mine.name : "TEAMSHEET 11",
      short: mine ? mine.shortName : "TS11",
      ...colors,
    },
    boardText: ["FREE FOREVER", "NO WATERMARK", "NO SIGN-UP", "TEAMSHEET11.COM"],
    formation: FORMATION,
    waveKey: i,
    kickable: true,
  };

  return (
    <StadiumScene
      className="lg:min-h-[max(100dvh,760px)]"
      stadium={started ? flow.stadium : heroStadium}
      tifoFrame={{ x: 0.53, width: 0.36 }}
      setup={started}
      onEscape={() => setStarted(false)}
      screen={
        <SetupForm
          flow={flow}
          variant="screen"
          onLeave={() => setStarted(false)}
          leaveLabel="Back to the stands"
        />
      }
      narrowScreen={<SetupForm flow={flow} variant="screen" narrow />}
      header={
        <header className="absolute inset-x-0 top-0 z-20 mx-auto flex h-16 w-full max-w-[1360px] items-center justify-between bg-[#10151c] px-4 lg:bg-transparent lg:px-8">
          <span className="rounded-[4px] bg-[#10151c]/85 px-2.5 py-1.5 text-chalk">
            <Wordmark className="text-[24px]" />
          </span>
          {started ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <LandingSignIn setup />
              <button
                type="button"
                onClick={() => {
                  skipSetup();
                  flushStorage();
                  router.push("/studio");
                }}
                className="lofi-press rounded-[4px] border-2 border-card-ink bg-paper px-3 py-1.5 text-sm font-medium text-ink shadow-[3px_3px_0_var(--card-ink)]"
              >
                Try the example club
              </button>
            </div>
          ) : (
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <LandingSignIn />
              <a
                href="/studio"
                onClick={(e) => {
                  e.preventDefault();
                  start();
                }}
                className="max-w-[60vw] lofi-press truncate rounded-[4px] border-2 border-card-ink bg-paper px-3 py-1.5 text-sm font-medium text-ink shadow-[3px_3px_0_var(--card-ink)]"
              >
                {cta}
              </a>
            </div>
          )}
        </header>
      }
    >
      <HeroPanels
        i={pick}
        setI={setI}
        own={mine ? { ...mine.colors, name: mine.name } : null}
        club={club}
        design={design}
        reduce={!!reduce}
        onStart={start}
        cta={cta}
      />
    </StadiumScene>
  );
}

function HeroPanels({
  i,
  setI,
  own,
  club,
  design,
  reduce,
  onStart,
  cta,
}: {
  i: number;
  setI: (i: number) => void;
  /** A returning club's own kit, offered first. */
  own: { primary: string; secondary: string; name: string } | null;
  club: Team;
  design: Design;
  reduce: boolean;
  onStart: () => void;
  cta: string;
}) {
  const kits = [
    ...(own
      ? [{ idx: -1, primary: own.primary, secondary: own.secondary, look: "block" as LookId }]
      : []),
    ...KITS.map((k, idx) => ({ idx, primary: k.primary, secondary: k.secondary, look: k.look })),
  ];
  return (
    <>
      <div className="relative z-10 mx-auto -mt-20 grid w-full max-w-[1360px] gap-8 px-4 pb-14 lg:mt-0 lg:grid-cols-[minmax(0,440px)_1fr_minmax(0,360px)] lg:items-start lg:gap-6 lg:px-8 lg:pt-28 lg:pb-0">
        <Window
          title="teamsheet11.com"
          className="pointer-events-auto"
          bodyClassName="flex flex-col items-start gap-5 p-6 sm:p-7"
        >
          <h1 className="font-signage text-[clamp(3rem,5vw,4.25rem)] leading-[0.82] text-ink">
            Your XI, in your colours.
          </h1>
          <p className="max-w-[40ch] text-[17px] leading-relaxed text-ink-soft">
            Free line-up, matchday and full-time graphics for your club. Pick a kit, type the names,
            post it before kick-off.
          </p>
          <StartButton onStart={onStart} label={cta} />
        </Window>

        <div aria-hidden className="hidden lg:block" />

        <div className="flex flex-col gap-4">
          <Window
            as="figure"
            className="pointer-events-auto"
            title="starting-xi.png"
            right={<span className="text-xs text-chalk/60">1080 × 1350</span>}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={`${club.id}-${design.look}-${design.font}`}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 26 }}
              >
                <ScaledGraphic w={1080} h={1350}>
                  <Graphic team={club} design={design} />
                </ScaledGraphic>
              </motion.div>
            </AnimatePresence>
          </Window>
          <div
            role="radiogroup"
            aria-label="Try a kit"
            onKeyDown={radioGroupKeys}
            className={clsx(
              "pointer-events-auto grid gap-1 rounded-[4px] border-2 border-card-ink bg-paper p-1.5 shadow-[4px_4px_0_var(--card-ink)]",
              own ? "grid-cols-[repeat(auto-fill,minmax(3rem,1fr))]" : "grid-cols-5",
            )}
          >
            {kits.map((k, n) => (
              <button
                key={k.idx}
                type="button"
                role="radio"
                aria-checked={k.idx === i}
                tabIndex={rovingTabIndex(k.idx === i, n, true)}
                aria-label={
                  k.idx < 0
                    ? `${own!.name}: your kit`
                    : own
                      ? `Try ${KITS[k.idx].name}`
                      : `${CLUBS[k.idx].name}: ${KITS[k.idx].name}`
                }
                title={k.idx < 0 ? "Your kit" : KITS[k.idx].name}
                onClick={() => setI(k.idx)}
                className={clsx(
                  "grid h-10 place-items-center rounded-[3px] border-2 transition-colors",
                  k.idx === i ? "border-card-ink bg-card" : "border-transparent hover:bg-well",
                )}
              >
                <KitShirt primary={k.primary} secondary={k.secondary} look={k.look} size={26} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
