"use client";

import { useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";
import type { StadiumProps } from "@/components/lofi/LofiStadium";
import { crestKindOf } from "@/lib/crest";
import { matchFromFixture, nextFixture, toFixtures, type DbuImport } from "@/lib/dbu";
import { blankTeam, defaultDesign, defaultMatch } from "@/lib/demo";
import { FORMATIONS, formationSlots } from "@/lib/formation";
import { initials } from "@/lib/format";
import { toBoardText } from "@/lib/lofi/font";
import { uid } from "@/lib/id";
import { KITS, type Kit } from "@/lib/kits";
import { autoLineup, readSquad } from "@/lib/squad";
import { flushStorage, useStudio } from "@/lib/store";
import type {
  Colors,
  DbuLink,
  Fixture,
  Language,
  LookId,
  Player,
  Team,
  TeamSize,
} from "@/lib/types";

/** The questions in order; their names are `setup.steps.<step>` in messages/. */
export const STEPS = ["name", "crest", "kit", "squad"] as const;
export const PATTERNS: LookId[] = ["block", "stripes", "hoops", "halves", "sash"];

export interface Draft {
  name: string;
  shortName: string;
  shortEdited: boolean;
  crest: string | null;
  /** Whether the crest fills its square (gets a plate on graphics) or is cut out. */
  crestKind?: "opaque" | "transparent";
  colors: Colors;
  look: LookId;
  size: TeamSize;
  squad: string;
  /** Pasted lines read as players although they looked like chat. */
  restored: string[];
  /** Colours typed in by hand, kept so picking a preset never loses them. */
  custom: Colors | null;
  /**
   * Fixtures imported from DBU, the teams they came from, and the crest DBU gave (so a
   * later import knows whether the crest on the draft is DBU's or the person's own).
   */
  dbu: { link: DbuLink; fixtures: Fixture[]; crest: string | null } | null;
}

/** Words the setup puts on the club and its sample graphic, in the interface language. */
export interface DraftWords {
  language: Language;
  /** The name a club without one gets: "Your club" in the preview, "My club" when saved. */
  unnamed: string;
  opponent: string;
  opponentShort: string;
  competition: string;
}

/** The draft as a club on a sample fixture, for the preview on the first steps. */
export function previewTeam(d: Draft, words: DraftWords): Team {
  const base = blankTeam("preview", words.language);
  return {
    ...base,
    name: d.name.trim() || words.unnamed,
    shortName: (d.shortName.trim() || initials(d.name || words.unnamed)).toUpperCase(),
    crest: d.crest,
    crestKind: d.crestKind,
    colors: d.colors,
    match: defaultMatch(
      {
        opponent: words.opponent,
        // When a long club name makes the graphic fall back to short names on both sides,
        // the sample opponent still reads as a club, not just its initials.
        opponentShort: words.opponentShort,
        opponentColors: { primary: "#f0c419", secondary: "#141414" },
        competition: words.competition,
        venue: "",
        goals: [],
      },
      words.language,
    ),
  };
}

/** The club as saved; it prints its graphics in the language it was set up in. */
function buildTeam(d: Draft, id: string, language: Language, unnamed: string): Team {
  const base = blankTeam(id, language);
  const parsed = readSquad(d.squad, new Set(d.restored)).players.map((p) => ({
    ...p,
    id: uid(),
  }));
  const players: Player[] = parsed.map(({ id, name, number, position }) => ({
    id,
    name,
    number,
    position,
  }));
  const next = d.dbu ? nextFixture(d.dbu.fixtures) : null;
  return {
    ...base,
    ...(d.dbu ? { fixtures: d.dbu.fixtures, dbu: d.dbu.link } : {}),
    // The next game is ready on the matchday graphic.
    match: next ? matchFromFixture(base.match, next) : base.match,
    name: d.name.trim() || unnamed,
    shortName: (d.shortName.trim() || initials(d.name || unnamed)).toUpperCase(),
    crest: d.crest,
    crestKind: d.crestKind,
    colors: d.colors,
    players,
    lineup: autoLineup(parsed, d.size),
  };
}

/** The scoreboard only knows A to Z, digits and a little punctuation. */
export const board = toBoardText;

/** Formation spots seen from the side: own goal on the left, attacking right. */
function sideOnFormation(size: TeamSize, count: number) {
  return formationSlots(FORMATIONS[size][0], size)
    .slice(0, count)
    .map((s) => ({
      x: 0.46 + ((89 - s.y) / 74) * 0.46,
      y: 0.1 + (s.x / 100) * 0.8,
      keeper: s.index === 0,
    }));
}

function readClock(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

/** The time of day, for the scoreboard. Empty while prerendering. */
function useClock(): string {
  return useSyncExternalStore(
    (notify) => {
      const id = window.setInterval(notify, 15_000);
      return () => window.clearInterval(id);
    },
    readClock,
    () => "",
  );
}

const WARM_UP = [
  { x: 0.5, y: 0.35 },
  { x: 0.56, y: 0.6 },
  { x: 0.62, y: 0.4 },
];

export type SetupFlow = ReturnType<typeof useSetupFlow>;

/**
 * State for the club setup, shared by the landing page (where it plays out on
 * the stadium's big screen) and the studio's first run.
 */
export function useSetupFlow({
  first,
  onDone,
}: {
  first: boolean;
  /** Called once the club is saved. */
  onDone: () => void;
}) {
  const completeSetup = useStudio((s) => s.completeSetup);
  const updateDesign = useStudio((s) => s.updateDesign);
  const reduce = useReducedMotion();
  const clock = useClock();
  const language = useLocale();
  const t = useTranslations("setup");

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [kickoff, setKickoff] = useState(false);
  /** Set when arriving from the landing page with a kit already picked. */
  const [kitChosen, setKitChosen] = useState(false);
  const [d, setD] = useState<Draft>({
    name: "",
    shortName: "",
    shortEdited: false,
    crest: null,
    colors: { primary: KITS[0].primary, secondary: KITS[0].secondary },
    look: KITS[0].look,
    size: 11,
    squad: "",
    restored: [],
    custom: null,
    dbu: null,
  });

  /** True once the kit has been picked in the setup itself (not just carried in). */
  const [kitTouched, setKitTouched] = useState(false);
  const patch = (p: Partial<Draft>) => {
    if (p.colors || p.look) setKitTouched(true);
    setD((prev) => ({ ...prev, ...p }));
  };
  const read = readSquad(d.squad, new Set(d.restored));
  const parsed = read.players;
  const last = step === STEPS.length - 1;
  const named = d.name.trim().length > 0;
  const canContinue = step !== 0 || named;
  const short = board(d.shortName.trim() || (named ? initials(d.name, 4) : "HOME"));

  const go = (to: number) => {
    setDir(to > step ? 1 : -1);
    setStep(to);
  };

  /** Starts over, optionally wearing a kit picked before the setup opened. */
  function begin(kit?: Kit) {
    setStep(0);
    setDir(1);
    setKickoff(false);
    if (kit) {
      setKitChosen(true);
      if (!kitTouched)
        setD((prev) => ({
          ...prev,
          colors: { primary: kit.primary, secondary: kit.secondary },
          look: kit.look,
        }));
    }
  }

  /** Fills the club in from DBU: name, crest, colours and fixtures. */
  async function importDbu(data: DbuImport, link: DbuLink) {
    const crest = data.club.crest;
    const crestKind = crest ? await crestKindOf(crest) : undefined;
    const colors = data.club.colors;
    setD((prev) => {
      // The crest from an earlier import goes with that club; one the person added stays.
      const ownCrest = !!prev.crest && prev.crest !== prev.dbu?.crest;
      return {
        ...prev,
        name: data.club.name,
        shortName: prev.shortEdited ? prev.shortName : initials(data.club.name, 4),
        ...(crest ? { crest, crestKind } : ownCrest ? {} : { crest: null, crestKind: undefined }),
        // DBU names the colours, not the pattern, so a plain shirt is the honest start.
        ...(colors ? { colors, custom: colors, look: "block" as const } : {}),
        dbu: { link, fixtures: toFixtures(data), crest },
      };
    });
    if (colors) setKitTouched(true);
  }

  function finish() {
    const done = () => {
      const team = buildTeam(d, uid(), language, t("myClub"));
      completeSetup(team, first);
      updateDesign({
        look: d.look,
        colors: null,
        kind: team.players.length ? "lineup" : "fixture",
        ...(first ? { headlines: defaultDesign(language).headlines } : {}),
      });
      flushStorage();
      onDone();
    };
    // A last lap of the ground before the studio opens.
    if (reduce) return done();
    setKickoff(true);
    window.setTimeout(done, 1500);
  }

  const ticker = board(
    kickoff
      ? t("ticker.kickoff", { club: d.name })
      : [
          named ? t("ticker.welcome", { club: d.name }) : t("ticker.askName"),
          d.crest ? t("ticker.sharp") : t("ticker.askCrest"),
          t("ticker.askKit"),
          parsed.length ? t("ticker.players", { count: parsed.length }) : t("ticker.askSquad"),
        ][step],
  );

  const kitLook = PATTERNS.includes(d.look) ? d.look : "block";
  const formation =
    step === 3 || kickoff
      ? sideOnFormation(d.size, Math.min(parsed.length, d.size))
      : step === 2
        ? WARM_UP
        : [];

  const stadium: Omit<StadiumProps, "className"> = {
    lightsOn: named || kitChosen,
    kit: step >= 2 || kickoff || kitChosen ? { ...d.colors, look: kitLook } : null,
    // No fixture yet, so the board shows the club and the time, like before the gates open.
    scoreLine: clock ? `${short} ${clock}` : short,
    ticker,
    // The crowd spells out the club once it has a name.
    tifo: {
      text: named ? board(d.name) : "TEAMSHEET11",
      short: named ? short : "TS11",
      primary: d.colors.primary,
      secondary: d.colors.secondary,
    },
    boardText: [
      named ? board(d.name) : "TEAMSHEET11.COM",
      board(t("boards.free")),
      board(t("boards.noWatermark")),
      board(t("boards.noSignup")),
    ],
    formation,
    waveKey: `${step}-${kickoff}`,
    kickable: true,
  };

  /** Words for `previewTeam`, in the interface language. */
  const draftWords: DraftWords = {
    language,
    unnamed: t("yourClub"),
    opponent: t("sample.opponent"),
    opponentShort: t("sample.opponentShort"),
    competition: t("sample.competition"),
  };

  return {
    d,
    draftWords,
    patch,
    step,
    dir,
    go,
    kickoff,
    finish,
    begin,
    importDbu,
    parsed,
    ignored: read.ignored,
    restore: (key: string) => setD((prev) => ({ ...prev, restored: [...prev.restored, key] })),
    named,
    canContinue,
    last,
    stadium,
  };
}
