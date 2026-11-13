import type { CSSProperties, ReactNode } from "react";
import { alpha, COAL, contrast, readableOn, SNOW, tonal } from "@/lib/color";
import { formatMatchDate } from "@/lib/format";
import { fixtureRows } from "../selection";
import type { Side } from "../Fixture";
import type { Theme } from "../theme";
import {
  Arrow,
  fitWrap,
  isLight,
  Lines,
  minText,
  motmName,
  on,
  paragraphHeight,
  partnerOf,
  rowFit,
  strongOf,
  subRows,
  subsHeadline,
  whenLine,
  fit,
  KitCrest,
  listFit,
  surnameOf,
} from "./kitShared";
import {
  benchNames,
  Cutout,
  facts,
  finalScore,
  goalFacts,
  type LayoutProps,
  PhotoBox,
  pairNames,
  scoreLine,
  scorerLines,
  sideNames,
  starterRows,
  versusLine,
} from "./shared";

/*
 * Halves: the shirt split down the middle becomes the layout. On a matchday or a
 * result the two halves are the two clubs, each in its own colours, with the time
 * or score sitting on the seam. Elsewhere one half is the picture (photo, cut-out
 * or crest) and the other half the words.
 */

/** A half of the frame, running into the story's unsafe top and bottom. */
function Half({
  theme,
  x,
  width,
  color,
  children,
}: {
  theme: Theme;
  x: number;
  width: number;
  color: string;
  children?: ReactNode;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        width,
        top: -theme.bleedTop,
        bottom: -theme.bleedBottom,
        background: color,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

/** The colour that stands out on both halves, for the seam and its badge. */
function seamOn(a: string, b: string): string {
  const snow = Math.min(contrast(SNOW, a), contrast(SNOW, b));
  const coal = Math.min(contrast(COAL, a), contrast(COAL, b));
  return snow >= coal ? SNOW : COAL;
}

function Strip({
  theme,
  design,
  parts,
  height,
}: LayoutProps & { parts: string[]; height: number }) {
  const { w, u, pad } = theme;
  const footSize = Math.max(minText(theme), height * 0.32);
  const footRoom = design.footer
    ? design.footer.length * footSize * theme.font.glyph * 1.25 + 24 * u
    : 0;
  const room = w - 2 * pad - footRoom - (design.sponsorImage ? 240 * u : 0);
  // The info line drops its least important parts until it fits at a readable size.
  const live = parts.map((p) => p.trim()).filter(Boolean);
  let text = live.join(" · ");
  for (let n = live.length; n >= 1; n--) {
    text = live.slice(0, n).join(" · ");
    if (fit(text, room, height * 0.4, theme) >= minText(theme)) break;
  }
  const size = Math.max(minText(theme), fit(text, room, height * 0.4, theme));
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        width: w,
        top: theme.h - height,
        height,
        background: COAL,
        color: SNOW,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 24 * u,
        padding: `0 ${pad}px`,
        boxSizing: "border-box",
      }}
    >
      <span style={{ fontSize: size, whiteSpace: "nowrap" }}>{text}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 18 * u }}>
        {design.footer && (
          <span
            style={{
              fontSize: footSize,
              fontWeight: theme.font.heavy,
              textTransform: "none",
              whiteSpace: "nowrap",
            }}
          >
            {design.footer}
          </span>
        )}
        {design.sponsorImage && (
          <img
            src={design.sponsorImage}
            alt=""
            style={{ height: height * 0.66, maxWidth: 220 * u, objectFit: "contain" }}
          />
        )}
      </span>
    </div>
  );
}

/* ---------- Club against club ---------- */

