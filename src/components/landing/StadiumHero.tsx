"use client";

import clsx from "clsx";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { Graphic } from "@/components/graphics/Graphic";
import { KitShirt } from "@/components/KitShirt";
import { Window } from "@/components/lofi/Window";
import { radioGroupKeys, rovingTabIndex } from "@/components/ui/controls";
import { LandingSignIn } from "@/components/account/LandingSignIn";
import { LocaleSwitch } from "@/components/i18n/LocaleSwitch";
import { Wordmark } from "@/components/Wordmark";
import { getPathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { defaultDesign, demoTeam } from "@/lib/demo";
import { FORMATIONS, formationSlots } from "@/lib/formation";
import { KITS } from "@/lib/kits";
import { SetupForm } from "@/components/setup/SetupForm";
import { StadiumScene } from "@/components/setup/StadiumScene";
import { useSetupFlow } from "@/components/setup/useSetupFlow";
import { APP_DOMAIN } from "@/lib/brand";
import { toBoardText } from "@/lib/lofi/font";
import { scoreboardLine } from "@/lib/lofi/scoreboard";
import { START_EVENT } from "@/lib/events";
import { flushStorage, useHydrated, useStudio, useUi } from "@/lib/store";
import type { Messages } from "../../../messages";
import type { Design, FontId, LookId, Team } from "@/lib/types";
import { ScaledGraphic } from "./ScaledGraphic";
import { buttonName } from "./StartLink";

/** How each kit is shown off in the hero: one invented club per kit, in its own style. */
const STYLES: { font: FontId; look: LookId }[] = [
  { font: "archivo", look: "stripes" },
  { font: "jersey", look: "stadium" },
  { font: "bebas", look: "stripes" },
  { font: "archivo", look: "hoops" },
  { font: "jersey", look: "pixel" },
  { font: "oswald", look: "halves" },
  { font: "barlow", look: "sash" },
  { font: "jersey", look: "stadium" },
  { font: "anton", look: "stripes" },
  { font: "teko", look: "clean" },
];

/**
 * The invented clubs, so each tap reads like a different club's post: English clubs on
 * the English page, Danish ones on the Danish page. `null` is the demo club itself.
 */
const CLUB_NAMES: Record<Locale, ({ name: string; short: string } | null)[]> = {
  en: [
    { name: "Millbrook Rangers", short: "MRFC" },
    { name: "Harlow Fields", short: "HFFC" },
    { name: "Ravensmoor Town", short: "RTFC" },
    null,
    { name: "Holbeck Saints", short: "HSFC" },
    { name: "Wrenfield United", short: "WUFC" },
    { name: "Pellow Rovers", short: "PRFC" },
    { name: "Saltmarsh United", short: "SUFC" },
    { name: "Weybridge Albion", short: "WAFC" },
    { name: "Kestle Athletic", short: "KAFC" },
  ],
  da: [
    { name: "Mølleby IF", short: "MIF" },
    { name: "Lindely BK", short: "LBK" },
    { name: "Ravnkær FC", short: "RFC" },
    null,
    { name: "Egholt Boldklub", short: "EB" },
    { name: "Stenlund Fremad", short: "SF" },
    { name: "Rødmose IF", short: "RIF" },
    { name: "Strandvig BK", short: "SBK" },
    { name: "Bøgelund IF", short: "BIF" },
    { name: "Nørrevang FC", short: "NFC" },
  ],
};

type KitKey = keyof Messages["setup"]["kits"];

function clubFor(i: number, base: Team, locale: Locale): Team {
  const kit = KITS[i];
  const named = CLUB_NAMES[locale][i];
  return {
    ...base,
    id: kit.id,
    name: named?.name ?? base.name,
    shortName: named?.short ?? base.shortName,
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
  href,
  className = "",
}: {
  onStart: () => void;
  label: string;
  href: string;
  className?: string;
}) {
  return (
    <a
      href={href}
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
  const t = useTranslations("landing");
  const locale = useLocale();
  // The demo clubs speak the page's language, graphics included.
  const base = useMemo(() => demoTeam("hero", "2026-11-21", locale), [locale]);
  const reduce = useReducedMotion();
  const router = useRouter();
  const hydrated = useHydrated();
  const onboarded = useStudio((st) => st.onboarded);
  const myTeam = useStudio((st) => st.teams.find((x) => x.id === st.activeTeamId) ?? null);
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
  const club: Team = mine ? { ...mine, colors } : clubFor(pick, base, locale);
  const patternLook: LookId =
    kit && ["stripes", "hoops", "halves", "sash"].includes(kit.look) ? kit.look : "block";
  const design: Design = mine
    ? { ...myDesign, kind: "lineup", format: "portrait", colors: null }
    : {
        ...defaultDesign(),
        kind: "lineup",
        format: "portrait",
        look: STYLES[pick].look,
        font: STYLES[pick].font,
        footer: "",
      };
  const cta = mine ? t("openClub", { name: buttonName(mine) }) : t("cta");
  const studioHref = getPathname({ href: "/studio", locale });

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
    // The ticker's pixel font has A to Z only, so Danish letters are spelt out (Æ is AE).
    ticker: toBoardText(mine ? t("hero.welcomeBack", { club: club.name }) : t("hero.ticker")),
    // The crowd spells out your club if you've set one up, otherwise the name of the game.
    tifo: {
      text: mine ? mine.name : "TEAMSHEET 11",
      short: mine ? mine.shortName : "TS11",
      ...colors,
    },
    boardText: [
      t("hero.boards.free"),
      t("hero.boards.watermark"),
      t("hero.boards.signUp"),
      APP_DOMAIN.toUpperCase(),
    ],
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
          leaveLabel={t("hero.backToStands")}
        />
      }
      narrowScreen={<SetupForm flow={flow} variant="screen" narrow />}
      header={
        <header className="absolute inset-x-0 top-0 z-20 mx-auto flex h-16 w-full max-w-[1360px] items-center justify-between gap-2 bg-[#10151c] px-4 lg:bg-transparent lg:px-8">
          <span className="shrink-0 rounded-[4px] bg-[#10151c]/85 px-2 py-1.5 text-chalk sm:px-2.5">
            <Wordmark className="text-[22px] sm:text-[24px]" />
          </span>
          {started ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <LocaleSwitch tone="chalk" />
              <LandingSignIn setup />
              <button
                type="button"
                onClick={() => {
                  skipSetup();
                  flushStorage();
                  router.push("/studio");
                }}
                className="lofi-press rounded-[4px] border-2 border-card-ink bg-paper px-3 py-1.5 text-sm font-medium whitespace-nowrap text-ink shadow-[3px_3px_0_var(--card-ink)]"
              >
                {t("hero.tryExample")}
              </button>
            </div>
          ) : (
            <div className="flex min-w-0 items-center gap-1 sm:gap-3">
              {/* Phones have no room for it here; it sits on the first panel instead. */}
              <LocaleSwitch tone="chalk" className="max-sm:hidden" />
              <LandingSignIn />
              <a
                href={studioHref}
                onClick={(e) => {
                  e.preventDefault();
                  start();
                }}
                className="max-w-[60vw] lofi-press truncate rounded-[4px] border-2 border-card-ink bg-paper px-2.5 py-1.5 text-sm font-medium text-ink shadow-[3px_3px_0_var(--card-ink)] sm:px-3"
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
        href={studioHref}
        names={CLUB_NAMES[locale].map((c) => c?.name ?? base.name)}
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
  href,
  names,
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
  href: string;
  /** The invented club shown with each kit. */
  names: string[];
}) {
  const t = useTranslations("landing");
  const tk = useTranslations("setup.kits");
  const kitName = (idx: number) => tk(KITS[idx].id as KitKey);
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
          title={APP_DOMAIN}
          right={<LocaleSwitch tone="chalk" className="-mr-2 sm:hidden" />}
          className="pointer-events-auto"
          bodyClassName="flex flex-col items-start gap-5 p-6 sm:p-7"
        >
          <h1 className="font-signage text-[clamp(3rem,5vw,4.25rem)] leading-[0.82] text-ink">
            {t("hero.title")}
          </h1>
          <p className="max-w-[40ch] text-[17px] leading-relaxed text-ink-soft">{t("hero.lead")}</p>
          <StartButton onStart={onStart} label={cta} href={href} />
        </Window>

        <div aria-hidden className="hidden lg:block" />

        <div className="flex flex-col gap-4">
          <Window
            as="figure"
            className="pointer-events-auto"
            title={t("reel.lineup.file")}
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
            aria-label={t("hero.kitPicker")}
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
                    ? t("hero.ownKitLabel", { club: own!.name })
                    : own
                      ? t("hero.tryKit", { kit: kitName(k.idx) })
                      : t("hero.clubKit", { club: names[k.idx], kit: kitName(k.idx) })
                }
                title={k.idx < 0 ? t("hero.ownKit") : kitName(k.idx)}
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
