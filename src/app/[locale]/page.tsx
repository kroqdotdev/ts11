import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Graphic } from "@/components/graphics/Graphic";
import { PixelGrass } from "@/components/landing/PixelGrass";
import { Reel } from "@/components/landing/Reel";
import { ScaledGraphic } from "@/components/landing/ScaledGraphic";
import { StadiumHero } from "@/components/landing/StadiumHero";
import { StartLink } from "@/components/landing/StartLink";
import { LocaleSwitch } from "@/components/i18n/LocaleSwitch";
import { Window } from "@/components/lofi/Window";
import { Wordmark } from "@/components/Wordmark";
import { Link } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/page";
import type { Locale } from "@/i18n/routing";
import { APP_DOMAIN, SOURCE_URL } from "@/lib/brand";
import { defaultDesign, demoTeam } from "@/lib/demo";
import type { Design, FontId, GraphicKind, LookId, Team } from "@/lib/types";

/** Low-fi button: ink outline and a hard shadow that the press pushes into. */
function StudioLink({ label, className = "" }: { label: string; className?: string }) {
  return (
    <StartLink
      className={`inline-flex h-12 max-w-full lofi-press items-center justify-center rounded-[4px] border-2 border-card-ink bg-card px-6 text-[15px] font-semibold whitespace-nowrap text-card-ink shadow-[4px_4px_0_var(--card-ink)] ${className}`}
    >
      {label}
    </StartLink>
  );
}

interface Moment {
  /** The minute, or a key in `landing.reel.clock` for the moments around the match. */
  clock: string | { key: "dayBefore" | "hourBefore" | "monday" };
  kind: GraphicKind;
  /** Which version of the match the card shows. */
  team: "matchday" | "firstGoal" | "monday";
  look: LookId;
  font: FontId;
}

/* The match, minute by minute. A real sequence, so the clock is the label. */
const REEL: Moment[] = [
  {
    clock: { key: "dayBefore" },
    kind: "fixture",
    team: "matchday",
    look: "stadium",
    font: "jersey",
  },
  {
    clock: { key: "hourBefore" },
    kind: "lineup",
    team: "matchday",
    look: "hoops",
    font: "archivo",
  },
  {
    clock: { key: "hourBefore" },
    kind: "pitch",
    team: "matchday",
    look: "stripes",
    font: "oswald",
  },
  { clock: "23'", kind: "goal", team: "firstGoal", look: "pixel", font: "jersey" },
  { clock: "45'", kind: "halftime", team: "matchday", look: "block", font: "bebas" },
  { clock: "74'", kind: "subs", team: "matchday", look: "halves", font: "barlow" },
  { clock: "90'", kind: "result", team: "matchday", look: "stadium", font: "jersey" },
  { clock: "90+4'", kind: "motm", team: "matchday", look: "night", font: "teko" },
  { clock: { key: "monday" }, kind: "fixtures", team: "monday", look: "clean", font: "archivo" },
];

/*
 * One club's match day, start to finish, in the page's language: the demo club wins 2-1,
 * scoring on 23' and 78' with the visitors' equaliser on 51'. Every card tells the same
 * story, so the scores and names agree from one to the next.
 */
function matchStory(locale: Locale): Record<Moment["team"], Team> {
  const base = demoTeam("ashby", "2026-11-21", locale);
  return {
    matchday: base,
    // The goal card is stamped 23', so it celebrates the 23rd-minute goal (1-0).
    firstGoal: { ...base, match: { ...base.match, spotlightGoalId: "g1" } },
    // By Monday the result is in: the Fixtures graphic leads with this match (2-1)
    // and lists the games still to come.
    monday: base,
  };
}

function Scoreboard({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-11 min-w-[5.5rem] items-center justify-center rounded-[4px] border-2 border-card-ink bg-[#0b120d] px-3 font-[family-name:var(--font-dots)] text-[26px] leading-none font-bold tracking-wider text-card shadow-[3px_3px_0_var(--card-ink)]">
      {children}
    </span>
  );
}

function shot(m: Moment, team: Team) {
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
      <Graphic team={team} design={design} />
    </ScaledGraphic>
  );
}

const SHEET = ["price", "signUp", "watermark", "kept", "exports"] as const;

