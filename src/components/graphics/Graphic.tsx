import type { ReactNode } from "react";
import type { Design, GraphicKind, LookId, Team } from "@/lib/types";
import { Fixture } from "./Fixture";
import { pitchRect, tokenSize, type Rect } from "./LineupPitch";
import {
  BackPageFixture,
  BackPageFixtures,
  BackPageGoal,
  BackPageLineup,
  BackPageMotm,
  BackPagePitch,
  backPagePitchRect,
  BackPageResult,
  BackPageSubs,
} from "./layouts/BackPage";
import {
  ScreenFixture,
  ScreenFixtures,
  ScreenGoal,
  ScreenLineup,
  ScreenMotm,
  ScreenPitch,
  screenPitchGeometry,
  ScreenResult,
  ScreenSubs,
} from "./layouts/BigScreen";
import {
  NightFixture,
  NightFixtures,
  NightGoal,
  NightLights,
  NightLineup,
  NightMotm,
  NightPitch,
  nightPitchGeometry,
  NightResult,
  NightSubs,
} from "./layouts/Scoreboard";
import { KIT_LAYOUTS } from "./layouts/kit";
import type { LayoutProps } from "./layouts/shared";
import { StoryBand } from "./layouts/story";
import {
  WindowFixture,
  WindowFixtures,
  WindowGoal,
  WindowLineup,
  WindowMotm,
  WindowPitch,
  windowPitchGeometry,
  WindowResult,
  WindowSubs,
} from "./layouts/Windows";
import { LineupList } from "./LineupList";
import { LineupPitch } from "./LineupPitch";
import {
  FixturesGraphic,
  GoalGraphic,
  goalLettering,
  MotmGraphic,
  motmLettering,
  SubsGraphic,
} from "./Moments";
import { Frame } from "./parts";
import { Result } from "./Result";
import { buildTheme, contentTheme } from "./theme";

type Layout = (props: LayoutProps) => ReactNode;

/** The shared layouts, used by the kit-pattern looks and wherever a look has no layout of its own. */
const BASE: Record<GraphicKind, Layout> = {
  fixture: (p) => <Fixture {...p} />,
  lineup: (p) => <LineupList {...p} />,
  pitch: (p) => <LineupPitch {...p} />,
  goal: (p) => <GoalGraphic {...p} />,
  halftime: (p) => <Result {...p} half />,
  result: (p) => <Result {...p} />,
  subs: (p) => <SubsGraphic {...p} />,
  motm: (p) => <MotmGraphic {...p} />,
  fixtures: (p) => <FixturesGraphic {...p} />,
};

/** Floodlit layouts all sit under the same pair of floodlights. */
function lit(layouts: Record<GraphicKind, Layout>): Record<GraphicKind, Layout> {
  return Object.fromEntries(
    Object.entries(layouts).map(([kind, layout]) => [
      kind,
      (p: LayoutProps) => (
        <>
          <NightLights theme={p.theme} />
          {layout(p)}
        </>
      ),
    ]),
  ) as Record<GraphicKind, Layout>;
}

/**
 * Looks with a structure of their own, not just a different backdrop:
 * Clean is a newspaper back page, Floodlit puts it on the scoreboard, Pixel lays
 * it out in desktop windows and Stadium plays it on the big screen.
 */