function Versus({
  team,
  design,
  theme,
  headline,
  middle,
  half,
  scorers,
}: LayoutProps & { headline: string; middle: string; half?: boolean; scorers?: boolean }) {
  const { w, h, u, pad, tall, wide } = theme;
  const f = facts(team, half);
  const pair: Side[] = [f.home, f.away];
  // Our half follows the graphic's colours (which can differ from the club's saved kit).
  const colourOf = (s: Side) => (s.us ? theme.primary : s.colors.primary);
  const left = colourOf(pair[0]);
  let right = colourOf(pair[1]);
  if (contrast(left, right) < 1.3) right = tonal(right, 0.4);
  const fg = [readableOn(left), readableOn(right)];
  const seam = seamOn(left, right);
  const halfW = w / 2;
  const stripH = (tall ? 100 : 82) * u;

  // The headline breaks at the seam: "Full | time", "Half | time".
  const words = headline.trim().split(/\s+/);
  const cut = Math.ceil(words.length / 2);
  const parts = words.length > 1 ? [words.slice(0, cut).join(" "), words.slice(cut).join(" ")] : [];
  const headMax = (tall ? 200 : wide ? 150 : 170) * u;
  const gap = 26 * u;
  const headSize = parts.length
    ? Math.min(...parts.map((p) => fit(p, halfW - pad - gap, headMax, theme)))
    : fit(headline, w * 0.6, headMax * 0.8, theme);
  const headH = headSize * 0.9 + (parts.length ? 0 : 36 * u);

  // The time or score sits on the seam under the headline; the clubs stand below it.
  const badge = middle ? fit(middle, w * 0.42, (tall ? 190 : wide ? 150 : 160) * u, theme) : 0;
  const badgeH = middle ? badge * 1.24 + 12 * u : 0;
  const badgeY = pad + headH + (tall ? 70 : 36) * u;
  const top = badgeY + badgeH + (tall ? 70 : 40) * u;
  const bottom = h - stripH - (tall ? 60 : 36) * u;
  const bodyH = bottom - top;
  const goalsOf = (s: Side) =>
    scorers
      ? scorerLines(team, design, s.goals).map((g) => `${g.name}${g.minute ? ` ${g.minute}'` : ""}`)
      : [];
  const scorerSize = Math.max(minText(theme), (tall ? 32 : 26) * u);
  const maxGoals = Math.max(goalsOf(pair[0]).length, goalsOf(pair[1]).length);
  const goalsH = maxGoals ? maxGoals * scorerSize * 1.25 + 24 * u : 0;
  const nameMax = (tall ? 92 : 76) * u;
  const c = Math.max(
    60 * u,
    Math.min(halfW * (wide ? 0.34 : 0.5), bodyH - nameMax * 2.1 - goalsH - 24 * u),
  );
  const names = pairNames(sideNames(team, pair), halfW - pad * 1.5, nameMax, theme);
  const used =
    c + 24 * u + names.size * 0.92 * Math.max(...names.lines.map((l) => l.length)) + goalsH;
  const crestY = top + Math.max(0, (bodyH - used) / 2);

  const when = [f.date, f.kickoff && middle !== f.kickoff ? f.kickoff : "", f.venue, f.competition];

  return (
    <>
      <Half theme={theme} x={0} width={halfW} color={left} />
      <Half theme={theme} x={halfW} width={w - halfW} color={right} />
      <div
        style={{
          position: "absolute",
          left: halfW - 6 * u,
          width: 12 * u,
          top: -theme.bleedTop,
          bottom: -theme.bleedBottom,
          background: seam,
        }}
      />
      {parts.length ? (
        parts.map((p, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: pad,
              ...(i === 0 ? { right: halfW + gap } : { left: halfW + gap }),
              fontSize: headSize,
              fontWeight: theme.font.heavy,
              lineHeight: 0.9,
              color: fg[i],
              whiteSpace: "nowrap",
            }}
          >
            {p}
          </div>
        ))
      ) : (
        <div
          style={{
            position: "absolute",
            top: pad,
            left: "50%",
            transform: "translateX(-50%)",
            padding: `${18 * u}px ${30 * u}px`,
            background: seam,
            color: readableOn(seam),
            fontSize: headSize,
            fontWeight: theme.font.heavy,
            lineHeight: 0.9,
            whiteSpace: "nowrap",
          }}
        >
          {headline}
        </div>
      )}
      {pair.map((s, i) => (
        <div
          key={s.us ? "us" : "them"}
          style={{
            position: "absolute",
            left: i === 0 ? 0 : halfW,
            width: halfW,
            top: crestY,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            color: fg[i],
            gap: 24 * u,
          }}
        >
          <KitCrest
            src={s.crest}
            kind={s.us ? team.crestKind : undefined}
            name={s.name}
            colors={s.colors}
            size={c}
            theme={on(theme, i === 0 ? left : right)}
          />
          <Lines
            fitted={{ lines: names.lines[i], size: names.size }}
            style={{ fontWeight: theme.font.heavy, lineHeight: 0.92 }}
          />
          {goalsOf(s).length > 0 && (
            <div style={{ fontSize: scorerSize, lineHeight: 1.25, opacity: 0.9 }}>
              {goalsOf(s).map((g) => (
                <div key={g}>{g}</div>
              ))}
            </div>
          )}
        </div>
      ))}
      {middle && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: badgeY,
            transform: "translateX(-50%)",
            padding: `${badge * 0.12}px ${badge * 0.26}px`,
            background: COAL,
            color: SNOW,
            border: `${6 * u}px solid ${seam === COAL ? SNOW : seam}`,
            fontSize: badge,
            fontWeight: theme.font.heavy,
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
            whiteSpace: "nowrap",
          }}
        >
          {middle}
        </div>
      )}
      <Strip team={team} design={design} theme={theme} parts={when} height={stripH} />
    </>
  );
}

