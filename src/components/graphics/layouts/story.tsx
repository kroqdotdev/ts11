/**
 * The bottom of a 9:16 story sits under the app's reply bar, so nothing that
 * matters goes there. Left bare it reads as a portrait post with blank space,
 * so each look dresses it in something of its own that can safely be covered:
 * kit lettering, a newspaper fold, a pitch-side LED ticker or a desktop taskbar.
 */
import type { CSSProperties, ReactNode } from "react";
import { alpha } from "@/lib/color";
import { formatMatchDate } from "@/lib/format";
import type { Design, Team } from "@/lib/types";
import { balance } from "../parts";
import { fit, safeArea, type Theme, legible } from "../theme";
import { LedRow, ledWidth } from "./Led";
import { fileName, PixelBall, skin } from "./Windows";
import { amber, BOARD, DIM, Housing, WHITE } from "./Scoreboard";

interface Props {
  team: Team;
  design: Design;
  /** The full frame's theme (not the safe-area content theme). */
  theme: Theme;
}

/** The club name to letter across the band: the full name if it stays big, else the short one. */
function bandName(team: Team, width: number, theme: Theme, min: number): string {
  const full = team.name.trim();
  const short = (team.shortName || "").trim();
  if (full && fit(full, width, 9999, theme) >= min) return full;
  return short || full;
}

