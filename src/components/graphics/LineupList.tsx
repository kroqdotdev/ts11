import { readableOn } from "@/lib/color";
import { displayName } from "@/lib/format";
import type { Design, NameStyle, Team } from "@/lib/types";
import { MiniPitch } from "./LineupPitch";
import { balance, Crest, fitText, Footer, Heading, MatchMeta, minPx, px, textUnits } from "./parts";
import { benchPlayers, placedStarters } from "./selection";
import type { Theme } from "./theme";

/** The armband: a disc with a C, never so small the C can't be read. */
export function CaptainMark({ theme, size: wanted }: { theme: Theme; size: number }) {
  const size = Math.max(wanted, minPx(theme) / 0.64);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: size,
        background: theme.accent,
        color: readableOn(theme.accent),
        fontSize: size * 0.64,
        fontWeight: theme.font.heavy,
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      C
    </span>
  );
}

export function SubsLine({
  team,
  design,
  theme,
  size: wanted,
  width,
  maxLines,
}: {
  team: Team;
  design: Design;
  theme: Theme;
  size: number;
  /** With a width and a line budget, long benches switch to shorter names to fit. */
  width?: number;
  maxLines?: number;
}) {
  const bench = benchPlayers(team);
  if (!design.showSubs || bench.length === 0) return null;
  const size = px(theme, wanted);
  const lineOf = (style: NameStyle) =>
    "SUBS  " +
    bench
      .map(
        (p) =>
          `${design.showNumbers && p.number.trim() ? p.number + " " : ""}${displayName(p, style)}, `,
      )
      .join("");
  const linesFor = (style: NameStyle) =>
    width ? Math.ceil((textUnits(lineOf(style)) * theme.font.glyph * size * 1.05) / width) : 1;
  const style =
    !width || !maxLines
      ? design.nameStyle
      : (([design.nameStyle, "initial", "surname"] as NameStyle[]).find(
          (st) => linesFor(st) <= maxLines,
        ) ?? "surname");
  return (
    <div style={{ fontSize: size, lineHeight: 1.35 * theme.font.leading }}>
      <span style={{ color: theme.accent, fontWeight: theme.font.heavy, marginRight: size * 0.6 }}>
        Subs
      </span>
      {bench.map((p, i) => (
        <span key={p.id}>
          <span style={{ whiteSpace: "nowrap" }}>
            {design.showNumbers && p.number.trim() && (
              <span style={{ color: theme.muted }}>{p.number} </span>
            )}
            {displayName(p, style)}
            {i < bench.length - 1 && <span style={{ color: theme.muted }}>,</span>}
          </span>{" "}
        </span>
      ))}
    </div>
  );
}