const LAYOUTS: Partial<Record<LookId, Partial<Record<GraphicKind, Layout>>>> = {
  ...KIT_LAYOUTS,
  clean: {
    fixture: (p) => <BackPageFixture {...p} />,
    lineup: (p) => <BackPageLineup {...p} />,
    result: (p) => <BackPageResult {...p} />,
    halftime: (p) => <BackPageResult {...p} half />,
    goal: (p) => <BackPageGoal {...p} />,
    pitch: (p) => <BackPagePitch {...p} />,
    subs: (p) => <BackPageSubs {...p} />,
    motm: (p) => <BackPageMotm {...p} />,
    fixtures: (p) => <BackPageFixtures {...p} />,
  },
  night: lit({
    fixture: (p) => <NightFixture {...p} />,
    lineup: (p) => <NightLineup {...p} />,
    pitch: (p) => <NightPitch {...p} />,
    result: (p) => <NightResult {...p} />,
    halftime: (p) => <NightResult {...p} half />,
    goal: (p) => <NightGoal {...p} />,
    subs: (p) => <NightSubs {...p} />,
    motm: (p) => <NightMotm {...p} />,
    fixtures: (p) => <NightFixtures {...p} />,
  }),
  pixel: {
    fixture: (p) => <WindowFixture {...p} />,
    lineup: (p) => <WindowLineup {...p} />,
    result: (p) => <WindowResult {...p} />,
    halftime: (p) => <WindowResult {...p} half />,
    goal: (p) => <WindowGoal {...p} />,
    pitch: (p) => <WindowPitch {...p} />,
    subs: (p) => <WindowSubs {...p} />,
    motm: (p) => <WindowMotm {...p} />,
    fixtures: (p) => <WindowFixtures {...p} />,
  },
  stadium: {
    fixture: (p) => <ScreenFixture {...p} />,
    lineup: (p) => <ScreenLineup {...p} />,
    result: (p) => <ScreenResult {...p} />,
    halftime: (p) => <ScreenResult {...p} half />,
    goal: (p) => <ScreenGoal {...p} />,
    pitch: (p) => <ScreenPitch {...p} />,
    subs: (p) => <ScreenSubs {...p} />,
    motm: (p) => <ScreenMotm {...p} />,
    fixtures: (p) => <ScreenFixtures {...p} />,
  },
};

/**
 * Where the Team news pitch sits on the full canvas (story safe area included)
 * and how big a player's token is, for the studio's drag handles. Follows the
 * look, since the looks with their own layout draw the pitch in their own place.
 */
export function pitchLayout(team: Team, design: Design): { rect: Rect; token: number } {
  const theme = buildTheme(design, team.colors);
  const inner = contentTheme(theme, design.format);
  const top = inner.bleedTop;
  const shown = team.lineup.starters.filter(Boolean).length;
  let rect: Rect;
  let scale = 1;
  switch (design.look) {
    case "night": {
      const g = nightPitchGeometry(inner, design, shown);
      rect = g.rect;
      // The LED pitch marks a player with their number, about two dots tall.
      return {
        rect: { ...rect, y: rect.y + top },
        token: Math.max(g.dot * 9, tokenSize(inner, rect, team.lineup.size) * 0.5),
      };
    }
    case "clean":
      rect = backPagePitchRect(inner, design);
      scale = 0.62;
      break;
    case "pixel":
      rect = windowPitchGeometry(inner, design).rect;
      scale = 0.66;
      break;
    case "stadium":
      rect = screenPitchGeometry(inner, design).rect;
      scale = 0.62;
      break;
    default:
      rect = pitchRect(inner, design);
  }
  return {
    rect: { ...rect, y: rect.y + top },
    token: tokenSize(inner, rect, team.lineup.size) * scale,
  };
}

/** Whether a look draws its own layout for this graphic (rather than the shared one). */
export function hasOwnLayout(look: LookId, kind: GraphicKind): boolean {
  return !!LAYOUTS[look]?.[kind];
}

/**
 * Renders a match-day graphic at its native pixel size. Pure and hook-free so it
 * can render on the server (landing page) and in the studio, where the same DOM
 * node is exported to PNG.
 */
export function Graphic({ team, design: raw, id }: { team: Team; design: Design; id?: string }) {
  // Photos can be limited to some graphics; drop them from the rest.
  const usesPhoto = !raw.backgroundOn || raw.backgroundOn.includes(raw.kind);
  const usesCutout = !raw.featureOn || raw.featureOn.includes(raw.kind);
  const design: Design =
    usesPhoto && usesCutout
      ? raw
      : {
          ...raw,
          background: usesPhoto ? raw.background : { ...raw.background, image: null },
          featureImage: usesCutout ? raw.featureImage : null,
        };
  const theme = buildTheme(design, team.colors);
  // Content stays inside the story safe area; the backdrop still fills the frame.
  const inner = contentTheme(theme, design.format);
  const layout = LAYOUTS[design.look]?.[design.kind] ?? BASE[design.kind];
  const lettering =
    design.kind === "goal"
      ? goalLettering(team)
      : design.kind === "motm"
        ? motmLettering(team)
        : undefined;
  return (
    <Frame theme={theme} design={design} team={team} id={id} lettering={lettering}>
      <div
        style={{ position: "absolute", left: 0, right: 0, top: inner.bleedTop, height: inner.h }}
      >
        {layout({ team, design, theme: inner })}
      </div>
      <StoryBand team={team} design={design} theme={theme} />
    </Frame>
  );
}