function Band({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  const zone = safeArea("story").bottom;
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: zone,
        overflow: "hidden",
        pointerEvents: "none",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Kit looks without lettering: the hem of the shirt. A solid band in the club
 * colour with pinstripes in the second colour, rising on a shallow diagonal.
 * No text, since the reply bar covers this zone.
 */
function KitStrip({ theme }: Props) {
  const { primary, secondary } = theme;
  return (
    <Band>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(176deg, transparent 0 34%, ${secondary} 34% 37.5%, transparent 37.5% 41%, ${alpha(secondary, 0.6)} 41% 42.5%, ${primary} 42.5% 100%)`,
        }}
      />
    </Band>
  );
}

/** Kit looks: the club name lettered huge and faint, like the print on a training top. */
function KitBand(props: Props) {
  // Lettering is opt-in (the "Background lettering" switch); without it the band
  // is a strip of kit instead.
  if (!props.design.showLettering) return <KitStrip {...props} />;
  const { team, theme } = props;
  const { pad, u } = theme;
  const width = theme.right - pad;
  const name = bandName(team, width, theme, 120 * u).toUpperCase();
  // One line, or two stacked when that letters it bigger; the second line is
  // allowed to run off the bottom edge, like oversized kit print.
  const one = Math.min(300 * u, fit(name, width, 9999, theme));
  const split = balance(name);
  const two =
    split.length > 1 ? Math.min(240 * u, ...split.map((l) => fit(l, width, 9999, theme))) : 0;
  const lines = two > one * 1.25 ? split : [name];
  const size = lines.length > 1 ? two : one;
  return (
    <Band>
      <div
        style={{
          position: "absolute",
          left: pad,
          width,
          top: 18 * u,
          fontSize: legible(theme, size),
          lineHeight: 0.86 * theme.font.leading,
          fontWeight: theme.font.heavy,
          whiteSpace: "nowrap",
          color: alpha(theme.fg, 0.13),
        }}
      >
        {lines.map((l) => (
          <div key={l}>{l}</div>
        ))}
      </div>
    </Band>
  );
}

/** Clean: the fold of the back page, a double rule and the club in outline type. */
function PaperBand({ team, design, theme }: Props) {
  const { pad, u, fg } = theme;
  const width = theme.w - pad * 2;
  const name = bandName(team, width, theme, 120 * u).toUpperCase();
  const size = Math.min(250 * u, fit(name, width, 9999, theme));
  const date = team.match.date ? formatMatchDate(team.match.date).toUpperCase() : "";
  return (
    <Band>
      <div style={{ position: "absolute", left: pad, right: pad, top: 26 * u }}>
        <div style={{ height: 10 * u, background: fg }} />
        <div style={{ height: 3 * u, background: fg, marginTop: 6 * u }} />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 12 * u,
            fontSize: legible(theme, 24 * u),
            fontWeight: theme.font.heavy,
            color: alpha(fg, 0.7),
            letterSpacing: "0.08em",
          }}
        >
          <span>SPORT</span>
          <span>{[design.footer, date].filter(Boolean).join("  ·  ")}</span>
        </div>
      </div>
      {design.showLettering && (
        <div
          style={{
            position: "absolute",
            left: pad,
            width,
            bottom: -size * 0.2,
            fontSize: legible(theme, size),
            lineHeight: 1,
            fontWeight: theme.font.heavy,
            whiteSpace: "nowrap",
            color: "transparent",
            WebkitTextStroke: `${Math.max(2, 3 * u)}px ${alpha(fg, 0.32)}`,
          }}
        >
          {name}
        </div>
      )}
    </Band>
  );
}

/** Floodlit: a pitch-side LED board running the club, the moment and the hashtag. */
function TickerBand({ team, design, theme }: Props) {
  const { w, u, pad } = theme;
  const pitch = Math.max(6, Math.round(9 * u));
  const width = w - pad * 2;
  const cols = Math.floor((width - pitch * 2 - 26 * u) / pitch);
  const club = (team.shortName || team.name).trim();
  const words = [club, design.headlines[design.kind], design.footer]
    .map((t) => t.trim())
    .filter(Boolean);
  // As many whole messages as fit; scale 2 only while it still carries two of them.
  const sep = "  *  ";
  const pick = (scale: number) => {
    const out: string[] = [];
    for (const word of words) {
      if (ledWidth([...out, word].join(sep), scale) + 4 <= cols) out.push(word);
    }
    return out;
  };
  const big = pick(2);
  const scale = big.length >= Math.min(2, words.length) ? 2 : 1;
  const text = (scale === 2 ? big : pick(1)).join(sep) || club;
  const m = team.match;
  const info = [m.date ? formatMatchDate(m.date) : "", m.kickoff, m.venue]
    .filter(Boolean)
    .join("  ");
  const infoText =
    ledWidth(info) + 4 <= cols
      ? info
      : [m.date ? formatMatchDate(m.date) : "", m.kickoff].filter(Boolean).join("  ");
  return (
    <Band>
      <div style={{ position: "absolute", left: pad, width, top: 40 * u }}>
        <Housing theme={theme} pitch={pitch}>
          <LedRow
            parts={[{ text, color: amber(theme) }]}
            cols={cols}
            pitch={pitch}
            scale={scale}
            align="center"
            padY={2}
            dim={DIM}
          />
          <LedRow
            parts={[{ text: infoText || "*  *  *", color: WHITE }]}
            cols={cols}
            pitch={pitch}
            align="center"
            padY={1}
            dim={DIM}
          />
        </Housing>
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 4 * u,
          background: BOARD,
        }}
      />
    </Band>
  );
}

/** Pixel: desktop icons and a taskbar with the open window and the kick-off on the clock. */
function TaskbarBand({ team, design, theme }: Props) {
  const { u, pad } = theme;
  const s = skin(theme);
  const b = Math.max(3, Math.round(4 * u));
  const barH = 74 * u;
  const icon = 64 * u;
  const files = [
    { label: `${(team.shortName || "club").toLowerCase()}.exe`, ball: true },
    { label: "fixtures.ics", ball: false },
    { label: (design.footer || "#matchday").replace(/^#/, "").toLowerCase() + ".txt", ball: false },
  ];
  return (
    <Band>
      <div
        style={{
          position: "absolute",
          left: pad,
          top: 26 * u,
          display: "flex",
          gap: 46 * u,
        }}
      >
        {files.map((f) => (
          <div
            key={f.label}
            style={{
              width: 150 * u,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8 * u,
            }}
          >
            <div
              style={{
                width: icon,
                height: icon,
                background: s.paper,
                border: `${b}px solid ${s.ink}`,
                boxShadow: `${6 * u}px ${6 * u}px 0 ${s.ink}`,
                display: "grid",
                placeItems: "center",
              }}
            >
              {f.ball ? (
                <PixelBall size={icon * 0.62} ink={s.ink} />
              ) : (
                <div style={{ width: icon * 0.5, display: "grid", gap: 5 * u }}>
                  {[1, 0.7, 0.85].map((k, i) => (
                    <div
                      key={i}
                      style={{ height: 5 * u, width: `${k * 100}%`, background: s.accent }}
                    />
                  ))}
                </div>
              )}
            </div>
            <div
              style={{
                fontSize: legible(theme, 22 * u),
                fontWeight: theme.font.heavy,
                color: theme.fg,
                textTransform: "none",
                whiteSpace: "nowrap",
                textShadow: `${2 * u}px ${2 * u}px 0 ${alpha("#000000", 0.35)}`,
              }}
            >
              {f.label}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          left: pad * 0.6,
          right: pad * 0.6,
          bottom: 66 * u,
          height: barH,
          background: s.paper,
          border: `${b}px solid ${s.ink}`,
          boxShadow: `${8 * u}px ${8 * u}px 0 ${s.ink}`,
          display: "flex",
          alignItems: "center",
          gap: 14 * u,
          padding: `0 ${12 * u}px`,
          color: s.ink,
          fontSize: legible(theme, 26 * u),
          fontWeight: theme.font.heavy,
          textTransform: "none",
          whiteSpace: "nowrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10 * u,
            height: barH - 22 * u,
            padding: `0 ${14 * u}px`,
            background: s.bar,
            color: s.barInk,
            border: `${b}px solid ${s.ink}`,
          }}
        >
          <PixelBall size={30 * u} ink={s.ink} />
          start
        </div>
        <div
          style={{
            height: barH - 22 * u,
            display: "flex",
            alignItems: "center",
            padding: `0 ${16 * u}px`,
            border: `${b}px solid ${s.ink}`,
            background: alpha(s.ink, 0.08),
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          {fileName(design.headlines[design.kind], design.kind === "goal" ? "exe" : "txt")}
        </div>
        <div style={{ flex: 1 }} />
        {team.match.kickoff && (
          <div
            style={{
              height: barH - 22 * u,
              display: "flex",
              alignItems: "center",
              padding: `0 ${16 * u}px`,
              border: `${b}px solid ${alpha(s.ink, 0.4)}`,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {team.match.kickoff}
          </div>
        )}
      </div>
    </Band>
  );
}

/** Dresses the bottom of a story in the look's own language. Nothing for other sizes. */
export function StoryBand(props: Props) {
  if (props.design.format !== "story") return null;
  switch (props.design.look) {
    case "stadium":
      // The pixel ground already runs to the bottom edge.
      return null;
    case "hoops":
    case "sash":
    case "halves":
      // Programme, poster and split fill their own story edges; Team news still
      // uses the shared layout, so it keeps the band.
      return props.design.kind === "pitch" ? <KitBand {...props} /> : null;
    case "clean":
      return <PaperBand {...props} />;
    case "night":
      return <TickerBand {...props} />;
    case "pixel":
      return <TaskbarBand {...props} />;
    default:
      return <KitBand {...props} />;
  }
}