export default async function Home({ params }: PageProps<"/[locale]">) {
  const locale = await pageLocale(params);
  const t = await getTranslations("landing");
  const story = matchStory(locale);
  return (
    <div className="flex min-h-dvh flex-col bg-grass-deep text-chalk">
      <main className="flex flex-col">
        <StadiumHero />

        {/* The match reel. */}
        <section aria-labelledby="reel" className="border-t-2 border-card-ink py-20 lg:py-28">
          <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-4 px-4 md:px-8">
            <h2 id="reel" className="font-signage text-[clamp(3rem,6vw,5.25rem)] leading-[0.84]">
              {t("reel.title")}
            </h2>
            <p className="max-w-[52ch] text-lg leading-relaxed text-chalk/75">{t("reel.lead")}</p>
          </div>

          <div className="relative mt-12">
            {/* The touchline the scoreboards sit on. */}
            <div aria-hidden className="absolute inset-x-0 top-[89px] h-[3px] bg-chalk/25" />
            <Reel className="relative scrollbar-none flex snap-x snap-mandatory scroll-px-4 gap-7 overflow-x-auto px-4 pb-8 md:scroll-px-8 md:px-8 lg:scroll-px-[max(2rem,calc((100vw-1280px)/2+2rem))] lg:px-[max(2rem,calc((100vw-1280px)/2+2rem))]">
              {REEL.map((m) => (
                <li
                  key={m.kind}
                  className="flex w-[264px] shrink-0 snap-start flex-col gap-5 sm:w-[296px]"
                >
                  <Scoreboard>
                    {typeof m.clock === "string" ? m.clock : t(`reel.clock.${m.clock.key}`)}
                  </Scoreboard>
                  <Window as="figure" title={t(`reel.${m.kind}.file`)}>
                    {shot(m, story[m.team])}
                  </Window>
                  <div className="flex flex-col gap-1">
                    <h3 className="font-signage text-[30px] leading-none">
                      {t(`reel.${m.kind}.title`)}
                    </h3>
                    <p className="text-[15px] text-chalk/70">{t(`reel.${m.kind}.body`)}</p>
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
                {t("setup.title")}
              </h2>
              <p className="max-w-[46ch] text-lg leading-relaxed text-ink-soft">
                {t("setup.lead")}
              </p>
              <StudioLink label={t("cta")} />
            </Window>

            <figure className="paper-theme relative mx-auto w-full max-w-[480px] -rotate-1 rounded-[4px] border-2 border-card-ink bg-paper p-6 text-ink shadow-[8px_8px_0_var(--card-ink)] sm:p-8">
              <figcaption className="flex items-baseline justify-between border-b-2 border-ink pb-3">
                <span className="font-signage text-4xl leading-none">{t("sheet.title")}</span>
                <span className="text-xs text-ink-soft">{APP_DOMAIN}</span>
              </figcaption>
              <dl className="flex flex-col">
                {SHEET.map((row) => (
                  <div
                    key={row}
                    className="grid grid-cols-[8rem_1fr] items-baseline gap-3 border-b border-dashed border-rule py-3.5 sm:grid-cols-[9.5rem_1fr]"
                  >
                    <dt className="text-[13px] text-ink-soft">{t(`sheet.${row}`)}</dt>
                    <dd className="text-[17px] font-medium text-[#1d3a8a]">
                      {t(`sheet.${row}Value`)}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="pt-4 text-[13px] text-ink-soft">{t("sheet.signed")}</p>
            </figure>
          </div>
        </section>
      </main>

      <footer className="relative">
        <PixelGrass className="h-[72px]" />
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-3 px-4 pt-2 pb-10 text-sm text-chalk/70 md:flex-row md:items-center md:justify-between md:px-8">
          <Wordmark />
          <p>{t("footer.tagline")}</p>
          <nav aria-label={t("footer.nav")} className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <a href={SOURCE_URL} className="underline-offset-4 hover:underline">
              {t("footer.source")}
            </a>
            <Link href="/privacy" className="underline-offset-4 hover:underline">
              {t("footer.privacy")}
            </Link>
            <Link href="/account" className="underline-offset-4 hover:underline">
              {t("footer.account")}
            </Link>
            <LocaleSwitch tone="chalk" className="-mx-2 sm:-mx-3" />
          </nav>
        </div>
      </footer>
    </div>
  );
}
