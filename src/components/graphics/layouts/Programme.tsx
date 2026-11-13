import type { CSSProperties, ReactNode } from "react";
import { alpha, contrast, readableOn } from "@/lib/color";
import { formatMatchDate } from "@/lib/format";
import type { GraphicKind } from "@/lib/types";
import { fixtureRows } from "../selection";
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
  Roundel,
  rowFit,
  strongOf,
  subRows,
  subsHeadline,
  whenLine,
  fit,
  fitBlock,
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
  Ground,
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
 * Hoops: an old-school matchday programme cover. A paper border, a masthead in the
 * club colour with the issue roundel, a field of hoops, and the feature itself on a
 * printed card with a slanted title slab.
 */

interface Ink {
  paper: string;
  ink: string;
  soft: string;
  strong: string;
  onStrong: string;
  hoopA: string;
  hoopB: string;
  accent: string;
}

function inks(theme: Theme): Ink {
  const paper = "#f3eedf";
  const ink = "#17140f";
  const strong = strongOf(theme);
  const hoopA = theme.primary;
  const hoopB = isLight(hoopA) ? strong : partnerOf(hoopA, theme.secondary);
  const accent =
    contrast(strong, paper) >= 3
      ? strong
      : contrast(theme.secondary, paper) >= 3
        ? theme.secondary
        : ink;
  return {
    paper,
    ink,
    soft: alpha(ink, 0.66),
    strong,
    onStrong: readableOn(strong),
    hoopA,
    hoopB,
    accent,
  };
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const at = (b: Box): CSSProperties => ({
  position: "absolute",
  left: b.x,
  top: b.y,
  width: b.w,
  height: b.h,
});

/** Kinds whose card needs most of the cover, so a photo only peeks out above it. */
const LISTY: GraphicKind[] = ["lineup", "subs", "fixtures"];

function Cover({
  team,
  design,
  theme,
  headline,
  children,
}: LayoutProps & { headline: string; children: (box: Box) => ReactNode }) {
  const { w, h, u, wide, tall } = theme;
  const k = inks(theme);
  const b = 24 * u;
  // On a story the cover runs on into the unsafe top and bottom, as hoops only;
  // the type all stays inside the safe frame.
  const top = theme.bleedTop ? 0 : b;
  const bottom = theme.bleedBottom ? h : h - b;
  const frame: Box = { x: b, y: top, w: w - 2 * b, h: bottom - top };
  const outer: Box = {
    x: b,
    y: -theme.bleedTop + b,
    w: w - 2 * b,
    h: h + theme.bleedTop + theme.bleedBottom - 2 * b,
  };
  const mh = (tall ? 210 : wide ? 180 : 172) * u;
  const sh = (tall ? 80 : 66) * u;
  const field: Box = { x: frame.x, y: frame.y + mh, w: frame.w, h: frame.h - mh - sh };
  // Side margins leave the hoops showing either side of the card.
  const m = (wide ? 48 : 58) * u;
  const slabH = (tall ? 120 : wide ? 92 : 104) * u;
  const photo = !!design.background.image;
  const cut = !!design.featureImage;
  const listy = LISTY.includes(design.kind);

  // The printed card: most of the field, less when a photo or cut-out shares it.
  // A band of hoops shows above the card; the title slab sits across it.
  // Lists need the height, so their card rises to just under the title slab.
  const hoopsTop = listy
    ? slabH * 1.1
    : Math.max(slabH * 1.1, field.h * (wide ? 0.2 : tall ? 0.13 : 0.16));
  let card: Box = {
    x: field.x + m,
    y: field.y + hoopsTop,
    w: field.w - 2 * m,
    h: field.h - hoopsTop - m * 0.8,
  };
  if (photo && wide) {
    const x = field.x + field.w * (listy ? 0.36 : 0.46);
    card = { ...card, x, w: field.x + field.w - m - x };
  } else if (photo) {
    const top = field.y + field.h * (listy ? 0.2 : 0.42);
    card = { ...card, y: top, h: field.y + field.h - m - top };
  }
  if (cut) card = { ...card, w: Math.min(card.w, field.w * (wide ? 0.58 : 0.62) - m) };

  const slabW = card.w * 0.92;
  const slabSize = fit(headline, card.w * 0.86 - 40 * u, slabH * 0.7, theme);
  const ip = (wide ? 28 : 36) * u;
  const inner: Box = {
    x: card.x + ip,
    y: card.y + slabH * 0.38 + ip * 0.7,
    w: card.w - 2 * ip,
    h: card.h - slabH * 0.38 - ip * 1.7,
  };

  // Masthead parts.
  const crest = mh * 0.68;
  const roundel = mh * 0.8;
  const nameW = frame.w - crest - roundel - 3 * 28 * u - 2 * 24 * u;
  const strap = Math.max(minText(theme), mh * 0.12);
  // The club name shares the masthead with the strap; a long one falls back to the
  // short name rather than shrinking to small print.
  const nameRoom = mh - strap * 1.5 - 20 * u;
  const fitName = (text: string) => {
    const f = fitWrap(text, nameW, Math.min(mh * 0.42, nameRoom / 0.92), theme);
    return f.lines.length * f.size * 0.92 <= nameRoom
      ? f
      : { lines: [text], size: fit(text, nameW, nameRoom / 0.92, theme) };
  };
  let name = fitName(team.name || team.shortName);
  if (name.size < minText(theme) * 1.25 && team.shortName.trim()) name = fitName(team.shortName);
  const small = Math.max(minText(theme), roundel * 0.15);
  const issue = team.fixtures.filter((f) => f.score.trim()).length + 1;
  const when = design.kind === "fixtures" ? team.match.competition.trim() : whenLine(team);
  const hoop = field.h / 7;

  return (
    <>
      <Ground theme={theme} color={k.paper} />
      {!photo && (
        <div
          style={{
            ...at(outer),
            background: `repeating-linear-gradient(180deg, ${k.hoopA} 0 ${hoop}px, ${k.hoopB} ${hoop}px ${hoop * 2}px)`,
            backgroundPosition: `0 ${(((field.y - outer.y) % (hoop * 2)) + hoop * 2) % (hoop * 2)}px`,
          }}
        />
      )}
      {/* The masthead in the club colour, with a hoop-coloured rule under it. */}
      <div
        style={{
          ...at({ x: frame.x, y: frame.y, w: frame.w, h: mh }),
          background: k.strong,
          color: k.onStrong,
          display: "flex",
          alignItems: "center",
          gap: 28 * u,
          padding: `0 ${24 * u}px`,
          boxSizing: "border-box",
        }}
      >
        <KitCrest
          src={team.crest}
          kind={team.crestKind}
          name={team.name}
          colors={team.colors}
          size={crest}
          theme={on(theme, k.strong)}
        />
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <Lines
            fitted={name}
            style={{ fontWeight: theme.font.heavy, lineHeight: 0.92 * theme.font.leading }}
          />
          <div
            style={{
              fontSize: strap,
              marginTop: strap * 0.45,
              letterSpacing: "0.14em",
              opacity: 0.86,
              whiteSpace: "nowrap",
            }}
          >
            Official matchday programme
          </div>
        </div>
        <Roundel
          size={roundel}
          bg={k.paper}
          fg={k.ink}
          border={`${4 * u}px solid ${k.ink}`}
          style={{ transform: "rotate(-8deg)", fontWeight: theme.font.heavy }}
        >
          <div style={{ fontSize: small }}>No.</div>
          <div
            style={{
              fontSize: Math.min(roundel * 0.38, roundel * 0.9 - small * 2.1),
              color: k.accent,
            }}
          >
            {issue}
          </div>
          <div style={{ fontSize: small }}>£2</div>
        </Roundel>
      </div>
      <div
        style={{
          ...at({ x: frame.x, y: frame.y + mh - 8 * u, w: frame.w, h: 8 * u }),
          background: k.hoopB === k.strong ? k.paper : k.hoopB,
        }}
      />

      {/* The field: hoops, or the cover photo. */}
      <div style={{ ...at(field), overflow: "hidden" }}>
        {photo && <PhotoBox design={design} style={{ position: "absolute", inset: 0 }} />}
        {cut && (
          <Cutout
            design={design}
            theme={{ ...theme, h: field.h, bleedTop: 0, bleedBottom: 0 }}
            style={{
              height: field.h * 0.98,
              width: wide ? "52%" : "62%",
              maskImage: "none",
              WebkitMaskImage: "none",
            }}
          />
        )}
      </div>

      {/* The printed card with its title slab. */}
      <div
        style={{
          ...at(card),
          background: k.paper,
          border: `${4 * u}px solid ${k.ink}`,
          boxShadow: `${10 * u}px ${10 * u}px 0 ${k.ink}`,
          boxSizing: "border-box",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: card.x - 10 * u,
          top: card.y - slabH * 0.62,
          height: slabH,
          maxWidth: slabW,
          padding: `0 ${22 * u}px`,
          display: "flex",
          alignItems: "center",
          background: k.ink,
          color: k.paper,
          boxShadow: `${8 * u}px ${8 * u}px 0 ${k.strong === k.ink ? k.hoopB : k.strong}`,
          transform: "rotate(-2.5deg)",
          transformOrigin: "left bottom",
          fontSize: slabSize,
          fontWeight: theme.font.heavy,
          whiteSpace: "nowrap",
        }}
      >
        {headline}
      </div>
      <div style={{ ...at(inner), color: k.ink }}>
        {children({ x: 0, y: 0, w: inner.w, h: inner.h })}
      </div>

      {/* The strip along the foot of the cover. */}
      <div
        style={{
          ...at({ x: frame.x, y: frame.y + frame.h - sh, w: frame.w, h: sh }),
          background: k.ink,
          color: k.paper,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24 * u,
          padding: `0 ${24 * u}px`,
          boxSizing: "border-box",
        }}
      >
        <span
          style={{
            fontSize: Math.max(minText(theme), fit(when, frame.w * 0.62, sh * 0.42, theme)),
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          {when}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 18 * u }}>
          {design.footer && (
            <span
              style={{
                fontSize: Math.max(minText(theme), sh * 0.36),
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
              style={{ height: sh * 0.7, maxWidth: 220 * u, objectFit: "contain" }}
            />
          )}
        </span>
      </div>
      {/* The page edge: a thin inner rule round the cover. */}
      <div
        style={{
          ...at(outer),
          border: `${3 * u}px solid ${k.ink}`,
          boxSizing: "border-box",
          pointerEvents: "none",
        }}
      />
    </>
  );
}

/* ---------- Matchday ---------- */

export function ProgrammeFixture(props: LayoutProps) {
  const { team, design, theme } = props;
  const k = inks(theme);
  const { u, wide } = theme;
  const f = facts(team);
  return (
    <Cover {...props} headline={design.headlines.fixture}>
      {(box) => {
        const koW = wide ? box.w * 0.34 : box.w;
        const koH = wide ? box.h : box.h * 0.3;
        const rowsW = wide ? box.w - koW - 30 * u : box.w;
        const rowsH = wide ? box.h : box.h - koH;
        const list = f.versus ? [f.home, f.away] : [team.match.isHome ? f.home : f.away];
        const c = Math.min(rowsH * (f.versus ? 0.32 : 0.5), rowsW * 0.24, 190 * u);
        const names = pairNames(sideNames(team, list), rowsW - c - 26 * u, c * 0.5, theme);
        const big = f.kickoff || f.date;
        const comp = fitBlock(f.competition, koW - (wide ? 30 * u : 0), 34 * u, theme, 2);
        return (
          <div style={{ display: "flex", flexDirection: wide ? "row" : "column", height: "100%" }}>
            <div
              style={{
                width: rowsW,
                height: rowsH,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: c * 0.12,
              }}
            >
              {list.map((s, i) => (
                <div key={s.us ? "us" : "them"}>
                  {i === 1 && (
                    <div
                      style={{
                        fontSize: c * 0.3,
                        color: k.accent,
                        fontWeight: theme.font.heavy,
                        margin: `${c * 0.02}px 0 ${c * 0.1}px ${c * 0.32}px`,
                      }}
                    >
                      v
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 26 * u }}>
                    <KitCrest
                      src={s.crest}
                      kind={s.us ? team.crestKind : undefined}
                      name={s.name}
                      colors={s.colors}
                      size={c}
                      theme={on(theme, k.paper)}
                    />
                    <Lines
                      fitted={{ lines: names.lines[i], size: names.size }}
                      style={{ fontWeight: theme.font.heavy, lineHeight: 0.92 }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {big && (
              <div
                style={{
                  width: koW,
                  height: koH,
                  borderTop: wide ? undefined : `${4 * u}px solid ${k.ink}`,
                  borderLeft: wide ? `${4 * u}px solid ${k.ink}` : undefined,
                  paddingLeft: wide ? 30 * u : 0,
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: 10 * u,
                }}
              >
                <div style={{ fontSize: Math.max(minText(theme), 30 * u), color: k.soft }}>
                  {f.kickoff ? "Kick-off" : ""}
                </div>
                <div
                  style={{
                    fontSize: fit(big, koW - (wide ? 30 * u : 0), koH * 0.52, theme),
                    fontWeight: theme.font.heavy,
                    color: k.accent,
                    lineHeight: 0.9,
                    whiteSpace: "nowrap",
                  }}
                >
                  {big}
                </div>
                {comp && (
                  <Lines fitted={comp} style={{ fontWeight: theme.font.heavy, lineHeight: 1.05 }} />
                )}
              </div>
            )}
          </div>
        );
      }}
    </Cover>
  );
}

/* ---------- Starting XI ---------- */

export function ProgrammeLineup(props: LayoutProps) {
  const { team, design, theme } = props;
  const k = inks(theme);
  const { u, wide, tall } = theme;
  const rows = starterRows(team, design);
  // A squad pasted without shirt numbers gets no number column at all.
  const numbers = design.showNumbers && rows.some((r) => r.number);
  const sub = versusLine(team);
  const bench = benchNames(team, design);
  return (
    <Cover {...props} headline={design.headlines.lineup}>
      {(box) => {
        const subSize = Math.max(minText(theme), fit(sub, box.w, (tall ? 44 : 36) * u, theme));
        const benchText = bench.length ? bench.join(", ") : "";
        const benchSize = Math.max(minText(theme), (tall ? 28 : 24) * u);
        const benchH = benchText
          ? paragraphHeight(`Subs ${benchText}`, box.w, benchSize, theme) + 14 * u
          : 0;
        const top = sub ? subSize * 1.5 : 0;
        const listH = box.h - top - benchH;
        const gap = 30 * u;
        // Try the preferred number of columns, and fewer when long names need the width.
        const preferred = rows.length <= 6 ? 1 : wide ? 3 : tall ? 1 : 2;
        const plan = (cols: number) => {
          const per = Math.max(1, Math.ceil(rows.length / cols));
          const colW = (box.w - (cols - 1) * gap) / cols;
          const rowH = listH / per;
          const base = Math.min(rowH * 0.56, (tall ? 76 : 62) * u);
          const chip = Math.min(rowH * 0.8, base * 1.25);
          const capW = Math.max(minText(theme), base * 0.7) * 1.7 + 16 * u;
          const list = listFit(
            rows.map((r) => ({
              text: r.name,
              alt: surnameOf(r.name),
              width: colW - (numbers ? chip + 16 * u : 0) - (r.captain ? capW : 0),
            })),
            colW,
            base,
            rowH,
            theme,
          );
          return { cols, per, colW, rowH, base, chip, list };
        };
        // The column count that sets the names biggest (the preferred one on a near tie).
        let p = plan(preferred);
        const most = rows.length <= 6 ? 1 : wide ? 3 : 2;
        for (let c = 1; c <= most; c++) {
          if (c === preferred) continue;
          const next = plan(c);
          if ((next.list.ok && !p.list.ok) || next.list.size > p.list.size * 1.08) p = next;
        }
        const { cols, per, colW, rowH, chip, list } = p;
        return (
          <div style={{ position: "relative", height: "100%" }}>
            {sub && (
              <div
                style={{
                  fontSize: subSize,
                  color: k.accent,
                  fontWeight: theme.font.heavy,
                  whiteSpace: "nowrap",
                }}
              >
                {sub}
              </div>
            )}
            <div
              data-check-list="starting-xi"
              style={{
                position: "absolute",
                top,
                left: 0,
                width: box.w,
                height: listH,
                display: "grid",
                gridTemplateColumns: `repeat(${cols}, ${colW}px)`,
                gridTemplateRows: `repeat(${per}, ${rowH}px)`,
                gridAutoFlow: "column",
                columnGap: gap,
              }}
            >
              {rows.map((r, i) => {
                const nf = { lines: list.rows[i], size: list.size };
                return (
                  <div
                    key={r.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16 * u,
                      borderBottom: `${2 * u}px solid ${alpha(k.ink, 0.18)}`,
                    }}
                  >
                    {numbers &&
                      (r.number ? (
                        <Roundel
                          size={chip}
                          bg={k.strong}
                          fg={k.onStrong}
                          style={{
                            fontSize: Math.max(minText(theme), chip * 0.5),
                            fontWeight: theme.font.heavy,
                          }}
                        >
                          <span data-check-slot="number">{r.number}</span>
                        </Roundel>
                      ) : (
                        // No shirt number: keep the column, skip the empty disc.
                        <span style={{ width: chip, flexShrink: 0 }} />
                      ))}
                    <Lines fitted={nf} style={{ fontWeight: theme.font.heavy, lineHeight: 0.95 }} />
                    {r.captain && (
                      <span
                        style={{
                          fontSize: Math.max(minText(theme), nf.size * 0.7),
                          color: k.accent,
                        }}
                      >
                        (C)
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {benchText && (
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  width: box.w,
                  fontSize: benchSize,
                  lineHeight: 1.25,
                  color: k.soft,
                }}
              >
                <span style={{ color: k.accent, fontWeight: theme.font.heavy }}>Subs </span>
                {benchText}
              </div>
            )}
          </div>
        );
      }}
    </Cover>
  );
}

/* ---------- Half time / Full time ---------- */

export function ProgrammeResult(props: LayoutProps & { half?: boolean }) {
  const { team, design, theme, half = false } = props;
  const k = inks(theme);
  const { u } = theme;
  const f = facts(team, half);
  return (
    <Cover {...props} headline={half ? design.headlines.halftime : design.headlines.result}>
      {(box) => {
        const list = f.versus ? [f.home, f.away] : [team.match.isHome ? f.home : f.away];
        const comp = f.competition;
        const compSize = Math.max(minText(theme), fit(comp, box.w, 34 * u, theme));
        const top = comp ? compSize * 1.6 : 0;
        const rowH = (box.h - top) / list.length;
        const c = Math.min(rowH * 0.46, 170 * u);
        const scoreW = c * 1.15;
        const nameW = box.w - c - scoreW - 2 * 24 * u;
        const names = pairNames(sideNames(team, list), nameW, c * 0.46, theme);
        const scorerSize = Math.max(minText(theme), 26 * u);
        return (
          <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            {comp && (
              <div
                style={{
                  fontSize: compSize,
                  color: k.accent,
                  fontWeight: theme.font.heavy,
                  height: top,
                  whiteSpace: "nowrap",
                }}
              >
                {comp}
              </div>
            )}
            {list.map((s, i) => {
              const goals = scorerLines(team, design, s.goals)
                .map((g) => `${g.name}${g.minute ? ` ${g.minute}'` : ""}`)
                .join(", ");
              return (
                <div
                  key={s.us ? "us" : "them"}
                  style={{
                    height: rowH,
                    display: "flex",
                    alignItems: "center",
                    gap: 24 * u,
                    borderTop: i ? `${4 * u}px solid ${k.ink}` : undefined,
                  }}
                >
                  <KitCrest
                    src={s.crest}
                    kind={s.us ? team.crestKind : undefined}
                    name={s.name}
                    colors={s.colors}
                    size={c}
                    theme={on(theme, k.paper)}
                  />
                  <div style={{ width: nameW, display: "flex", flexDirection: "column" }}>
                    <Lines
                      fitted={{ lines: names.lines[i], size: names.size }}
                      style={{ fontWeight: theme.font.heavy, lineHeight: 0.92 }}
                    />
                    {goals && (
                      <div
                        style={{
                          fontSize: scorerSize,
                          color: k.soft,
                          marginTop: 10 * u,
                          lineHeight: 1.2,
                          textTransform: "none",
                        }}
                      >
                        {goals}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      width: scoreW,
                      height: scoreW,
                      flexShrink: 0,
                      background: s.us ? k.strong : k.ink,
                      color: s.us ? k.onStrong : k.paper,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: scoreW * 0.78,
                      fontWeight: theme.font.heavy,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {s.score}
                  </div>
                </div>
              );
            })}
          </div>
        );
      }}
    </Cover>
  );
}

/* ---------- Goal ---------- */

export function ProgrammeGoal(props: LayoutProps) {
  const { team, design, theme } = props;
  const k = inks(theme);
  const { u, tall } = theme;
  const g = goalFacts(team, design);
  return (
    <Cover {...props} headline={design.headlines.goal}>
      {(box) => {
        if (!g) {
          const c = Math.min(box.w, box.h) * 0.5;
          return (
            <div style={{ height: "100%", display: "grid", placeItems: "center" }}>
              <KitCrest
                src={team.crest}
                kind={team.crestKind}
                name={team.name}
                colors={team.colors}
                size={c}
                theme={on(theme, k.paper)}
              />
            </div>
          );
        }
        const line = scoreLine(team, g.us, g.them);
        const short = scoreLine(team, g.us, g.them, true);
        const lineSize = fit(line, box.w, 54 * u, theme);
        const useShort = lineSize < minText(theme) * 1.4;
        const score = useShort ? short : line;
        const scoreSize = Math.max(minText(theme), fit(score, box.w, 54 * u, theme));
        const minute = g.minute ? `${g.minute}'` : "";
        const r = Math.min(box.h * 0.3, (tall ? 230 : 190) * u);
        const scorer = fitWrap(g.scorer, box.w, box.h * (tall ? 0.3 : 0.26), theme);
        return (
          <div
            style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 28 * u }}>
              {minute && (
                <Roundel
                  size={r}
                  bg={k.strong}
                  fg={k.onStrong}
                  style={{ fontSize: r * 0.4, fontWeight: theme.font.heavy }}
                >
                  {minute}
                </Roundel>
              )}
              <KitCrest
                src={team.crest}
                kind={team.crestKind}
                name={team.name}
                colors={team.colors}
                size={r * 0.8}
                theme={on(theme, k.paper)}
              />
            </div>
            <Lines
              fitted={scorer}
              style={{ fontWeight: theme.font.heavy, lineHeight: 0.9, color: k.ink }}
            />
            {score && (
              <div
                style={{
                  fontSize: scoreSize,
                  fontWeight: theme.font.heavy,
                  borderTop: `${4 * u}px solid ${k.ink}`,
                  paddingTop: 16 * u,
                  whiteSpace: "nowrap",
                  color: k.accent,
                }}
              >
                {score}
              </div>
            )}
          </div>
        );
      }}
    </Cover>
  );
}

/* ---------- Substitutions ---------- */

export function ProgrammeSubs(props: LayoutProps) {
  const { team, design, theme } = props;
  const k = inks(theme);
  const { u, tall } = theme;
  const rows = subRows(team, design);
  return (
    <Cover {...props} headline={subsHeadline(design, rows.length)}>
      {(box) => {
        const rowH = Math.min(box.h / Math.max(rows.length, 1), (tall ? 360 : 290) * u);
        const chip = Math.min(rowH * 0.62, 150 * u);
        const nameW = box.w - chip - 30 * u - rowH * 0.2;
        const base = rowH * 0.34;
        return (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              height: "100%",
            }}
          >
            {rows.map((s, i) => {
              const onF = rowFit(s.on, nameW, base, rowH * 0.55, theme);
              const offF = rowFit(s.off, nameW, base * 0.78, rowH * 0.4, theme);
              return (
                <div
                  key={s.id}
                  style={{
                    height: rowH,
                    display: "flex",
                    alignItems: "center",
                    gap: 30 * u,
                    borderTop: i ? `${2 * u}px solid ${alpha(k.ink, 0.25)}` : undefined,
                  }}
                >
                  {s.minute ? (
                    <Roundel
                      size={chip}
                      bg={k.strong}
                      fg={k.onStrong}
                      style={{
                        fontSize: Math.max(minText(theme), chip * 0.36),
                        fontWeight: theme.font.heavy,
                      }}
                    >
                      <span data-check-slot="minute">{s.minute}&prime;</span>
                    </Roundel>
                  ) : (
                    <span style={{ width: chip, flexShrink: 0 }} />
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 * u }}>
                    {s.on && (
                      <div style={{ display: "flex", alignItems: "center", gap: 14 * u }}>
                        <Arrow up size={onF.size * 0.6} color="#1f9d55" />
                        <Lines fitted={onF} style={{ fontWeight: theme.font.heavy }} />
                      </div>
                    )}
                    {s.off && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14 * u,
                          color: k.soft,
                        }}
                      >
                        <Arrow up={false} size={offF.size * 0.6} color="#c4232f" />
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
    </Cover>
  );
}

/* ---------- Player of the match ---------- */

export function ProgrammeMotm(props: LayoutProps) {
  const { team, design, theme } = props;
  const k = inks(theme);
  const { u, tall, wide } = theme;
  const who = motmName(team);
  const s = finalScore(team);
  return (
    <Cover {...props} headline={design.headlines.motm}>
      {(box) => {
        if (!who) {
          const c = Math.min(box.w, box.h) * 0.5;
          return (
            <div style={{ height: "100%", display: "grid", placeItems: "center" }}>
              <KitCrest
                src={team.crest}
                kind={team.crestKind}
                name={team.name}
                colors={team.colors}
                size={c}
                theme={on(theme, k.paper)}
              />
            </div>
          );
        }
        const note = team.match.motmNote.trim();
        const line = scoreLine(team, s.us, s.them);
        const lineShort = scoreLine(team, s.us, s.them, true);
        const lineFull = fit(line, box.w, 48 * u, theme) >= minText(theme) * 1.3;
        const score = lineFull ? line : lineShort;
        const scoreSize = Math.max(minText(theme), fit(score, box.w, 48 * u, theme));
        const noteSize = Math.max(minText(theme), (tall ? 40 : 32) * u);
        const noteH = note ? paragraphHeight(note, box.w - 26 * u, noteSize, theme) + 20 * u : 0;
        if (wide) {
          const rw = box.h * 0.56;
          const nameW = box.w - rw - 40 * u;
          const fs = who.first
            ? Math.max(minText(theme), fit(who.first, nameW, rw * 0.22, theme))
            : 0;
          const lw = fitWrap(who.last, nameW, rw * 0.62, theme);
          return (
            <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 40 * u, flex: 1 }}>
                {who.player.number ? (
                  <Roundel
                    size={rw}
                    bg={k.strong}
                    fg={k.onStrong}
                    style={{ fontSize: rw * 0.5, fontWeight: theme.font.heavy }}
                  >
                    <span data-check-slot="number">{who.player.number}</span>
                  </Roundel>
                ) : (
                  <KitCrest
                    src={team.crest}
                    kind={team.crestKind}
                    name={team.name}
                    colors={team.colors}
                    size={rw}
                    theme={on(theme, k.paper)}
                  />
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 * u }}>
                  {who.first && (
                    <div
                      style={{
                        fontSize: fs,
                        color: k.accent,
                        fontWeight: theme.font.heavy,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {who.first}
                    </div>
                  )}
                  <Lines fitted={lw} style={{ fontWeight: theme.font.heavy, lineHeight: 0.88 }} />
                  {note && (
                    <div
                      style={{
                        fontSize: Math.max(minText(theme), 28 * u),
                        lineHeight: 1.25,
                        textTransform: "none",
                        maxWidth: nameW,
                      }}
                    >
                      {note}
                    </div>
                  )}
                </div>
              </div>
              {score && (
                <div
                  style={{
                    fontSize: scoreSize,
                    fontWeight: theme.font.heavy,
                    borderTop: `${4 * u}px solid ${k.ink}`,
                    paddingTop: 12 * u,
                    whiteSpace: "nowrap",
                  }}
                >
                  {score}
                </div>
              )}
            </div>
          );
        }
        const r = Math.min(box.w * 0.34, box.h * (wide ? 0.42 : 0.3));
        const firstSize = who.first
          ? Math.max(minText(theme), fit(who.first, box.w, r * 0.34, theme))
          : 0;
        const room = box.h - r - firstSize * 1.2 - noteH - (score ? scoreSize * 1.8 : 0) - 60 * u;
        const last = fitWrap(who.last, box.w, Math.max(minText(theme), room * 0.9), theme);
        return (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 18 * u }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              {who.player.number ? (
                <Roundel
                  size={r}
                  bg={k.strong}
                  fg={k.onStrong}
                  style={{ fontSize: r * 0.5, fontWeight: theme.font.heavy }}
                >
                  <span data-check-slot="number">{who.player.number}</span>
                </Roundel>
              ) : (
                <span />
              )}
              <KitCrest
                src={team.crest}
                kind={team.crestKind}
                name={team.name}
                colors={team.colors}
                size={r * 0.78}
                theme={on(theme, k.paper)}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {who.first && (
                <div
                  style={{
                    fontSize: firstSize,
                    color: k.accent,
                    fontWeight: theme.font.heavy,
                    whiteSpace: "nowrap",
                  }}
                >
                  {who.first}
                </div>
              )}
              <Lines fitted={last} style={{ fontWeight: theme.font.heavy, lineHeight: 0.88 }} />
            </div>
            {note && (
              <div
                style={{
                  fontSize: noteSize,
                  lineHeight: 1.25,
                  textTransform: "none",
                  borderLeft: `${6 * u}px solid ${k.strong}`,
                  paddingLeft: 20 * u,
                }}
              >
                {note}
              </div>
            )}
            <div style={{ flex: 1 }} />
            {score && (
              <div
                style={{
                  fontSize: scoreSize,
                  fontWeight: theme.font.heavy,
                  borderTop: `${4 * u}px solid ${k.ink}`,
                  paddingTop: 14 * u,
                  whiteSpace: "nowrap",
                }}
              >
                {score}
              </div>
            )}
          </div>
        );
      }}
    </Cover>
  );
}

/* ---------- Fixtures ---------- */

export function ProgrammeFixtures(props: LayoutProps) {
  const { team, design, theme } = props;
  const k = inks(theme);
  const { u, tall, wide } = theme;
  const rows = fixtureRows(team).slice(0, tall ? 8 : wide ? 5 : 6);
  return (
    <Cover {...props} headline={design.headlines.fixtures}>
      {(box) => {
        const rowH = Math.min(box.h / Math.max(rows.length, 1), (tall ? 200 : 170) * u);
        const daySize = Math.max(minText(theme), rowH * 0.3);
        const dateW = Math.max(rowH * 1.1, daySize * 3.3);
        const tagW = Math.max(rowH * 0.5, minText(theme) / 0.56);
        const rightW = rowH * 1.35;
        const oppW = box.w - dateW - tagW - rightW - 3 * 20 * u;
        const base = rowH * 0.36;
        const list = listFit(
          rows.map((f) => ({ text: f.opponent })),
          oppW,
          base,
          rowH * 0.7,
          theme,
        );
        return (
          <div data-check-list="fixtures" style={{ display: "flex", flexDirection: "column" }}>
            {rows.map((f, i) => {
              const [weekday, day, month] = formatMatchDate(f.date).split(" ");
              const right = f.score.trim() || f.kickoff;
              const nf = { lines: list.rows[i], size: list.size };
              // The opponent is the biggest thing in the row; the time sits under it in size.
              const rightSize = Math.max(
                minText(theme),
                Math.min(fit(right, rightW, rowH * 0.44, theme), nf.size * 0.9),
              );
              const compSize = fit(f.competition, oppW, rowH * 0.15, theme);
              return (
                <div
                  key={f.id}
                  style={{
                    height: rowH,
                    display: "flex",
                    alignItems: "center",
                    gap: 20 * u,
                    borderTop: i ? `${2 * u}px solid ${alpha(k.ink, 0.25)}` : undefined,
                  }}
                >
                  <div
                    style={{
                      width: dateW,
                      display: "flex",
                      flexDirection: "column",
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{ fontSize: Math.max(minText(theme), rowH * 0.17), color: k.soft }}
                    >
                      {weekday}
                    </span>
                    <span
                      style={{
                        // The date stays under the opponent's size: the opponent leads the row.
                        fontSize: Math.max(minText(theme), Math.min(daySize, list.size * 0.9)),
                        fontWeight: theme.font.heavy,
                      }}
                    >
                      {[day, month].filter(Boolean).join(" ")}
                    </span>
                  </div>
                  <div
                    style={{
                      width: tagW,
                      height: tagW,
                      flexShrink: 0,
                      background: f.isHome ? k.strong : k.ink,
                      color: f.isHome ? k.onStrong : k.paper,
                      display: "grid",
                      placeItems: "center",
                      fontSize: tagW * 0.56,
                      fontWeight: theme.font.heavy,
                    }}
                  >
                    {f.isHome ? "H" : "A"}
                  </div>
                  <div
                    style={{ width: oppW, display: "flex", flexDirection: "column", gap: 4 * u }}
                  >
                    <Lines fitted={nf} style={{ fontWeight: theme.font.heavy, lineHeight: 0.95 }} />
                    {f.competition && nf.lines.length === 1 && compSize >= minText(theme) && (
                      <span
                        style={{
                          fontSize: Math.max(minText(theme), Math.min(rowH * 0.15, compSize)),
                          color: k.soft,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {f.competition}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      width: rightW,
                      textAlign: "right",
                      fontSize: rightSize,
                      fontWeight: theme.font.heavy,
                      color: f.score.trim() ? k.accent : k.ink,
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
    </Cover>
  );
}
