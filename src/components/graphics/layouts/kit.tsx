import type { ReactNode } from "react";
import type { GraphicKind, LookId } from "@/lib/types";
import {
  ProgrammeFixture,
  ProgrammeFixtures,
  ProgrammeGoal,
  ProgrammeLineup,
  ProgrammeMotm,
  ProgrammeResult,
  ProgrammeSubs,
} from "./Programme";
import {
  PosterFixture,
  PosterFixtures,
  PosterGoal,
  PosterLineup,
  PosterMotm,
  PosterResult,
  PosterSubs,
} from "./Poster";
import type { LayoutProps } from "./shared";
import {
  SplitFixture,
  SplitFixtures,
  SplitGoal,
  SplitLineup,
  SplitMotm,
  SplitResult,
  SplitSubs,
} from "./Split";

type KitKind = Exclude<GraphicKind, "pitch">;
type KitLayout = (p: LayoutProps) => ReactNode;

/**
 * Layouts of their own for the kit-pattern looks (Panel, Stripes, Hoops, Halves, Sash).
 * Graphic.tsx uses these before the shared layouts. Team news (pitch) is deliberately
 * left to the shared layout so the studio's drag handles keep lining up.
 *
 * Hoops is a matchday programme cover, Sash a poster built on the diagonal, and
 * Halves splits the frame: club against club, or picture against words.
 */
export const KIT_LAYOUTS: Partial<Record<LookId, Partial<Record<KitKind, KitLayout>>>> = {
  hoops: {
    fixture: (p) => <ProgrammeFixture {...p} />,
    lineup: (p) => <ProgrammeLineup {...p} />,
    result: (p) => <ProgrammeResult {...p} />,
    halftime: (p) => <ProgrammeResult {...p} half />,
    goal: (p) => <ProgrammeGoal {...p} />,
    subs: (p) => <ProgrammeSubs {...p} />,
    motm: (p) => <ProgrammeMotm {...p} />,
    fixtures: (p) => <ProgrammeFixtures {...p} />,
  },
  sash: {
    fixture: (p) => <PosterFixture {...p} />,
    lineup: (p) => <PosterLineup {...p} />,
    result: (p) => <PosterResult {...p} />,
    halftime: (p) => <PosterResult {...p} half />,
    goal: (p) => <PosterGoal {...p} />,
    subs: (p) => <PosterSubs {...p} />,
    motm: (p) => <PosterMotm {...p} />,
    fixtures: (p) => <PosterFixtures {...p} />,
  },
  halves: {
    fixture: (p) => <SplitFixture {...p} />,
    lineup: (p) => <SplitLineup {...p} />,
    result: (p) => <SplitResult {...p} />,
    halftime: (p) => <SplitResult {...p} half />,
    goal: (p) => <SplitGoal {...p} />,
    subs: (p) => <SplitSubs {...p} />,
    motm: (p) => <SplitMotm {...p} />,
    fixtures: (p) => <SplitFixtures {...p} />,
  },
};