/* ---------- Picture and words ---------- */

interface Words {
  ink: string;
  soft: string;
  accent: string;
  ground: string;
}

function Duo({
  team,
  design,
  theme,
  headline,
  sub,
  share = 0.5,
  big,
  children,
}: LayoutProps & {
  headline: string;
  sub?: string;
  /** How much of the width the picture half takes. */
  share?: number;
  /** A huge number or word set behind the crest on the picture half. */
  big?: string;
  children: (box: { w: number; h: number }, ink: Words) => ReactNode;
}) {
  const { w, h, u, pad, tall, wide } = theme;
  const strong = strongOf(theme);
  const ground = partnerOf(strong, isLight(theme.primary) ? theme.primary : theme.secondary, 0.5);
  const ink = readableOn(ground);
  const words: Words = {
    ink,
    soft: alpha(ink, 0.7),
    accent: contrast(strong, ground) >= 3 ? strong : ink,
    ground,
  };
  const onStrong = readableOn(strong);
  const split = Math.round(w * (wide ? Math.min(share, 0.46) : share));
  const photo = !!design.background.image;
  const cut = !!design.featureImage;
  const pic = split;

  const x = split + pad * 0.85;
  const textW = w - pad - x;
  const head = fitWrap(headline, textW, (tall ? 170 : wide ? 120 : 140) * u, theme);
  const subSize = sub ? Math.max(minText(theme), fit(sub, textW, (tall ? 40 : 34) * u, theme)) : 0;
  const footer = design.footer || design.sponsorImage;
  const footH = footer ? (tall ? 90 : 74) * u : 0;
  const top = pad + head.size * 0.9 * head.lines.length + (sub ? subSize * 1.6 : 0) + 40 * u;
  const box = { w: textW, h: h - top - pad - footH };
  const crest = Math.min(pic * 0.62, h * 0.36);
  // The club's name under the crest: in full when it reads, else the short name.
  const nameMax = Math.max(minText(theme), (tall ? 72 : 60) * u);
  const fullName = team.name.trim() ? fitWrap(team.name, pic - pad * 1.2, nameMax, theme) : null;
  const clubName =
    fullName && fullName.size < nameMax * 0.6 && team.shortName.trim()
      ? fitWrap(team.shortName, pic - pad * 1.2, nameMax, theme)
      : fullName;

  const picture: CSSProperties = {
    position: "absolute",
    left: 0,
    width: pic,
    top: 0,
    height: h,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 30 * u,
    color: onStrong,
  };

  return (
    <>
      <Half theme={theme} x={0} width={pic} color={strong}>
        {photo && <PhotoBox design={design} style={{ position: "absolute", inset: 0 }} />}
        {!photo && cut && (
          <Cutout
            design={design}
            theme={{ ...theme, w: pic }}
            style={{
              right: "auto",
              left: 0,
              bottom: 0,
              width: "100%",
              height: "88%",
              objectPosition: "center bottom",
              maskImage: "none",
              WebkitMaskImage: "none",
            }}
          />
        )}
      </Half>
      <Half theme={theme} x={pic} width={w - pic} color={ground} />
      <div
        style={{
          position: "absolute",
          left: pic - 5 * u,
          width: 10 * u,
          top: -theme.bleedTop,
          bottom: -theme.bleedBottom,
          background: seamOn(strong, ground),
        }}
      />
      {!photo && !cut && (
        <div style={picture}>
          {big && (
            <div
              data-decor
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
                fontSize: Math.min(fit(big, pic * 0.96, h * 0.6, theme), h * 0.6),
                fontWeight: theme.font.heavy,
                color: alpha(onStrong, 0.12),
                lineHeight: 0.8,
                overflow: "hidden",
                whiteSpace: "nowrap",
              }}
            >
              {big}
            </div>
          )}
          <KitCrest
            src={team.crest}
            kind={team.crestKind}
            name={team.name}
            colors={team.colors}
            size={crest}
            theme={on(theme, strong)}
          />
          {clubName && (
            <Lines
              fitted={clubName}
              style={{
                fontWeight: theme.font.heavy,
                lineHeight: 0.92,
                textAlign: "center",
                position: "relative",
              }}
            />
          )}
        </div>
      )}
      <div
        style={{
          position: "absolute",
          left: x,
          top: pad,
          width: textW,
          color: words.ink,
          display: "flex",
          flexDirection: "column",
          gap: 10 * u,
        }}
      >
        <Lines fitted={head} style={{ fontWeight: theme.font.heavy, lineHeight: 0.9 }} />
        {sub && (
          <div
            style={{
              fontSize: subSize,
              color: words.accent,
              fontWeight: theme.font.heavy,
              whiteSpace: "nowrap",
            }}
          >
            {sub}
          </div>
        )}
      </div>
      <div
        style={{
          position: "absolute",
          left: x,
          top,
          width: box.w,
          height: box.h,
          color: words.ink,
        }}
      >
        {children(box, words)}
      </div>
      {footer && (
        <div
          style={{
            position: "absolute",
            left: x,
            width: textW,
            top: h - pad - footH,
            height: footH,
            borderTop: `${4 * u}px solid ${words.ink}`,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 16 * u,
            color: words.ink,
          }}
        >
          <span
            style={{
              fontSize: Math.max(minText(theme), footH * 0.36),
              fontWeight: theme.font.heavy,
              textTransform: "none",
              whiteSpace: "nowrap",
            }}
          >
            {design.footer}
          </span>
          {design.sponsorImage && (
            <img
              src={design.sponsorImage}
              alt=""
              style={{ height: footH * 0.7, maxWidth: 200 * u, objectFit: "contain" }}
            />
          )}
        </div>
      )}
    </>
  );
}