export function LineupList({ team, design, theme }: { team: Team; design: Design; theme: Theme }) {
  const { w, h, u, pad, wide, tall } = theme;
  const starters = placedStarters(team).filter((s) => s.player);
  // The design's name style, unless full names would make the whole list small:
  // then initial + surname, then surnames, so the XI still reads from across a room.
  const styleFor = (target: number, room: number) => {
    const order = [design.nameStyle, "initial", "surname"] as const;
    let best: { style: (typeof order)[number]; size: number } | null = null;
    for (const style of order) {
      const units = starters
        .map((s) => textUnits(displayName(s.player!, style)))
        .sort((a, b) => a - b);
      const typical = Math.max(
        10,
        units.length ? units[Math.floor((units.length - 1) * 0.75)] : 10,
      );
      const size = Math.min(target, room / ((typical + 3) * theme.font.glyph));
      if (!best || size > best.size * 1.05) best = { style, size };
      if (size >= target * 0.8) return style;
    }
    return best!.style;
  };
  const headline = design.headlines.lineup;

  const crestSize = (tall ? 170 : wide ? 150 : 140) * u;
  const headerW = wide ? w * 0.4 : theme.right - pad - crestSize - 32 * u;
  const headMax = (tall ? 170 : 140) * u;
  const metaSize = px(theme, (tall ? 32 : 28) * u);
  const headSize = fitText(headline, headerW, headMax, theme);
  // The match lines under the headline wrap when the opponent or venue is long.
  const m = team.match;
  const linesOf = (text: string, size: number) =>
    text ? Math.ceil((textUnits(text) * theme.font.glyph * size) / headerW) : 0;
  const metaLines =
    linesOf(m.opponent.trim() ? `vs ${m.opponent}` : "", metaSize * 1.25) * 1.25 +
    linesOf(`SAT 14 NOV 15:00 ${m.venue}`, metaSize);
  const headerH = Math.max(
    crestSize,
    headSize * 0.86 * theme.font.leading + 18 * u + metaSize * (metaLines + 0.5) * 1.05,
  );

  const listLeft = wide ? w * 0.47 : pad;
  const listRight = design.featureImage ? (wide ? w * 0.72 : w * 0.58) : theme.right;
  const listW = listRight - listLeft;
  const listTop = wide ? pad : pad + headerH + (tall ? 90 : 44) * u;
  const reserveBottom = wide ? pad : (design.showSubs ? 230 : 150) * u * (tall ? 1.25 : 1);
  const listH = h - listTop - reserveBottom;
  const rows = Math.max(starters.length, 1);
  const rowH = listH / rows;
  const numColFor = design.showNumbers ? 1.55 : 0;
  const nameStyle = styleFor(
    Math.min(rowH * 0.66, (tall ? 84 : 66) * u),
    listW / (1 + numColFor * 0.5),
  );
  const names = starters.map((s) => displayName(s.player!, nameStyle));

  const numCol = design.showNumbers ? 1.55 : 0;
  const glyph = theme.font.glyph;
  const floor = minPx(theme);
  // Size the list for a typical name, not the longest: one double-barrelled
  // surname must not shrink the other ten. Long rows are dealt with one by one below.
  const units = names.map((n) => textUnits(n)).sort((a, b) => a - b);
  const typical = Math.max(10, units.length ? units[Math.floor((units.length - 1) * 0.75)] : 10);
  const nameSize = px(
    theme,
    Math.max(
      Math.min(
        rowH * 0.66,
        (tall ? 84 : 66) * u,
        listW / (1 + numCol * 0.5) / ((typical + 3) * glyph),
      ),
      Math.min(rowH * 0.5, 30 * u),
    ),
  );

  // Beside the list, a small formation diagram fills what would be empty space.
  const nameBlock = nameSize * (numCol + 0.45 + typical * glyph) + nameSize;
  const pitchW = Math.min((listRight - listLeft) * 0.4, listH / 1.45);
  const pitchH = Math.min(listH - 70 * u, pitchW * 1.45);
  const roomForMini =
    !wide &&
    !design.featureImage &&
    starters.length > 0 &&
    listRight - pitchW - 40 * u > listLeft + nameBlock &&
    pitchW > 160 * u;
  const mini = {
    x: listRight - pitchW,
    y: listTop + (listH - pitchH - 50 * u) / 2,
    w: pitchW,
    h: pitchH,
  };

  // Room for a name on its row: the list (or up to the mini pitch) minus the
  // number column, the gap and a captain's armband.
  const captainSize = Math.max(nameSize * 0.62, floor / 0.64);
  const planRows = (withMini: boolean) => {
    const rowRight = withMini ? mini.x - 40 * u : listRight;
    const nameRoom = (captain: boolean) =>
      rowRight -
      listLeft -
      (design.showNumbers ? nameSize * (numCol + 0.45) : 0) -
      (captain ? captainSize + nameSize * 0.45 : 0);
    return starters.map((s, i) => {
      const captain = design.showCaptain && team.lineup.captainId === s.player!.id;
      const room = nameRoom(captain);
      const widthAt = (text: string, size: number) => textUnits(text) * glyph * size;
      let text = names[i];
      // Too long: try the surname alone, then condense, then (only this row) shrink,
      // and at the readable minimum, break over two lines rather than shrink further.
      if (widthAt(text, nameSize) > room && nameStyle !== "surname") {
        const surname = displayName(s.player!, "surname");
        if (widthAt(surname, nameSize) < widthAt(text, nameSize)) text = surname;
      }
      const need = widthAt(text, nameSize);
      const squeeze = need > room ? Math.max(0.8, room / need) : 1;
      let size = need * squeeze > room ? room / (textUnits(text) * glyph * squeeze) : nameSize;
      let lines = [text];
      if (size < floor) {
        const split = splitName(text);
        const longest = split.reduce((a, b) => (textUnits(b) > textUnits(a) ? b : a));
        lines = split;
        size = Math.max(
          floor,
          Math.min(nameSize, fitText(longest, room * squeeze, nameSize, theme) / squeeze),
        );
      }
      return { captain, text, lines, squeeze, size };
    });
  };
  // The mini pitch is a nice-to-have: drop it rather than shrink a name to fit beside it.
  let showMini = roomForMini;
  let rowsOut = planRows(showMini);
  if (showMini && rowsOut.some((r) => r.size < nameSize * 0.8 || r.lines.length > 1)) {
    showMini = false;
    rowsOut = planRows(false);
  }

  const header = (
    <div style={{ display: "flex", gap: 32 * u, alignItems: wide ? "flex-start" : "center" }}>
      {!wide && (
        <Crest
          src={team.crest}
          kind={team.crestKind}
          name={team.name}
          colors={team.colors}
          size={crestSize}
          theme={theme}
        />
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 18 * u }}>
        <Heading text={headline} width={headerW} max={headMax} theme={theme} />
        <MatchMeta team={team} theme={theme} size={metaSize} />
      </div>
    </div>
  );

  return (
    <>
      {wide ? (
        <div
          style={{
            position: "absolute",
            left: pad,
            top: pad,
            bottom: pad,
            width: w * 0.4,
            display: "flex",
            flexDirection: "column",
            gap: 40 * u,
          }}
        >
          <Crest
            src={team.crest}
            kind={team.crestKind}
            name={team.name}
            colors={team.colors}
            size={crestSize}
            theme={theme}
          />
          {header}
          <div style={{ flex: 1 }} />
          <SubsLine
            team={team}
            design={design}
            theme={theme}
            size={26 * u}
            width={w * 0.4}
            maxLines={4}
          />
          <Footer theme={theme} design={design} />
        </div>
      ) : (
        <div style={{ position: "absolute", left: pad, width: theme.right - pad, top: pad }}>
          {header}
        </div>
      )}

      <div
        style={{
          position: "absolute",
          left: listLeft,
          top: listTop,
          width: listW,
          height: listH,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {starters.map((s, i) => (
          <div
            key={s.slot.index}
            data-row
            style={{
              height: rowH,
              display: "flex",
              alignItems: "center",
              gap: nameSize * 0.45,
              fontSize: nameSize,
              fontWeight: theme.font.heavy,
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            {design.showNumbers && (
              <span
                data-check-slot={s.player!.number.trim() ? "number" : undefined}
                style={{
                  width: nameSize * numCol,
                  textAlign: "right",
                  color: theme.accent,
                  fontVariantNumeric: "tabular-nums",
                  flexShrink: 0,
                }}
              >
                {s.player!.number}
              </span>
            )}
            <span
              style={{
                fontSize: rowsOut[i].size,
                display: "inline-block",
                transform: rowsOut[i].squeeze < 1 ? `scaleX(${rowsOut[i].squeeze})` : undefined,
                transformOrigin: "left center",
                // A squeezed name still takes its unsqueezed width in the row; pull
                // the armband back so it sits right after the visible text.
                marginRight:
                  rowsOut[i].squeeze < 1
                    ? -(1 - rowsOut[i].squeeze) *
                      textUnits(
                        rowsOut[i].lines.reduce((a, b) => (textUnits(b) > textUnits(a) ? b : a)),
                      ) *
                      glyph *
                      rowsOut[i].size
                    : 0,
              }}
            >
              {rowsOut[i].lines.length > 1
                ? rowsOut[i].lines.map((l, k) => (
                    <span key={k} style={{ display: "block", lineHeight: 0.95 }}>
                      {l}
                    </span>
                  ))
                : rowsOut[i].text}
            </span>
            {rowsOut[i].captain && <CaptainMark theme={theme} size={captainSize} />}
          </div>
        ))}
      </div>
      {showMini && <MiniPitch team={team} theme={theme} rect={mini} />}

      {!wide && (
        <div
          style={{
            position: "absolute",
            left: pad,
            right: design.featureImage ? w * 0.4 : w - theme.right,
            bottom: pad,
            display: "flex",
            flexDirection: "column",
            gap: 30 * u,
          }}
        >
          <SubsLine
            team={team}
            design={design}
            theme={theme}
            size={(tall ? 34 : 27) * u}
            width={(design.featureImage ? w * 0.6 : theme.right) - pad}
            maxLines={3}
          />
          <Footer theme={theme} design={design} />
        </div>
      )}
    </>
  );
}

/** Two lines for a long name: at a hyphen if there is one, else between words. */
function splitName(text: string): string[] {
  const hyphen = text.indexOf("-");
  if (hyphen > 2 && hyphen < text.length - 3)
    return [text.slice(0, hyphen + 1), text.slice(hyphen + 1)];
  const two = balance(text);
  // Never leave an initial on its own line ("S." / "Ellery").
  return two.length > 1 && two[0].replace(/\./g, "").length > 2 ? two : [text];
}
