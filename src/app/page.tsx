import type { ReactNode } from "react";
import { Graphic } from "@/components/graphics/Graphic";
import { PixelGrass } from "@/components/landing/PixelGrass";
import { Reel } from "@/components/landing/Reel";
import { ScaledGraphic } from "@/components/landing/ScaledGraphic";
import { StadiumHero } from "@/components/landing/StadiumHero";
import { StartLink } from "@/components/landing/StartLink";
import { Window } from "@/components/lofi/Window";
import { Wordmark } from "@/components/Wordmark";
import { APP_DOMAIN, CTA, SOURCE_URL } from "@/lib/brand";
import { defaultDesign, demoTeam } from "@/lib/demo";
import type { Design, FontId, GraphicKind, LookId, Team } from "@/lib/types";

/** Low-fi button: ink outline and a hard shadow that the press pushes into. */
function StudioLink({ className = "" }: { className?: string }) {
  return (
    <StartLink
      className={`inline-flex h-12 max-w-full lofi-press items-center justify-center rounded-[4px] border-2 border-card-ink bg-card px-6 text-[15px] font-semibold whitespace-nowrap text-card-ink shadow-[4px_4px_0_var(--card-ink)] ${className}`}
    >
      {CTA}
    </StartLink>
  );
}

/*
 * One club's match day, start to finish: Ashby Vale 2-1 Corrin Town.
 * Price scores on 23', Hollis levels on 51', Lund wins it on 78'. Every card
 * below tells the same story, so the scores and names agree from one to the next.
 */
const base = demoTeam("ashby", "2026-11-21");
const matchday: Team = base;
// The goal card is stamped 23', so it celebrates the 23rd-minute goal (1-0).
const firstGoal: Team = { ...base, match: { ...base.match, spotlightGoalId: "g1" } };
// By Monday the result is in: the Fixtures graphic leads with this match (2-1)
// and lists the games still to come.
const monday: Team = base;

interface Moment {
  clock: string;
  kind: GraphicKind;
  file: string;
  title: string;
  body: string;
  team: Team;
  look: LookId;
  font: FontId;
}

/* The match, minute by minute. A real sequence, so the clock is the label. */
const REEL: Moment[] = [
  {
    clock: "-1 DAY",
    kind: "fixture",
    file: "matchday.png",
    title: "Matchday",
    body: "Opponent, kick-off and venue.",
    team: matchday,
    look: "stadium",
    font: "jersey",
  },
  {
    clock: "-1 HR",
    kind: "lineup",
    file: "starting-xi.png",
    title: "Starting XI",
    body: "Numbers, names and the bench.",
    team: matchday,
    look: "hoops",
    font: "archivo",
  },
  {
    clock: "-1 HR",
    kind: "pitch",
    file: "team-news.png",
    title: "Team news",
    body: "Your shape, dragged into place.",
    team: matchday,
    look: "stripes",
    font: "oswald",
  },
  {
    clock: "23'",
    kind: "goal",
    file: "goal.png",
    title: "Goal",
    body: "Scorer, minute and the score.",
    team: firstGoal,
    look: "pixel",
    font: "jersey",
  },
  {
    clock: "45'",
    kind: "halftime",
    file: "half-time.png",
    title: "Half time",
    body: "The score at the break.",
    team: matchday,
    look: "block",
    font: "bebas",
  },
  {
    clock: "74'",
    kind: "subs",
    file: "subs.png",
    title: "Substitutions",
    body: "Who came on, who went off.",
    team: matchday,
    look: "halves",
    font: "barlow",
  },
  {
    clock: "90'",
    kind: "result",
    file: "full-time.png",
    title: "Full time",
    body: "Final score and every scorer.",
    team: matchday,
    look: "stadium",
    font: "jersey",
  },
  {
    clock: "90+4'",
    kind: "motm",
    file: "player-of-the-match.png",
    title: "Player of the match",
    body: "Your standout, in lights.",
    team: matchday,
    look: "night",
    font: "teko",
  },
  {
    clock: "MON",
    kind: "fixtures",
    file: "fixtures.png",
    title: "Fixtures",
    body: "The next four games, or results.",
    team: monday,
    look: "clean",
    font: "archivo",
  },
];