/* ---------- Layouts ---------- */

export function SplitFixture(props: LayoutProps) {
  const { team, design, theme } = props;
  const f = facts(team);
  if (f.versus) return <Versus {...props} headline={design.headlines.fixture} middle={f.kickoff} />;
  const { u, tall } = theme;
  return (
    <Duo {...props} headline={design.headlines.fixture} sub={f.competition}>
      {(box, k) => {
        const big = f.kickoff || f.date;
        const size = fit(big, box.w, box.h * 0.36, theme);
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 * u }}>
            <div style={{ fontSize: size, fontWeight: theme.font.heavy, color: k.accent }}>
              {big}
            </div>
            {[f.kickoff ? f.date : "", f.venue].filter(Boolean).map((t) => (
              <div
                key={t}
                style={{
                  fontSize: Math.max(minText(theme), fit(t, box.w, (tall ? 56 : 46) * u, theme)),
                  fontWeight: theme.font.heavy,
                  whiteSpace: "nowrap",
                }}
              >
                {t}
              </div>
            ))}
          </div>
        );
      }}
    </Duo>
  );
}

export function SplitResult(props: LayoutProps & { half?: boolean }) {
  const { team, design, theme, half = false } = props;
  const f = facts(team, half);
  const headline = half ? design.headlines.halftime : design.headlines.result;
  if (f.versus)
    return (
      <Versus
        {...props}
        headline={headline}
        middle={`${f.home.score}-${f.away.score}`}
        half={half}
        scorers
      />
    );
  const s = finalScore(team, half);
  return (
    <Duo {...props} headline={headline} sub={f.competition} big={String(s.us)}>
      {(box, k) => (
        <div
          style={{
            fontSize: fit(String(s.us), box.w, box.h * 0.5, theme),
            fontWeight: theme.font.heavy,
            color: k.accent,
          }}
        >
          {s.us}
        </div>
      )}
    </Duo>
  );
}

