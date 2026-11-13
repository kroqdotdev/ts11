"use client";

import { useReducedMotion } from "motion/react";
import { useState, useSyncExternalStore } from "react";
import type { StadiumProps } from "@/components/lofi/LofiStadium";
import { blankTeam, defaultDesign, defaultMatch } from "@/lib/demo";
import { FORMATIONS, formationSlots } from "@/lib/formation";
import { initials } from "@/lib/format";
import { toBoardText } from "@/lib/lofi/font";
import { uid } from "@/lib/id";
import { KITS, type Kit } from "@/lib/kits";
import { autoLineup, readSquad } from "@/lib/squad";
import { flushStorage, useStudio } from "@/lib/store";
import type { Colors, LookId, Player, Team, TeamSize } from "@/lib/types";

export const STEPS = ["Name", "Crest", "Kit", "Squad"] as const;
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
}

/** The draft as a club on a sample fixture, for the preview on the first steps. */
export function previewTeam(d: Draft): Team {
  const base = blankTeam("preview");
  return {
    ...base,
    name: d.name.trim() || "Your club",
    shortName: (d.shortName.trim() || initials(d.name || "Your club")).toUpperCase(),
    crest: d.crest,
    crestKind: d.crestKind,
    colors: d.colors,
    match: defaultMatch({
      opponent: "Weybridge Albion",
      // When a long club name makes the graphic fall back to short names on both sides,
      // the sample opponent still reads as a club, not just its initials.
      opponentShort: "Weybridge",
      opponentColors: { primary: "#f0c419", secondary: "#141414" },
      competition: "League",
      venue: "",
      goals: [],
    }),
  };
}

function buildTeam(d: Draft, id: string): Team {
  const base = blankTeam(id);
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
  return {
    ...base,
    name: d.name.trim() || "My club",
    shortName: (d.shortName.trim() || initials(d.name || "My club")).toUpperCase(),
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

  function finish() {
    const done = () => {
      const team = buildTeam(d, uid());
      completeSetup(team, first);
      updateDesign({
        look: d.look,
        colors: null,
        kind: team.players.length ? "lineup" : "fixture",
        ...(first ? { headlines: defaultDesign().headlines } : {}),
      });
      flushStorage();
      onDone();
    };
    // A last lap of the ground before the studio opens.
    if (reduce) return done();
    setKickoff(true);
    window.setTimeout(done, 1500);
  }

  const ticker = kickoff
    ? `KICK-OFF! ENJOY IT, ${board(d.name)}`
    : [
        named ? `WELCOME TO ${board(d.name)}` : "WHAT IS YOUR CLUB CALLED?",
        d.crest ? "LOOKING SHARP" : "SHOW US YOUR CREST",
        "WHAT DO YOU PLAY IN?",
        parsed.length ? `${parsed.length} PLAYERS IN THE SQUAD` : "WHO IS IN THE SQUAD?",
      ][step];

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
      "FREE FOREVER",
      "NO WATERMARK",
      "NO SIGN-UP",
    ],
    formation,
    waveKey: `${step}-${kickoff}`,
    kickable: true,
  };

  return {
    d,
    patch,
    step,
    dir,
    go,
    kickoff,
    finish,
    begin,
    parsed,
    ignored: read.ignored,
    restore: (key: string) => setD((prev) => ({ ...prev, restored: [...prev.restored, key] })),
    named,
    canContinue,
    last,
    stadium,
  };
}