function Scoreboard({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-11 min-w-[5.5rem] items-center justify-center rounded-[4px] border-2 border-card-ink bg-[#0b120d] px-3 font-[family-name:var(--font-dots)] text-[26px] leading-none font-bold tracking-wider text-card shadow-[3px_3px_0_var(--card-ink)]">
      {children}
    </span>
  );
}

function shot(m: Moment) {
  const design: Design = {
    ...defaultDesign(),
    kind: m.kind,
    format: "portrait",
    look: m.look,
    font: m.font,
    footer: "",
  };
  return (
    <ScaledGraphic w={1080} h={1350}>
      <Graphic team={m.team} design={design} />
    </ScaledGraphic>
  );
}

const SHEET: [string, string][] = [
  ["Price", "Free, every graphic"],
  ["Sign-up", "Not needed"],
  ["Watermark", "None"],
  ["Your squad is kept", "On this device"],
  ["Exports", "PNG, ready for every feed"],
];

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col bg-grass-deep text-chalk">
      <main className="flex flex-col">
        <StadiumHero />

        {/* The match reel. */}
        <section aria-labelledby="reel" className="border-t-2 border-card-ink py-20 lg:py-28">
          <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-4 px-4 md:px-8">
            <h2 id="reel" className="font-signage text-[clamp(3rem,6vw,5.25rem)] leading-[0.84]">
              Nine graphics, ninety minutes.
            </h2>
            <p className="max-w-[52ch] text-lg leading-relaxed text-chalk/75">
              From the night before to the Monday after. Each one uses your squad, your colours and
              your crest, so it takes a minute, not an evening.
            </p>
          </div>

          <div className="relative mt-12">
            {/* The touchline the scoreboards sit on. */}
            <div aria-hidden className="absolute inset-x-0 top-[89px] h-[3px] bg-chalk/25" />
            <Reel className="relative scrollbar-none flex snap-x snap-mandatory scroll-px-4 gap-7 overflow-x-auto px-4 pb-8 md:scroll-px-8 md:px-8 lg:scroll-px-[max(2rem,calc((100vw-1280px)/2+2rem))] lg:px-[max(2rem,calc((100vw-1280px)/2+2rem))]">
              {REEL.map((m) => (
                <li
                  key={m.file}
                  className="flex w-[264px] shrink-0 snap-start flex-col gap-5 sm:w-[296px]"
                >
                  <Scoreboard>{m.clock}</Scoreboard>
                  <Window as="figure" title={m.file}>
                    {shot(m)}
                  </Window>
                  <div className="flex flex-col gap-1">
                    <h3 className="font-signage text-[30px] leading-none">{m.title}</h3>
                    <p className="text-[15px] text-chalk/70">{m.body}</p>
                  </div>
                </li>
              ))}
            </Reel>
          </div>
        </section>

        {/* The team sheet itself, filled in. */}
        <section className="border-y-2 border-card-ink pixel-turf [--turf-size:128px]">
          <div className="mx-auto grid w-full max-w-[1280px] items-center gap-12 px-4 py-20 md:px-8 lg:grid-cols-[1fr_1fr] lg:py-28">
            <Window title="setup.exe" bodyClassName="flex flex-col items-start gap-5 p-6 sm:p-8">
              <h2 className="font-signage text-[clamp(2.75rem,5vw,4.25rem)] leading-[0.84]">
                Set up once. Done by kick{"‑"}off.
              </h2>
              <p className="max-w-[46ch] text-lg leading-relaxed text-ink-soft">
                Name, crest, colours and squad, in a stadium that fills up as you go. After that,
                every graphic is ready. Next week, pick the line-up and post.
              </p>
              <StudioLink />
            </Window>

            <figure className="paper-theme relative mx-auto w-full max-w-[480px] -rotate-1 rounded-[4px] border-2 border-card-ink bg-paper p-6 text-ink shadow-[8px_8px_0_var(--card-ink)] sm:p-8">
              <figcaption className="flex items-baseline justify-between border-b-2 border-ink pb-3">
                <span className="font-signage text-4xl leading-none">Team sheet</span>
                <span className="text-xs text-ink-soft">{APP_DOMAIN}</span>
              </figcaption>
              <dl className="flex flex-col">
                {SHEET.map(([label, value]) => (
                  <div
                    key={label}
                    className="grid grid-cols-[9.5rem_1fr] items-baseline gap-3 border-b border-dashed border-rule py-3.5"
                  >
                    <dt className="text-[13px] text-ink-soft">{label}</dt>
                    <dd className="text-[17px] font-medium text-[#1d3a8a]">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="pt-4 text-[13px] text-ink-soft">
                Signed, every club secretary who has done this in a spreadsheet at midnight.
              </p>
            </figure>
          </div>
        </section>
      </main>

      <footer className="relative">
        <PixelGrass className="h-[72px]" />
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-3 px-4 pt-2 pb-10 text-sm text-chalk/70 md:flex-row md:items-center md:justify-between md:px-8">
          <Wordmark />
          <p>Free match day graphics for grassroots and semi-pro clubs.</p>
          <p className="flex gap-4">
            <a className="underline-offset-4 hover:text-chalk hover:underline" href={SOURCE_URL}>
              Source code
            </a>
            <a className="underline-offset-4 hover:text-chalk hover:underline" href="/account">
              Your account
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