export function SplitGoal(props: LayoutProps) {
  const { team, design, theme } = props;
  const { u, tall } = theme;
  const g = goalFacts(team, design);
  return (
    <Duo {...props} headline={design.headlines.goal} big={g?.minute ? `${g.minute}'` : undefined}>
      {(box, k) => {
        if (!g) return null;
        const name = fitWrap(g.scorer, box.w, box.h * 0.3, theme);
        const full = scoreLine(team, g.us, g.them);
        const line =
          full && fit(full, box.w, 48 * u, theme) < minText(theme) * 1.3
            ? scoreLine(team, g.us, g.them, true)
            : full;
        // Date, time and venue when they read at a decent size; the venue goes first.
        const when = [whenLine(team), whenLine(team, false)].find(
          (t) => fit(t, box.w, 30 * u, theme) >= minText(theme),
        );
        return (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 20 * u }}>
            {g.minute && (
              <div
                style={{
                  fontSize: Math.min(box.h * 0.2, (tall ? 140 : 120) * u),
                  fontWeight: theme.font.heavy,
                  color: k.accent,
                  lineHeight: 0.9,
                }}
              >
                {g.minute}&prime;
              </div>
            )}
            <Lines fitted={name} style={{ fontWeight: theme.font.heavy, lineHeight: 0.9 }} />
            <div style={{ flex: 1 }} />
            {line && (
              <div
                style={{
                  fontSize: Math.max(minText(theme), fit(line, box.w, 48 * u, theme)),
                  fontWeight: theme.font.heavy,
                  whiteSpace: "nowrap",
                }}
              >
                {line}
              </div>
            )}
            {when && (
              <div
                style={{
                  fontSize: Math.max(minText(theme), fit(when, box.w, 30 * u, theme)),
                  color: k.soft,
                  whiteSpace: "nowrap",
                }}
              >
                {when}
              </div>
            )}
          </div>
        );
      }}
    </Duo>
  );
}

export function SplitLineup(props: LayoutProps) {
  const { team, design, theme } = props;
  const { u, tall } = theme;
  const rows = starterRows(team, design);
  // A squad pasted without shirt numbers gets no number column at all.
  const numbers = design.showNumbers && rows.some((r) => r.number);
  const bench = benchNames(team, design).join(", ");
  return (
    <Duo {...props} headline={design.headlines.lineup} sub={versusLine(team)} share={0.38}>
      {(box, k) => {
        const benchSize = Math.max(minText(theme), (tall ? 28 : 24) * u);
        const benchH = bench
          ? paragraphHeight(`Subs ${bench}`, box.w, benchSize, theme) + 16 * u
          : 0;
        const listH = box.h - benchH;
        const gap = 28 * u;
        // One column when the rows are tall enough to read, two when they'd be small.
        const plan = (cols: number) => {
          const per = Math.max(1, Math.ceil(rows.length / cols));
          const colW = (box.w - (cols - 1) * gap) / cols;
          const rowH = listH / per;
          const base = Math.max(minText(theme), Math.min(rowH * 0.62, (tall ? 76 : 62) * u));
          const numW = numbers ? base * 1.5 : 0;
          const capW = Math.max(minText(theme), base * 0.7) * 1.7 + base * 0.3;
          const list = listFit(
            rows.map((r) => ({
              text: r.name,
              alt: surnameOf(r.name),
              width: colW - numW - (r.captain ? capW : 0),
            })),
            colW,
            base,
            rowH,
            theme,
          );
          return { cols, per, colW, rowH, base, numW, list };
        };
        const one = plan(1);
        const two = plan(2);
        const p =
          one.list.ok && one.list.size >= minText(theme) * 1.2
            ? one
            : two.list.ok && two.list.size > one.list.size
              ? two
              : one;
        const { cols, per, colW, rowH, base, numW, list } = p;
        return (
          <div style={{ height: "100%", position: "relative" }}>
            <div
              data-check-list="starting-xi"
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${cols}, ${colW}px)`,
                gridTemplateRows: `repeat(${per}, ${rowH}px)`,
                gridAutoFlow: "column",
                columnGap: gap,
              }}
            >
              {rows.map((r, i) => (
                <div
                  key={r.id}
                  style={{ display: "flex", alignItems: "center", gap: base * 0.3, minWidth: 0 }}
                >
                  {numbers && (
                    <span
                      data-check-slot={r.number ? "number" : undefined}
                      style={{
                        width: numW - base * 0.3,
                        fontSize: Math.max(minText(theme), Math.min(base, list.size * 1.1)),
                        color: k.accent,
                        fontWeight: theme.font.heavy,
                        fontVariantNumeric: "tabular-nums",
                        flexShrink: 0,
                      }}
                    >
                      {r.number}
                    </span>
                  )}
                  <Lines
                    fitted={{ lines: list.rows[i], size: list.size }}
                    style={{ fontWeight: theme.font.heavy, lineHeight: 0.95 }}
                  />
                  {r.captain && (
                    <span
                      style={{
                        fontSize: Math.max(minText(theme), list.size * 0.7),
                        color: k.accent,
                      }}
                    >
                      (C)
                    </span>
                  )}
                </div>
              ))}
            </div>
            {bench && (
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  fontSize: benchSize,
                  lineHeight: 1.25,
                  color: k.soft,
                }}
              >
                <span style={{ color: k.accent, fontWeight: theme.font.heavy }}>Subs </span>
                {bench}
              </div>
            )}
          </div>
        );
      }}
    </Duo>
  );
}

export function SplitSubs(props: LayoutProps) {
  const { team, design, theme } = props;
  const { u, tall } = theme;
  const rows = subRows(team, design);
  return (
    <Duo
      {...props}
      headline={subsHeadline(design, rows.length)}
      sub={versusLine(team)}
      share={0.38}
    >
      {(box, k) => {
        const rowH = Math.min(box.h / Math.max(rows.length, 1), (tall ? 330 : 270) * u);
        const base = rowH * 0.3;
        return (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {rows.map((s, i) => {
              const minuteW = base * 1.9;
              const onF = rowFit(s.on, box.w - minuteW, base, rowH * 0.5, theme);
              const offF = rowFit(s.off, box.w - minuteW, base * 0.75, rowH * 0.4, theme);
              return (
                <div
                  key={s.id}
                  style={{
                    height: rowH,
                    display: "flex",
                    alignItems: "center",
                    borderTop: i ? `${3 * u}px solid ${alpha(k.ink, 0.3)}` : undefined,
                  }}
                >
                  <div
                    style={{
                      width: minuteW,
                      fontSize: base * 0.9,
                      fontWeight: theme.font.heavy,
                      color: k.accent,
                      flexShrink: 0,
                    }}
                  >
                    {s.minute ? `${s.minute}'` : ""}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 * u }}>
                    {s.on && (
                      <div style={{ display: "flex", alignItems: "center", gap: 12 * u }}>
                        <Arrow up size={onF.size * 0.55} color={k.accent} />
                        <Lines fitted={onF} style={{ fontWeight: theme.font.heavy }} />
                      </div>
                    )}
                    {s.off && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12 * u,
                          color: k.soft,
                        }}
                      >
                        <Arrow up={false} size={offF.size * 0.55} color={k.soft} />
                        <Lines fitted={offF} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      }}
    </Duo>
  );
}

export function SplitMotm(props: LayoutProps) {
  const { team, design, theme } = props;
  const { u, tall } = theme;
  const who = motmName(team);
  const s = finalScore(team);
  return (
    <Duo {...props} headline={design.headlines.motm} big={who?.player.number}>
      {(box, k) => {
        if (!who) return null;
        const note = team.match.motmNote.trim();
        const full = scoreLine(team, s.us, s.them);
        const line =
          full && fit(full, box.w, 44 * u, theme) < minText(theme) * 1.3
            ? scoreLine(team, s.us, s.them, true)
            : full;
        const noteSize = Math.max(minText(theme), (tall ? 38 : 30) * u);
        const last = fitWrap(who.last, box.w, box.h * 0.3, theme);
        return (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 18 * u }}>
            <div
              style={{
                fontSize: Math.min(box.h * 0.16, (tall ? 130 : 110) * u),
                fontWeight: theme.font.heavy,
                color: k.accent,
                lineHeight: 0.9,
              }}
            >
              {who.player.number}
            </div>
            {who.first && (
              <div
                style={{
                  fontSize: Math.max(minText(theme), fit(who.first, box.w, 56 * u, theme)),
                  fontWeight: theme.font.heavy,
                  color: k.soft,
                  whiteSpace: "nowrap",
                }}
              >
                {who.first}
              </div>
            )}
            <Lines fitted={last} style={{ fontWeight: theme.font.heavy, lineHeight: 0.88 }} />
            {note && (
              <div style={{ fontSize: noteSize, lineHeight: 1.25, textTransform: "none" }}>
                {note}
              </div>
            )}
            <div style={{ flex: 1 }} />
            {line && (
              <div
                style={{
                  fontSize: Math.max(minText(theme), fit(line, box.w, 44 * u, theme)),
                  fontWeight: theme.font.heavy,
                  color: k.accent,
                  whiteSpace: "nowrap",
                }}
              >
                {line}
              </div>
            )}
          </div>
        );
      }}
    </Duo>
  );
}

export function SplitFixtures(props: LayoutProps) {
  const { team, design, theme } = props;
  const { u, tall, wide } = theme;
  const rows = fixtureRows(team).slice(0, tall ? 8 : wide ? 5 : 6);
  return (
    <Duo {...props} headline={design.headlines.fixtures} share={0.36}>
      {(box, k) => {
        const rowH = Math.min(box.h / Math.max(rows.length, 1), (tall ? 210 : 170) * u);
        const rightW = rowH * 1.3;
        const nameW = box.w - rightW - 16 * u;
        const list = listFit(
          rows.map((f) => ({ text: f.opponent })),
          nameW,
          rowH * 0.36,
          rowH * 0.66,
          theme,
        );
        return (
          <div data-check-list="fixtures" style={{ display: "flex", flexDirection: "column" }}>
            {rows.map((f, i) => {
              const right = f.score.trim() || f.kickoff;
              const meta = [formatMatchDate(f.date), f.isHome ? "Home" : "Away"]
                .filter(Boolean)
                .join(" · ");
              const nf = { lines: list.rows[i], size: list.size };
              // The opponent leads the row; the time or score sits under it in size.
              const rightSize = Math.max(
                minText(theme),
                Math.min(fit(right, rightW, rowH * 0.42, theme), nf.size * 0.95),
              );
              return (
                <div
                  key={f.id}
                  style={{
                    height: rowH,
                    display: "flex",
                    alignItems: "center",
                    gap: 16 * u,
                    borderTop: i ? `${3 * u}px solid ${alpha(k.ink, 0.3)}` : undefined,
                  }}
                >
                  <div
                    style={{ width: nameW, display: "flex", flexDirection: "column", gap: 6 * u }}
                  >
                    <span
                      style={{
                        fontSize: Math.max(minText(theme), rowH * 0.15),
                        color: k.soft,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {meta}
                    </span>
                    <Lines fitted={nf} style={{ fontWeight: theme.font.heavy, lineHeight: 0.95 }} />
                  </div>
                  <div
                    style={{
                      width: rightW,
                      textAlign: "right",
                      fontSize: rightSize,
                      fontWeight: theme.font.heavy,
                      color: k.accent,
                      fontVariantNumeric: "tabular-nums",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {right}
                  </div>
                </div>
              );
            })}
          </div>
        );
      }}
    </Duo>
  );
}
